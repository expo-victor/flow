import Link from "next/link"
import { UserCircleIcon } from "@heroicons/react/24/solid"

import { addRequesterReplyAction, createTicketAction } from "@/app/actions/requester-actions"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getRequesterFromSession } from "@/lib/flow/auth"
import { ticketPriorityLabels, ticketSiteLabels } from "@/lib/flow/constants"
import { formatDateTime } from "@/lib/flow/format"
import { getRequesterDashboardData } from "@/lib/flow/service"
import { ticketPriorities, ticketSites } from "@/lib/flow/types"

type SearchParams = Record<string, string | string[] | undefined>

function getSingleQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function EmployeeAppPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const highlightTicketCode = getSingleQueryValue(resolvedSearchParams.ticket)
  const error = getSingleQueryValue(resolvedSearchParams.error)
  const prefillSubject = getSingleQueryValue(resolvedSearchParams.subject) ?? ""
  const prefillDescription = getSingleQueryValue(resolvedSearchParams.description) ?? ""
  const prefillSite = getSingleQueryValue(resolvedSearchParams.site) ?? "espacio"

  const requester = await getRequesterFromSession()
  const requesterData = requester
    ? await getRequesterDashboardData(requester.id).catch(() => null)
    : null

  const tickets = requesterData?.tickets ?? []
  const focusedMode = Boolean(highlightTicketCode)
  const focusedTicket = highlightTicketCode
    ? tickets.find((ticket) => ticket.code === highlightTicketCode) ?? null
    : null
  const selectedTicket = tickets[0] ?? null

  if (focusedMode) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pt-14 pb-8 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Detalle de ticket</h1>
            <p className="text-muted-foreground mt-1 text-base">
              Consulta completa de tu incidencia
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app">Volver al panel</Link>
          </Button>
        </header>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="text-destructive pt-6 text-base">{error}</CardContent>
          </Card>
        ) : null}

        {!focusedTicket ? (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-base">
              No encontramos ese ticket en tu historial.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {focusedTicket.code} · {focusedTicket.subject}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Última actualización: {formatDateTime(focusedTicket.updatedAt)}
                  </CardDescription>
                </div>
                <div className="ml-auto flex gap-2">
                  <TicketStatusBadge status={focusedTicket.status} />
                  <TicketPriorityBadge priority={focusedTicket.priority} />
                  <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs">
                    {ticketSiteLabels[focusedTicket.site]}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {focusedTicket.messages.map((message) => {
                  const isSupport = message.authorType === "support"

                  return (
                    <div
                      key={message.id}
                      className="rounded-xl border border-border/70 bg-background p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={
                            isSupport
                              ? "inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-900"
                              : "rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900"
                          }
                        >
                          {isSupport ? <UserCircleIcon className="size-3.5" aria-hidden="true" /> : null}
                          {message.authorLabel}
                        </span>
                        <span className="rounded-md border border-zinc-300 bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-900">
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-lg leading-8">{message.body}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="block border-t">
              <form action={addRequesterReplyAction} className="space-y-3">
                <input type="hidden" name="ticketId" value={focusedTicket.id} />
                <Textarea
                  name="body"
                  placeholder="Añadir mensaje al equipo de soporte"
                  className="min-h-28 text-base leading-7"
                  required
                />
                <Button type="submit" variant="secondary">
                  Enviar respuesta
                </Button>
              </form>
            </CardFooter>
          </Card>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 pt-14 pb-8 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Portal de incidencias</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Crea tu ticket y revisa respuestas del equipo técnico.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </header>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="text-destructive pt-6 text-base">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid items-stretch gap-6 lg:grid-cols-2">
        <Card className="order-2 h-full">
          <CardHeader>
            <CardTitle className="text-xl">Crear ticket</CardTitle>
            <CardDescription className="text-base leading-7">
              Explica qué pasa y cómo te afecta. Con esa información podremos ayudarte más rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTicketAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-base font-medium">
                  Nombre
                </label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={requesterData?.requester.name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-base font-medium">
                  Email interno
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={requesterData?.requester.email ?? ""}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px]">
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-base font-medium">
                    Asunto
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Ej: No puedo acceder al CMS"
                    defaultValue={prefillSubject}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="site" className="text-base font-medium">
                    Subsitio afectado
                  </label>
                  <Select name="site" defaultValue={prefillSite}>
                    <SelectTrigger id="site" className="w-full">
                      <SelectValue placeholder="Selecciona subsitio" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketSites.map((site) => (
                        <SelectItem key={site} value={site}>
                          {ticketSiteLabels[site]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-base font-medium">
                  Descripción
                </label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe el problema, impacto y cualquier detalle útil"
                  className="min-h-32"
                  defaultValue={prefillDescription}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="attachments" className="text-base font-medium">
                  Arrastrar o añadir capturas de pantalla o fotografías
                </label>
                <div className="rounded-xl border border-dashed border-border p-4">
                  <input
                    id="attachments"
                    name="attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    className="block w-full text-base text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium"
                  />
                  <p className="text-muted-foreground mt-2 text-sm">
                    Formatos recomendados: PNG, JPG o WEBP.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="priority" className="text-base font-medium">
                  Prioridad
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:max-w-[220px]">
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger id="priority" className="w-full">
                        <SelectValue placeholder="Selecciona prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketPriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {ticketPriorityLabels[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    Enviar incidencia
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="order-1 h-full">
          <CardHeader>
            <CardTitle className="text-xl">Guía rápida</CardTitle>
            <CardDescription className="text-base">
              Cuatro pasos para enviar tu incidencia de forma clara.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-base">
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-base font-medium">1. Describe el problema con claridad</p>
              <p className="text-muted-foreground mt-1 leading-7">
                Incluye qué estabas haciendo, qué resultado esperabas y qué ocurrió
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-base font-medium">2. Selecciona el subsitio afectado</p>
              <p className="text-muted-foreground mt-1 leading-7">
                Indica en cuáles de los subsitios ha ocurrido
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-base font-medium">3. Selecciona la prioridad adecuada</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2">
                  <span className="text-muted-foreground text-sm">No bloquea el trabajo</span>
                  <TicketPriorityBadge priority="low" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2">
                  <span className="text-muted-foreground text-sm">Afecta tareas habituales</span>
                  <TicketPriorityBadge priority="normal" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2">
                  <span className="text-muted-foreground text-sm">Bloquea el trabajo</span>
                  <TicketPriorityBadge priority="urgent" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-base font-medium">4. Sigue la conversación</p>
              <p className="text-muted-foreground mt-1 leading-7">
                Revisa cambios de estado y responde desde tu propio ticket
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Mis tickets</CardTitle>
          <CardDescription className="text-base">
            {tickets.length > 0
              ? `Tienes ${tickets.length} incidencia${tickets.length > 1 ? "s" : ""}`
              : "Aún no has registrado incidencias"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!requesterData || tickets.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-base">
              Cuando envíes tu primer ticket, aparecerá aquí para que puedas seguir su estado.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                {tickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id

                  return (
                    <Link
                      key={ticket.id}
                      href={`/app?ticket=${encodeURIComponent(ticket.code)}`}
                      className={`block rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? "border-primary/60 bg-primary/5"
                          : "border-border/70 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{ticket.code}</p>
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                        <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs">
                          {ticketSiteLabels[ticket.site]}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-medium">{ticket.subject}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Actualizado {formatDateTime(ticket.updatedAt)}
                      </p>
                    </Link>
                  )
                })}
              </div>

              {selectedTicket ? (
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="mb-3 flex flex-wrap items-start gap-2">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        {selectedTicket.code} · {selectedTicket.subject}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Última actualización: {formatDateTime(selectedTicket.updatedAt)}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <TicketStatusBadge status={selectedTicket.status} />
                      <TicketPriorityBadge priority={selectedTicket.priority} />
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs">
                        {ticketSiteLabels[selectedTicket.site]}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {selectedTicket.messages.map((message) => {
                      const isSupport = message.authorType === "support"

                      return (
                        <div
                          key={message.id}
                          className="rounded-xl border border-border/70 bg-background p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={
                                isSupport
                                  ? "inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-900"
                                  : "rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900"
                              }
                            >
                              {isSupport ? <UserCircleIcon className="size-3.5" aria-hidden="true" /> : null}
                              {message.authorLabel}
                            </span>
                            <span className="rounded-md border border-zinc-300 bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-900">
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-base leading-7">{message.body}</p>
                        </div>
                      )
                    })}
                  </div>

                  <CardFooter className="mt-4 block border-t px-0 pt-4">
                    <form action={addRequesterReplyAction} className="space-y-2">
                      <input type="hidden" name="ticketId" value={selectedTicket.id} />
                      <Textarea
                        name="body"
                        placeholder="Añadir mensaje al equipo de soporte"
                        className="min-h-24"
                        required
                      />
                      <Button type="submit" variant="secondary">
                        Enviar respuesta
                      </Button>
                    </form>
                  </CardFooter>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
