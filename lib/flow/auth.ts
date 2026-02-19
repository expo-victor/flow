import "server-only"

import { cookies } from "next/headers"

import { SESSION_CONFIG } from "@/lib/flow/constants"
import { hashToken, randomToken } from "@/lib/flow/crypto"
import { allocateId, now, readDb, withDbMutation } from "@/lib/flow/store"
import { Requester, RequesterSession, SupportSession, SupportUser } from "@/lib/flow/types"

const requesterCookieName = "flow_requester_session"
const supportCookieName = "flow_support_session"

interface ParsedCookie {
  sessionId: string
  token: string
}

function parseCookieValue(value: string | undefined): ParsedCookie | null {
  if (!value) {
    return null
  }

  const [sessionId, token] = value.split(".")

  if (!sessionId || !token) {
    return null
  }

  return { sessionId, token }
}

function sessionIsExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

async function readRequesterSessionFromCookie(): Promise<{
  requester: Requester
  session: RequesterSession
} | null> {
  const cookieStore = await cookies()
  const parsed = parseCookieValue(cookieStore.get(requesterCookieName)?.value)

  if (!parsed) {
    return null
  }

  const db = await readDb()
  const session = db.requesterSessions.find((entry) => entry.id === parsed.sessionId)

  if (!session || sessionIsExpired(session.expiresAt)) {
    return null
  }

  if (session.tokenHash !== hashToken(parsed.token)) {
    return null
  }

  const requester = db.requesters.find((entry) => entry.id === session.requesterId)

  if (!requester) {
    return null
  }

  return { requester, session }
}

async function readSupportSessionFromCookie(): Promise<{
  supportUser: SupportUser
  session: SupportSession
} | null> {
  const cookieStore = await cookies()
  const parsed = parseCookieValue(cookieStore.get(supportCookieName)?.value)

  if (!parsed) {
    return null
  }

  const db = await readDb()
  const session = db.supportSessions.find((entry) => entry.id === parsed.sessionId)

  if (!session || sessionIsExpired(session.expiresAt)) {
    return null
  }

  if (session.tokenHash !== hashToken(parsed.token)) {
    return null
  }

  const supportUser = db.supportUsers.find(
    (entry) => entry.id === session.supportUserId && entry.isActive
  )

  if (!supportUser) {
    return null
  }

  return { supportUser, session }
}

export async function getRequesterFromSession(): Promise<Requester | null> {
  const context = await readRequesterSessionFromCookie()

  return context?.requester ?? null
}

export async function getSupportUserFromSession(): Promise<SupportUser | null> {
  const context = await readSupportSessionFromCookie()

  return context?.supportUser ?? null
}

export async function setRequesterSession(requesterId: string): Promise<void> {
  const token = randomToken()
  const tokenHash = hashToken(token)
  const createdAt = now()
  const expiresAt = new Date(
    Date.now() + SESSION_CONFIG.requesterDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const sessionId = await withDbMutation((db) => {
    const id = allocateId(db, "requesterSession")

    db.requesterSessions.push({
      id,
      requesterId,
      tokenHash,
      createdAt,
      expiresAt,
      lastSeenAt: createdAt,
    })

    return id
  })

  const cookieStore = await cookies()
  cookieStore.set(
    requesterCookieName,
    `${sessionId}.${token}`,
    cookieOptions(SESSION_CONFIG.requesterDays * 24 * 60 * 60)
  )
}

export async function clearRequesterSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(requesterCookieName)
}

export async function setSupportSession(supportUserId: string): Promise<void> {
  const token = randomToken()
  const tokenHash = hashToken(token)
  const createdAt = now()
  const expiresAt = new Date(
    Date.now() + SESSION_CONFIG.supportHours * 60 * 60 * 1000
  ).toISOString()

  const sessionId = await withDbMutation((db) => {
    const id = allocateId(db, "supportSession")

    db.supportSessions.push({
      id,
      supportUserId,
      tokenHash,
      createdAt,
      expiresAt,
      lastSeenAt: createdAt,
    })

    return id
  })

  const cookieStore = await cookies()
  cookieStore.set(
    supportCookieName,
    `${sessionId}.${token}`,
    cookieOptions(SESSION_CONFIG.supportHours * 60 * 60)
  )
}

export async function clearSupportSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(supportCookieName)
}
