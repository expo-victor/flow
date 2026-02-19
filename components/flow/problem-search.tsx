"use client"
import { FormEvent, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ticketStatusLabels } from "@/lib/flow/constants"
import { TicketStatus } from "@/lib/flow/types"

interface SearchTicket {
  id: string
  code: string
  subject: string
  summary: string
  status: TicketStatus
  updatedAt: string
}

const stopwords = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "y",
  "o",
  "en",
  "con",
  "sin",
  "para",
  "por",
  "que",
  "me",
  "mi",
  "su",
  "se",
  "es",
  "un",
  "una",
  "al",
  "lo",
  "no",
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function toTokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopwords.has(token))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

export function ProblemSearch({ tickets }: { tickets: SearchTicket[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const queryTokens = useMemo(() => toTokens(query), [query])

  const matches = useMemo(() => {
    if (queryTokens.length === 0) {
      return []
    }

    return tickets
      .map((ticket) => {
        const subject = normalize(ticket.subject)
        const summary = normalize(ticket.summary)

        let score = 0
        queryTokens.forEach((token) => {
          if (subject.includes(token)) {
            score += 3
          }
          if (summary.includes(token)) {
            score += 1
          }
        })

        return {
          ticket,
          score,
        }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }

        return new Date(b.ticket.updatedAt).getTime() - new Date(a.ticket.updatedAt).getTime()
      })
      .slice(0, 5)
      .map((entry) => entry.ticket)
  }, [queryTokens, tickets])

  const noMatches = query.trim().length >= 8 && queryTokens.length > 0 && matches.length === 0
  const ctaLabel = noMatches ? "Crear ticket" : "Buscar"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (noMatches) {
      const description = `Necesito ayuda con: ${query.trim()}`
      router.push(
        `/app?subject=${encodeURIComponent(query.trim())}&description=${encodeURIComponent(description)}`
      )
      return
    }

    setShowResults(true)
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  return (
    <div className="mx-auto mt-7 w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-black/15 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm text-black outline-none placeholder:text-black/50 focus:border-black/35"
            placeholder="Describe tu problema (ej. no puedo entrar al gestor de contenidos)"
            aria-label="Descripción del problema"
          />
          <Button
            type="submit"
            className="h-11 rounded-xl px-6 text-sm font-medium text-white hover:bg-[#bf241a]"
            style={{ backgroundColor: "#DA2B1F" }}
          >
            {ctaLabel}
          </Button>
        </div>
      </form>

      <div ref={resultsRef} className="mt-4">
        {showResults && query.trim().length > 0 && matches.length > 0 ? (
          <div className="rounded-2xl border border-black/12 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-black">
              Encontramos {matches.length} incidencia{matches.length > 1 ? "s" : ""} similar
              {matches.length > 1 ? "es" : ""}
            </p>
            <div className="space-y-2">
              {matches.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-black/75">{ticket.code}</p>
                    <span className="rounded-full border border-black/15 px-2 py-0.5 text-[11px] text-black/70">
                      {ticketStatusLabels[ticket.status]}
                    </span>
                    <span className="text-[11px] text-black/50">Actualizado {formatDate(ticket.updatedAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-black">{ticket.subject}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-black/70">{ticket.summary}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showResults && query.trim().length > 0 && matches.length === 0 ? (
          <div className="rounded-2xl border border-black/12 bg-white p-4 text-sm text-black/75 shadow-sm">
            No hemos encontrado incidencias parecidas. Pulsa <strong>Crear ticket</strong> para
            enviarlo al equipo de soporte.
          </div>
        ) : null}

      </div>
    </div>
  )
}
