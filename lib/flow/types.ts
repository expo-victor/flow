export const ticketStatuses = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
] as const

export const ticketPriorities = ["low", "normal", "urgent"] as const
export const ticketSites = [
  "agenda",
  "academia",
  "tv",
  "revista",
  "podcast",
  "comunidad",
  "espacio",
] as const

export const ticketEventTypes = [
  "ticket_created",
  "requester_reply",
  "support_reply",
  "internal_note",
  "status_changed",
  "priority_changed",
  "assignee_changed",
  "session_created",
] as const

export type TicketStatus = (typeof ticketStatuses)[number]
export type TicketPriority = (typeof ticketPriorities)[number]
export type TicketSite = (typeof ticketSites)[number]
export type TicketEventType = (typeof ticketEventTypes)[number]

export type ActorType = "requester" | "support" | "system"

export interface Requester {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface RequesterSession {
  id: string
  requesterId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

export interface SupportUser {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
  isActive: boolean
}

export interface SupportSession {
  id: string
  supportUserId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  lastSeenAt: string
}

export interface Ticket {
  id: string
  code: string
  requesterId: string
  subject: string
  site: TicketSite
  description: string
  status: TicketStatus
  priority: TicketPriority
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  authorType: "requester" | "support"
  authorId: string
  visibility: "public" | "internal"
  body: string
  createdAt: string
}

export interface TicketEvent {
  id: string
  ticketId: string
  actorType: ActorType
  actorId: string
  type: TicketEventType
  meta: Record<string, string | null>
  createdAt: string
}

export interface FlowDatabase {
  meta: {
    version: number
    updatedAt: string
    nextIds: {
      requester: number
      requesterSession: number
      supportUser: number
      supportSession: number
      ticket: number
      ticketMessage: number
      ticketEvent: number
    }
  }
  requesters: Requester[]
  requesterSessions: RequesterSession[]
  supportUsers: SupportUser[]
  supportSessions: SupportSession[]
  tickets: Ticket[]
  ticketMessages: TicketMessage[]
  ticketEvents: TicketEvent[]
}
