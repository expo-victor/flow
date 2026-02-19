"use server"

import { redirect } from "next/navigation"

import {
  clearSupportSession,
  getSupportUserFromSession,
  setSupportSession,
} from "@/lib/flow/auth"
import {
  addSupportMessage,
  authenticateSupportUser,
  updateTicketWorkflow,
} from "@/lib/flow/service"
import {
  ticketPriorities,
  ticketStatuses,
  TicketPriority,
  TicketStatus,
} from "@/lib/flow/types"

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function asStatus(value: string): TicketStatus {
  if (ticketStatuses.includes(value as TicketStatus)) {
    return value as TicketStatus
  }

  return "open"
}

function asPriority(value: string): TicketPriority {
  if (ticketPriorities.includes(value as TicketPriority)) {
    return value as TicketPriority
  }

  return "normal"
}

function redirectLoginError(message: string): never {
  redirect(`/panel/login?error=${encodeURIComponent(message)}`)
}

function redirectSupportError(message: string): never {
  redirect(`/panel?error=${encodeURIComponent(message)}`)
}

export async function loginSupportAction(formData: FormData): Promise<never> {
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")

  const supportUser = await authenticateSupportUser({ email, password })

  if (!supportUser) {
    redirectLoginError("Credenciales inválidas")
  }

  await setSupportSession(supportUser.id)

  redirect("/panel")
}

export async function logoutSupportAction(): Promise<never> {
  await clearSupportSession()
  redirect("/panel/login")
}

export async function updateTicketWorkflowAction(formData: FormData): Promise<never> {
  const supportUser = await getSupportUserFromSession()

  if (!supportUser) {
    redirectLoginError("Tu sesión ha expirado")
  }

  const ticketId = getFormValue(formData, "ticketId")
  const status = asStatus(getFormValue(formData, "status"))
  const priority = asPriority(getFormValue(formData, "priority"))
  const assigneeIdRaw = getFormValue(formData, "assigneeId")

  let ticketCode: string

  try {
    const result = await updateTicketWorkflow({
      supportUserId: supportUser.id,
      ticketId,
      status,
      priority,
      assigneeId: assigneeIdRaw || null,
    })
    ticketCode = result.code
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el ticket"
    redirectSupportError(message)
  }

  redirect(`/panel?ticket=${encodeURIComponent(ticketCode)}`)
}

export async function addSupportMessageAction(formData: FormData): Promise<never> {
  const supportUser = await getSupportUserFromSession()

  if (!supportUser) {
    redirectLoginError("Tu sesión ha expirado")
  }

  const ticketId = getFormValue(formData, "ticketId")
  const body = getFormValue(formData, "body")
  const visibilityRaw = getFormValue(formData, "visibility")

  let ticketCode: string

  try {
    const result = await addSupportMessage({
      supportUserId: supportUser.id,
      ticketId,
      body,
      visibility: visibilityRaw === "internal" ? "internal" : "public",
    })
    ticketCode = result.code
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje"
    redirectSupportError(message)
  }

  redirect(`/panel?ticket=${encodeURIComponent(ticketCode)}`)
}
