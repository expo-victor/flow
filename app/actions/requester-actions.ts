"use server"

import { redirect } from "next/navigation"

import { getRequesterFromSession } from "@/lib/flow/auth"
import { ticketPriorities, ticketSites, TicketPriority, TicketSite } from "@/lib/flow/types"
import { addRequesterReply, createTicketFromRequester } from "@/lib/flow/service"

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function asPriority(value: string): TicketPriority {
  if (ticketPriorities.includes(value as TicketPriority)) {
    return value as TicketPriority
  }

  return "normal"
}

function asSite(value: string): TicketSite {
  if (ticketSites.includes(value as TicketSite)) {
    return value as TicketSite
  }

  return "espacio"
}

function redirectWithError(message: string): never {
  redirect(`/app?error=${encodeURIComponent(message)}`)
}

export async function createTicketAction(formData: FormData): Promise<never> {
  const name = getFormValue(formData, "name")
  const email = getFormValue(formData, "email")
  const subject = getFormValue(formData, "subject")
  const site = asSite(getFormValue(formData, "site"))
  const description = getFormValue(formData, "description")
  const priority = asPriority(getFormValue(formData, "priority"))

  let ticketCode: string

  try {
    const result = await createTicketFromRequester({
      name,
      email,
      subject,
      site,
      description,
      priority,
    })
    ticketCode = result.code
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el ticket"
    redirectWithError(message)
  }

  redirect(`/app?ticket=${encodeURIComponent(ticketCode)}`)
}

export async function addRequesterReplyAction(formData: FormData): Promise<never> {
  const requester = await getRequesterFromSession()

  if (!requester) {
    redirectWithError("Tu sesión no está activa. Envía una nueva incidencia para continuar.")
  }

  const ticketId = getFormValue(formData, "ticketId")
  const body = getFormValue(formData, "body")

  let ticketCode: string

  try {
    const result = await addRequesterReply({
      requesterId: requester.id,
      ticketId,
      body,
    })
    ticketCode = result.code
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la respuesta"
    redirectWithError(message)
  }

  redirect(`/app?ticket=${encodeURIComponent(ticketCode)}`)
}
