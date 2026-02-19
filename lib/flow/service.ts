import "server-only"

import {
  ticketPriorityLabels,
  ticketSiteLabels,
  ticketStatusLabels,
} from "@/lib/flow/constants"
import {
  getRequesterFromSession,
  setRequesterSession,
} from "@/lib/flow/auth"
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/flow/crypto"
import { getSupportNotificationRecipients, sendEmail } from "@/lib/flow/mailer"
import { allocateId, now, readDb, withDbMutation } from "@/lib/flow/store"
import { readSupportUsersConfig } from "@/lib/flow/support-users"
import {
  FlowDatabase,
  ticketPriorities,
  ticketSites,
  ticketStatuses,
  Ticket,
  TicketEvent,
  TicketPriority,
  TicketSite,
  TicketStatus,
} from "@/lib/flow/types"

interface CreateTicketInput {
  name: string
  email: string
  subject: string
  site: TicketSite
  description: string
  priority: TicketPriority
}

interface UpdateTicketWorkflowInput {
  supportUserId: string
  ticketId: string
  status: TicketStatus
  priority: TicketPriority
  assigneeId: string | null
}

interface SupportMessageInput {
  supportUserId: string
  ticketId: string
  body: string
  visibility: "public" | "internal"
}

interface RequesterReplyInput {
  requesterId: string
  ticketId: string
  body: string
}

function asValidPriority(value: string): TicketPriority {
  if (value === "high") {
    return "urgent"
  }

  if (ticketPriorities.includes(value as TicketPriority)) {
    return value as TicketPriority
  }

  return "normal"
}

function asValidSite(value: string): TicketSite {
  if (ticketSites.includes(value as TicketSite)) {
    return value as TicketSite
  }

  return "espacio"
}

function asValidStatus(value: string): TicketStatus {
  if (ticketStatuses.includes(value as TicketStatus)) {
    return value as TicketStatus
  }

  return "open"
}

function isBlank(value: string): boolean {
  return value.trim().length === 0
}

function format2(value: number): string {
  return String(value).padStart(2, "0")
}

function toTicketCode(date: Date): string {
  const day = format2(date.getDate())
  const month = format2(date.getMonth() + 1)
  const hour = format2(date.getHours())
  const minute = format2(date.getMinutes())

  return `${day}${month}${hour}${minute}`
}

function createTicketCode(createdAt: string, existingCodes: Set<string>): string {
  const baseDate = new Date(createdAt)

  for (let offsetMinutes = 0; offsetMinutes < 24 * 60; offsetMinutes += 1) {
    const codeDate = new Date(baseDate.getTime() + offsetMinutes * 60_000)
    const code = toTicketCode(codeDate)

    if (!existingCodes.has(code)) {
      return code
    }
  }

  throw new Error("No se pudo generar un código de ticket único")
}

function addEvent(
  db: FlowDatabase,
  ticketId: string,
  actorType: TicketEvent["actorType"],
  actorId: string,
  type: TicketEvent["type"],
  meta: Record<string, string | null>
): void {
  db.ticketEvents.push({
    id: allocateId(db, "ticketEvent"),
    ticketId,
    actorType,
    actorId,
    type,
    meta,
    createdAt: now(),
  })
}

function updateTicketTimestamp(ticket: Ticket): void {
  ticket.updatedAt = now()
}

async function trySendEmail(input: {
  to: string | string[]
  subject: string
  text: string
}): Promise<void> {
  try {
    await sendEmail(input)
  } catch (error) {
    console.error("[flow-email:error]", error)
  }
}

export async function ensureSupportUsersFromConfig(): Promise<void> {
  const configuredUsers = await readSupportUsersConfig()

  await withDbMutation(async (db) => {
    const usersByEmail = new Map(db.supportUsers.map((entry) => [entry.email, entry]))
    const configuredEmails = new Set(configuredUsers.map((entry) => entry.email))

    for (const configuredUser of configuredUsers) {
      const existing = usersByEmail.get(configuredUser.email)

      if (!existing) {
        db.supportUsers.push({
          id: allocateId(db, "supportUser"),
          name: configuredUser.name,
          email: configuredUser.email,
          passwordHash: await hashPassword(configuredUser.password),
          createdAt: now(),
          isActive: true,
        })
        continue
      }

      existing.name = configuredUser.name
      existing.email = configuredUser.email
      existing.isActive = true

      const hasSamePassword = await verifyPassword(configuredUser.password, existing.passwordHash)
      if (!hasSamePassword) {
        existing.passwordHash = await hashPassword(configuredUser.password)
      }
    }

    db.supportUsers.forEach((user) => {
      if (!configuredEmails.has(user.email)) {
        user.isActive = false
      }
    })
  })
}

