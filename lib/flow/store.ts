import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { FlowDatabase } from "@/lib/flow/types"

const defaultDbPath = path.join(process.cwd(), "data", "flow-db.json")
const dbPath = process.env.FLOW_DB_FILE ?? defaultDbPath

let writeQueue: Promise<unknown> = Promise.resolve()

function nowIso(): string {
  return new Date().toISOString()
}

function createInitialDatabase(): FlowDatabase {
  return {
    meta: {
      version: 1,
      updatedAt: nowIso(),
      nextIds: {
        requester: 1,
        requesterSession: 1,
        supportUser: 1,
        supportSession: 1,
        ticket: 1,
        ticketMessage: 1,
        ticketEvent: 1,
      },
    },
    requesters: [],
    requesterSessions: [],
    supportUsers: [],
    supportSessions: [],
    tickets: [],
    ticketMessages: [],
    ticketEvents: [],
  }
}

function sanitizeDatabase(input: Partial<FlowDatabase>): FlowDatabase {
  const initial = createInitialDatabase()

  return {
    ...initial,
    ...input,
    meta: {
      ...initial.meta,
      ...input.meta,
      nextIds: {
        ...initial.meta.nextIds,
        ...input.meta?.nextIds,
      },
    },
    requesters: Array.isArray(input.requesters) ? input.requesters : [],
    requesterSessions: Array.isArray(input.requesterSessions)
      ? input.requesterSessions
      : [],
    supportUsers: Array.isArray(input.supportUsers) ? input.supportUsers : [],
    supportSessions: Array.isArray(input.supportSessions)
      ? input.supportSessions
      : [],
    tickets: Array.isArray(input.tickets) ? input.tickets : [],
    ticketMessages: Array.isArray(input.ticketMessages) ? input.ticketMessages : [],
    ticketEvents: Array.isArray(input.ticketEvents) ? input.ticketEvents : [],
  }
}

async function ensureDatabaseFile(): Promise<void> {
  const directory = path.dirname(dbPath)

  await mkdir(directory, { recursive: true })

  try {
    await readFile(dbPath, "utf8")
  } catch {
    await writeFile(dbPath, JSON.stringify(createInitialDatabase(), null, 2), "utf8")
  }
}

export async function readDb(): Promise<FlowDatabase> {
  await ensureDatabaseFile()

  const raw = await readFile(dbPath, "utf8")
  const parsed = JSON.parse(raw) as Partial<FlowDatabase>

  return sanitizeDatabase(parsed)
}

export async function writeDb(next: FlowDatabase): Promise<void> {
  next.meta.updatedAt = nowIso()
  await writeFile(dbPath, JSON.stringify(next, null, 2), "utf8")
}

export async function withDbMutation<T>(
  mutate: (db: FlowDatabase) => Promise<T> | T
): Promise<T> {
  const operation = writeQueue.then(async () => {
    const current = await readDb()
    const result = await mutate(current)

    await writeDb(current)

    return result
  })

  writeQueue = operation.catch(() => undefined)

  return operation
}

export function allocateId(db: FlowDatabase, key: keyof FlowDatabase["meta"]["nextIds"]): string {
  const current = db.meta.nextIds[key]
  db.meta.nextIds[key] += 1

  return String(current)
}

export function now(): string {
  return nowIso()
}
