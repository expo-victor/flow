import crypto from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(crypto.scrypt)

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function randomToken(size = 32): string {
  return crypto.randomBytes(size).toString("base64url")
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex")
  const derived = (await scryptAsync(password, salt, 64)) as Buffer

  return `${salt}:${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":")

  if (!salt || !expected) {
    return false
  }

  const actual = (await scryptAsync(password, salt, 64)) as Buffer
  const expectedBuffer = Buffer.from(expected, "hex")

  if (actual.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(actual, expectedBuffer)
}