export async function createTicketFromRequester(input: CreateTicketInput): Promise<{ code: string }> {
  if (isBlank(input.name) || isBlank(input.email) || isBlank(input.subject) || isBlank(input.description)) {
    throw new Error("Todos los campos son obligatorios")
  }

  await ensureSupportUsersFromConfig()

  const activeRequester = await getRequesterFromSession()
  const normalizedEmail = normalizeEmail(input.email)

  const result = await withDbMutation((db) => {
    let requester =
      (activeRequester
        ? db.requesters.find((entry) => entry.id === activeRequester.id)
        : null) ??
      db.requesters.find((entry) => entry.email === normalizedEmail)

    if (!requester) {
      const requesterId = allocateId(db, "requester")
      requester = {
        id: requesterId,
        name: input.name.trim(),
        email: normalizedEmail,
        createdAt: now(),
        updatedAt: now(),
      }
      db.requesters.push(requester)
    } else {
      requester.name = input.name.trim()
      requester.email = normalizedEmail
      requester.updatedAt = now()
    }

    const ticketId = allocateId(db, "ticket")
    const createdAt = now()
    const existingCodes = new Set(db.tickets.map((entry) => entry.code))
    const ticket: Ticket = {
      id: ticketId,
      code: createTicketCode(createdAt, existingCodes),
      requesterId: requester.id,
      subject: input.subject.trim(),
      site: asValidSite(input.site),
      description: input.description.trim(),
      status: "open",
      priority: asValidPriority(input.priority),
      assigneeId: null,
      createdAt,
      updatedAt: createdAt,
    }

    db.tickets.push(ticket)

    db.ticketMessages.push({
      id: allocateId(db, "ticketMessage"),
      ticketId: ticket.id,
      authorType: "requester",
      authorId: requester.id,
      visibility: "public",
      body: input.description.trim(),
      createdAt: now(),
    })

    addEvent(db, ticket.id, "requester", requester.id, "ticket_created", {
      status: ticket.status,
      priority: ticket.priority,
      site: ticket.site,
    })

    return {
      requester,
      ticket,
    }
  })

  await setRequesterSession(result.requester.id)

  const dbSnapshot = await readDb()
  const supportRecipientsFromConfig = getSupportNotificationRecipients()
  const supportRecipients =
    supportRecipientsFromConfig.length > 0
      ? supportRecipientsFromConfig
      : dbSnapshot.supportUsers
          .filter((user) => user.isActive)
          .map((user) => user.email)

  await trySendEmail({
    to: result.requester.email,
    subject: `[${result.ticket.code}] Ticket recibido`,
    text: [
      `Hola ${result.requester.name},`,
      "",
      "Tu incidencia ha sido registrada con éxito en Expoflamenco Flow.",
      `Código: ${result.ticket.code}`,
      `Asunto: ${result.ticket.subject}`,
      `Subsitio: ${ticketSiteLabels[asValidSite(result.ticket.site as string)]}`,
      `Prioridad: ${ticketPriorityLabels[asValidPriority(result.ticket.priority as string)]}`,
      "",
      "Te notificaremos por correo cuando haya cambios.",
    ].join("\n"),
  })

  if (supportRecipients.length > 0) {
    await trySendEmail({
      to: supportRecipients,
      subject: `[${result.ticket.code}] Nuevo ticket interno`,
      text: [
        "Se ha creado un nuevo ticket en Expoflamenco Flow.",
        "",
        `Código: ${result.ticket.code}`,
        `Solicitante: ${result.requester.name} <${result.requester.email}>`,
        `Asunto: ${result.ticket.subject}`,
        `Subsitio: ${ticketSiteLabels[asValidSite(result.ticket.site as string)]}`,
        `Prioridad: ${ticketPriorityLabels[asValidPriority(result.ticket.priority as string)]}`,
      ].join("\n"),
    })
  }

  return { code: result.ticket.code }
}

