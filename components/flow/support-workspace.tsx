"use client"

import { useMemo, useState } from "react"

import {
  addSupportMessageAction,
  logoutSupportAction,
  updateTicketWorkflowAction,
} from "@/app/actions/support-actions"
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/flow/ticket-badges"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ticketPriorityLabels,
  ticketSiteLabels,
  ticketStatusLabels,
} from "@/lib/flow/constants"
import { formatDateTime } from "@/lib/flow/format"
import { TicketPriority, TicketStatus, ticketStatuses } from "@/lib/flow/types"

type ViewKey = "all" | "mine" | "unassigned" | TicketStatus

interface SupportAgent {
  id: string
  name: string
  email: string
}

interface SupportTicket {
  id: string
  code: string
  subject: string
  site: keyof typeof ticketSiteLabels
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
}

interface SupportWorkspaceProps {
  supportUser: SupportAgent
  selectedTicketCode: string | null
  error: string | null
  dashboard: {
    supportUsers: SupportAgent[]
    counters: Record<TicketStatus, number>
    tickets: SupportTicket[]
  }
}

export function SupportWorkspace({
  supportUser,
  selectedTicketCode,
  error,
  dashboard,
}: SupportWorkspaceProps) {
  const initialTicket = selectedTicketCode
    ? dashboard.tickets.find((ticket) => ticket.code === selectedTicketCode) ?? null
    : null

  const [activeView, setActiveView] = useState<ViewKey>(initialTicket?.status ?? "all")
  const [openTicketId, setOpenTicketId] = useState<string | null>(initialTicket?.id ?? null)

  const counters = useMemo(() => {
    const mine = dashboard.tickets.filter((ticket) => ticket.assignee?.id === supportUser.id).length
    const unassigned = dashboard.tickets.filter((ticket) => !ticket.assignee).length

    return {
      mine,
      unassigned,
    }
  }, [dashboard.tickets, supportUser.id])

  const filteredTickets = useMemo(() => {
    switch (activeView) {
      case "mine":
        return dashboard.tickets.filter((ticket) => ticket.assignee?.id === supportUser.id)
      case "unassigned":
        return dashboard.tickets.filter((ticket) => !ticket.assignee)
      case "all":
        return dashboard.tickets
      default:
        return dashboard.tickets.filter((ticket) => ticket.status === activeView)
    }
  }, [activeView, dashboard.tickets, supportUser.id])

  const menuItems: Array<{ key: ViewKey; label: string; count: number }> = [
    { key: "all", label: "Todos", count: dashboard.tickets.length },
    { key: "mine", label: "Asignados a mí", count: counters.mine },
    { key: "unassigned", label: "Sin asignar", count: counters.unassigned },
    ...ticketStatuses.map((status) => ({
      key: status,
      label: ticketStatusLabels[status],
      count: dashboard.counters[status],
    })),
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="border-border bg-background">
          <CardHeader>
            <CardTitle>Filtros de tickets</CardTitle>
            <CardDescription>
              Selecciona la vista que necesitas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={activeView === item.key ? "default" : "outline"}
                className="w-full justify-between"
                onClick={() => setActiveView(item.key)}
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-black/12 px-2 py-0.5 text-xs text-current">
                  {item.count}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card size="sm" className="border-border bg-background">
          <CardHeader>
            <CardTitle className="text-base">Agente activo</CardTitle>
            <CardDescription>
              {supportUser.name} ({supportUser.email})
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={logoutSupportAction}>
              <Button variant="outline" type="submit" className="w-full">
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-4">
        {error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="text-destructive pt-6 text-sm">{error}</CardContent>
          </Card>
        ) : null}

        <Card className="border-border bg-background">
          <CardHeader>
            <CardTitle>
              Tickets {activeView !== "all" ? `· ${menuItems.find((item) => item.key === activeView)?.label}` : ""}
            </CardTitle>
            <CardDescription>
              Selecciona un ticket para ver y gestionar su detalle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
                No hay tickets en esta vista.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isOpen = openTicketId === ticket.id

                return (
                  <Card
                    key={ticket.id}
                    size="sm"
                    className={
                      isOpen
                        ? "ring-primary/45 border-primary/65 bg-primary/6"
                        : "border-border bg-muted/15"
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-muted/45"
                      onClick={() => setOpenTicketId(isOpen ? null : ticket.id)}
                    >
                      <p className="min-w-28 text-sm font-semibold">{ticket.code}</p>
                      <p className="min-w-0 grow truncate text-sm font-medium">{ticket.subject}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {ticketSiteLabels[ticket.site]}
                      </span>
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} />
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatDateTime(ticket.updatedAt)}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-border border-t px-4 py-4">
                        <div className="mb-4 rounded-xl border border-border bg-background p-3 text-sm">
                          <p>
                            <strong>Solicitante:</strong> {ticket.requester.name} ({ticket.requester.email})
                          </p>
                          <p>
                            <strong>Creado:</strong> {formatDateTime(ticket.createdAt)}
                          </p>
                          <p>
                            <strong>Descripción:</strong> {ticket.description}
                          </p>
                        </div>

                        <div className="mb-4 rounded-xl border border-border bg-background p-4">
                          <h3 className="mb-3 text-sm font-medium">Gestión del ticket</h3>
                          <form action={updateTicketWorkflowAction} className="grid gap-3 md:grid-cols-4">
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <div className="space-y-1">
                              <label htmlFor={`status-${ticket.id}`} className="text-xs font-medium">
                                Estado
                              </label>
                              <select
                                id={`status-${ticket.id}`}
                                name="status"
                                defaultValue={ticket.status}
                                className="bg-input/30 border-input h-9 w-full rounded-4xl border px-3 text-sm outline-none"
                              >
                                {ticketStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {ticketStatusLabels[status]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label htmlFor={`priority-${ticket.id}`} className="text-xs font-medium">
                                Prioridad
                              </label>
                              <select
                                id={`priority-${ticket.id}`}
                                name="priority"
                                defaultValue={ticket.priority}
                                className="bg-input/30 border-input h-9 w-full rounded-4xl border px-3 text-sm outline-none"
                              >
                                {Object.entries(ticketPriorityLabels).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label htmlFor={`assignee-${ticket.id}`} className="text-xs font-medium">
                                Asignado a
                              </label>
                              <select
                                id={`assignee-${ticket.id}`}
                                name="assigneeId"
                                defaultValue={ticket.assignee?.id ?? ""}
                                className="bg-input/30 border-input h-9 w-full rounded-4xl border px-3 text-sm outline-none"
                              >
                                <option value="">Sin asignar</option>
                                {dashboard.supportUsers.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end">
                              <Button type="submit" variant="secondary" className="w-full">
                                Guardar
                              </Button>
                            </div>
                          </form>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                            <h3 className="text-sm font-medium">Conversación pública</h3>
                            <div className="max-h-64 space-y-2 overflow-auto pr-1">
                              {ticket.messages
                                .filter((message) => message.visibility === "public")
                                .map((message) => (
                                  <div key={message.id} className="rounded-xl border border-border bg-muted/10 p-3">
                                    <p className="text-muted-foreground mb-1 text-xs">
                                      {message.authorLabel} · {formatDateTime(message.createdAt)}
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                                  </div>
                                ))}
                            </div>
                            <form action={addSupportMessageAction} className="space-y-2">
                              <input type="hidden" name="ticketId" value={ticket.id} />
                              <input type="hidden" name="visibility" value="public" />
                              <textarea
                                name="body"
                                className="border-input bg-input/30 min-h-24 w-full rounded-xl border p-3 text-sm outline-none"
                                placeholder="Respuesta visible para el solicitante"
                                required
                              />
                              <Button type="submit" className="w-full">
                                Enviar respuesta
                              </Button>
                            </form>
                          </div>

                          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                            <h3 className="text-sm font-medium">Notas internas</h3>
                            <div className="max-h-64 space-y-2 overflow-auto pr-1">
                              {ticket.messages
                                .filter((message) => message.visibility === "internal")
                                .map((message) => (
                                  <div key={message.id} className="rounded-xl border border-border bg-muted/10 p-3">
                                    <p className="text-muted-foreground mb-1 text-xs">
                                      {message.authorLabel} · {formatDateTime(message.createdAt)}
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                                  </div>
                                ))}
                            </div>
                            <form action={addSupportMessageAction} className="space-y-2">
                              <input type="hidden" name="ticketId" value={ticket.id} />
                              <input type="hidden" name="visibility" value="internal" />
                              <textarea
                                name="body"
                                className="border-input bg-input/30 min-h-24 w-full rounded-xl border p-3 text-sm outline-none"
                                placeholder="Nota privada solo para soporte"
                                required
                              />
                              <Button type="submit" variant="outline" className="w-full">
                                Guardar nota interna
                              </Button>
                            </form>
                          </div>
                        </div>

                        <CardFooter className="mt-4 block border-t px-0 pt-4">
                          <h3 className="mb-2 text-sm font-medium">Historial de eventos</h3>
                          <div className="max-h-44 space-y-1 overflow-auto pr-1 text-sm">
                            {ticket.events.length === 0 ? (
                              <p className="text-muted-foreground">Sin eventos registrados.</p>
                            ) : (
                              ticket.events.map((event) => (
                                <p key={event.id} className="text-muted-foreground">
                                  {formatDateTime(event.createdAt)} · {event.label}
                                </p>
                              ))
                            )}
                          </div>
                        </CardFooter>
                      </div>
                    ) : null}
                  </Card>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
