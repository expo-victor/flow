import { TicketPriority, TicketSite, TicketStatus } from "@/lib/flow/types"

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
}

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  urgent: "Urgente",
}

export const ticketSiteLabels: Record<TicketSite, string> = {
  agenda: "Agenda",
  academia: "Academia",
  tv: "TV",
  revista: "Revista",
  podcast: "Podcast",
  comunidad: "Comunidad",
  espacio: "Espacio",
}

export const SESSION_CONFIG = {
  requesterDays: 60,
  supportHours: 12,
}