export async function getRequesterDashboardData(requesterId: string): Promise<{
  requester: { id: string; name: string; email: string }
  tickets: Array<{
    id: string
    code: string
    subject: string
    site: TicketSite
    description: string
    status: TicketStatus
    priority: TicketPriority
    createdAt: string
    updatedAt: string
    assigneeName: string | null
    messages: Array<{
      id: string
      createdAt: string
      authorType: "requester" | "support"
      authorLabel: string
      body: string
    }>
  }>
}> {
  const db = await readDb()

  const requester = db.requesters.find((entry) => entry.id === requesterId)

  if (!requester) {
    throw new Error("Solicitante no encontrado")
  }

  const supportById = new Map(db.supportUsers.map((user) => [user.id, user]))

  const tickets = db.tickets
    .filter((ticket) => ticket.requesterId === requesterId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((ticket) => {
      const messages = db.ticketMessages
        .filter((message) => message.ticketId === ticket.id && message.visibility === "public")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((message) => ({
          id: message.id,
          createdAt: message.createdAt,
          authorType: message.authorType,
          authorLabel:
            message.authorType === "requester"
              ? requester.name
              : supportById.get(message.authorId)?.name ?? "Soporte",
          body: message.body,
        }))

      return {
        id: ticket.id,
        code: ticket.code,
        subject: ticket.subject,
        site: asValidSite((ticket as Ticket & { site?: string }).site ?? ""),
        description: ticket.description,
        status: ticket.status,
        priority: asValidPriority(ticket.priority as string),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        assigneeName: ticket.assigneeId
          ? (supportById.get(ticket.assigneeId)?.name ?? null)
          : null,
        messages,
      }
    })

  return {
    requester: {
      id: requester.id,
      name: requester.name,
      email: requester.email,
    },
    tickets,
  }
}

export async function addRequesterReply(input: RequesterReplyInput): Promise<{ code: string }> {
  if (isBlank(input.body)) {
    throw new Error("La respuesta no puede estar vacía")
  }

  const response = await withDbMutation((db) => {
    const ticket = db.tickets.find(
      (entry) => entry.id === input.ticketId && entry.requesterId === input.requesterId
    )

    if (!ticket) {
      throw new Error("Ticket no encontrado")
    }

    db.ticketMessages.push({
      id: allocateId(db, "ticketMessage"),
      ticketId: ticket.id,
      authorType: "requester",
      authorId: input.requesterId,
      visibility: "public",
      body: input.body.trim(),
      createdAt: now(),
    })

    addEvent(db, ticket.id, "requester", input.requesterId, "requester_reply", {
      visibility: "public",
    })

    if (ticket.status === "resolved" || ticket.status === "closed") {
      const previousStatus = ticket.status
      ticket.status = "open"
      addEvent(db, ticket.id, "requester", input.requesterId, "status_changed", {
        from: previousStatus,
        to: ticket.status,
      })
    }

    updateTicketTimestamp(ticket)

    const recipients = new Set<string>()
    const supportRecipients = getSupportNotificationRecipients()

    if (supportRecipients.length > 0) {
      supportRecipients.forEach((email) => recipients.add(email))
    } else {
      db.supportUsers
        .filter((user) => user.isActive)
        .forEach((user) => recipients.add(user.email))
    }

    if (ticket.assigneeId) {
      const assignee = db.supportUsers.find((user) => user.id === ticket.assigneeId)
      if (assignee?.isActive) {
        recipients.add(assignee.email)
      }
    }

    return {
      ticket,
      recipients: [...recipients],
    }
  })

  if (response.recipients.length > 0) {
    await trySendEmail({
      to: response.recipients,
      subject: `[${response.ticket.code}] Nueva respuesta del solicitante`,
      text: [
        "El solicitante ha añadido una nueva respuesta al ticket.",
        "",
        `Código: ${response.ticket.code}`,
        `Asunto: ${response.ticket.subject}`,
      ].join("\n"),
    })
  }

  return { code: response.ticket.code }
}

export async function authenticateSupportUser(params: {
  email: string
  password: string
}): Promise<{ id: string; name: string; email: string } | null> {
  await ensureSupportUsersFromConfig()

  const db = await readDb()
  const email = normalizeEmail(params.email)

  const user = db.supportUsers.find((entry) => entry.email === email && entry.isActive)

  if (!user) {
    return null
  }

  const isValidPassword = await verifyPassword(params.password, user.passwordHash)

  if (!isValidPassword) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

export async function getTicketSearchCatalog(): Promise<
  Array<{
    id: string
    code: string
    subject: string
    summary: string
    status: TicketStatus
    updatedAt: string
  }>
> {
  const db = await readDb()

  return db.tickets
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      subject: ticket.subject,
      summary: ticket.description,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
    }))
}

