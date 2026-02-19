  import { Badge } from "@/components/ui/badge"
import { ticketPriorityLabels, ticketStatusLabels } from "@/lib/flow/constants"
import { TicketPriority, TicketStatus } from "@/lib/flow/types"

const statusVariants: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  pending: "outline",
  resolved: "secondary",
  closed: "outline",
}

const priorityClasses: Record<TicketPriority, string> = {
  low: "border-blue-200 bg-blue-50 text-blue-700",
  normal: "border-green-200 bg-green-50 text-green-700",
  urgent: "border-amber-200 bg-amber-50 text-amber-700",
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={statusVariants[status]}>{ticketStatusLabels[status]}</Badge>
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={priorityClasses[priority]}>
      {ticketPriorityLabels[priority]}
    </Badge>
  )
}