export async function getSupportDashboardData(): Promise<{
  supportUsers: Array<{ id: string; name: string; email: string }>
  counters: Record<TicketStatus, number>
  tickets: Array<{
    id: string
    code: string
    subject: string
    site: TicketSite
    description: string
    status: TicketStatus
    priority: TicketPriority
    createdAt: string
    updatedAt: string
    requester: { id: string; name: string; email: string }
    assignee: { id: string; name: string } | null
    messages: Array<{
      id: string
      createdAt: string
      authorLabel: string
      visibility: "public" | "internal"
      body: string
    }>
    events: Array<{
      id: string
      createdAt: string
      label: string
    }>
  }>
}> {
  await ensureSupportUsersFromConfig()

  const db = await readDb()

  const supportUsers = db.supportUsers
    .filter((user) => user.isActive)
    .map((user) => ({ id: user.id, name: user.name, email: user.email }))

  const requesterById = new Map(db.requesters.map((entry) => [entry.id, entry]))
  const supportById = new Map(
    db.supportUsers.map((entry) => [
      entry.id,
      { id: entry.id, name: entry.name, email: entry.email },
    ])
  )

  const counters: Record<TicketStatus, number> = {
    open: 0,
    in_progress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  }

  db.tickets.forEach((ticket) => {
    counters[ticket.status] += 1
  })

  const tickets = db.tickets
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((ticket) => {
      const requester = requesterById.get(ticket.requesterId)

      if (!requester) {
        return null
      }

      const messages = db.ticketMessages
        .filter((message) => message.ticketId === ticket.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((message) => ({
          id: message.id,
          createdAt: message.createdAt,
          authorLabel:
            message.authorType === "requester"
              ? requester.name
              : supportById.get(message.authorId)?.name ?? "Soporte",
          visibility: message.visibility,
          body: message.body,
        }))

      const events = db.ticketEvents
        .filter((event) => event.ticketId === ticket.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((event) => ({
          id: event.id,
          createdAt: event.createdAt,
          label: renderEventLabel(event),
        }))

      return {
        id: ticket.id,
        code: ticket.code,
        subject: ticket.subject,
        site: asValidSite((ticket as Ticket & { site?: string }).site ?? ""),
        description: ticket.description,
        status: ticket.status,
        priority: asValidPriority(ticket.priority as string),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        requester: {
          id: requester.id,
          name: requester.name,
          email: requester.email,
        },
        assignee: ticket.assigneeId
          ? (supportById.get(ticket.assigneeId) ?? null)
          : null,
        messages,
        events,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  return {
    supportUsers,
    counters,
    tickets,
  }
}

function renderEventLabel(event: TicketEvent): string {
  switch (event.type) {
    case "ticket_created":
      return "Ticket creado"
    case "requester_reply":
      return "Nueva respuesta del solicitante"
    case "support_reply":
      return "Respuesta del equipo de soporte"
    case "internal_note":
      return "Nota interna añadida"
    case "status_changed":
      return `Estado actualizado: ${
        event.meta.to ? ticketStatusLabels[event.meta.to as TicketStatus] : "-"
      }`
    case "priority_changed":
      return event.meta.to
        ? `Prioridad actualizada: ${ticketPriorityLabels[asValidPriority(event.meta.to)]}`
        : "Prioridad actualizada"
    case "assignee_changed":
      return "Asignación actualizada"
    case "session_created":
      return "Sesión creada"
    default:
      return "Evento"
  }
}

export async function updateTicketWorkflow(input: UpdateTicketWorkflowInput): Promise<{ code: string }> {
  const result = await withDbMutation((db) => {
    const ticket = db.tickets.find((entry) => entry.id === input.ticketId)
    if (!ticket) {
      throw new Error("Ticket no encontrado")
    }

    const supportUser = db.supportUsers.find(
      (entry) => entry.id === input.supportUserId && entry.isActive
    )

    if (!supportUser) {
      throw new Error("Usuario de soporte no autorizado")
    }

    const requester = db.requesters.find((entry) => entry.id === ticket.requesterId)
    if (!requester) {
      throw new Error("Solicitante no encontrado")
    }

    const nextStatus = asValidStatus(input.status)
    const nextPriority = asValidPriority(input.priority)

    if (ticket.status !== nextStatus) {
      addEvent(db, ticket.id, "support", supportUser.id, "status_changed", {
        from: ticket.status,
        to: nextStatus,
      })
      ticket.status = nextStatus
    }

    if (ticket.priority !== nextPriority) {
      addEvent(db, ticket.id, "support", supportUser.id, "priority_changed", {
        from: ticket.priority,
        to: nextPriority,
      })
      ticket.priority = nextPriority
    }

    if (ticket.assigneeId !== input.assigneeId) {
      addEvent(db, ticket.id, "support", supportUser.id, "assignee_changed", {
        from: ticket.assigneeId,
        to: input.assigneeId,
      })
      ticket.assigneeId = input.assigneeId
    }

    updateTicketTimestamp(ticket)

    return {
      ticket,
      requester,
    }
  })

  await trySendEmail({
    to: result.requester.email,
    subject: `[${result.ticket.code}] Actualización de estado`,
    text: [
      "Tu ticket ha sido actualizado por el equipo de soporte.",
      "",
      `Código: ${result.ticket.code}`,
      `Estado: ${ticketStatusLabels[result.ticket.status]}`,
      `Prioridad: ${ticketPriorityLabels[asValidPriority(result.ticket.priority as string)]}`,
    ].join("\n"),
  })

  return { code: result.ticket.code }
}

export async function addSupportMessage(input: SupportMessageInput): Promise<{ code: string }> {
  if (isBlank(input.body)) {
    throw new Error("El mensaje no puede estar vacío")
  }

  const result = await withDbMutation((db) => {
    const ticket = db.tickets.find((entry) => entry.id === input.ticketId)
    if (!ticket) {
      throw new Error("Ticket no encontrado")
    }

    const supportUser = db.supportUsers.find(
      (entry) => entry.id === input.supportUserId && entry.isActive
    )
    if (!supportUser) {
      throw new Error("Usuario de soporte no autorizado")
    }

    const requester = db.requesters.find((entry) => entry.id === ticket.requesterId)
    if (!requester) {
      throw new Error("Solicitante no encontrado")
    }

    db.ticketMessages.push({
      id: allocateId(db, "ticketMessage"),
      ticketId: ticket.id,
      authorType: "support",
      authorId: supportUser.id,
      visibility: input.visibility,
      body: input.body.trim(),
      createdAt: now(),
    })

    addEvent(
      db,
      ticket.id,
      "support",
      supportUser.id,
      input.visibility === "public" ? "support_reply" : "internal_note",
      { visibility: input.visibility }
    )

    if (input.visibility === "public" && (ticket.status === "open" || ticket.status === "pending")) {
      const previousStatus = ticket.status
      ticket.status = "in_progress"
      addEvent(db, ticket.id, "support", supportUser.id, "status_changed", {
        from: previousStatus,
        to: ticket.status,
      })
    }

    updateTicketTimestamp(ticket)

    return {
      ticket,
      requester,
      notifyRequester: input.visibility === "public",
    }
  })

  if (result.notifyRequester) {
    await trySendEmail({
      to: result.requester.email,
      subject: `[${result.ticket.code}] Nueva respuesta del equipo técnico`,
      text: [
        "El equipo técnico ha respondido a tu ticket.",
        "",
        `Código: ${result.ticket.code}`,
        `Estado actual: ${ticketStatusLabels[result.ticket.status]}`,
      ].join("\n"),
    })
  }

  return { code: result.ticket.code }
}
