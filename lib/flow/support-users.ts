import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { normalizeEmail } from "@/lib/flow/crypto"

interface SupportUserConfigEntry {
  name: string
  email: string
  password: string
}

const defaultSupportUsers: SupportUserConfigEntry[] = [
  {
    name: "Carmen Soporte",
    email: "carmen.soporte@expoflamenco.com",
    password: "Soporte#2026",
  },
  {
    name: "Miguel Soporte",
    email: "miguel.soporte@expoflamenco.com",
    password: "Soporte#2026",
  },
  {
    name: "Lucia Soporte",
    email: "lucia.soporte@expoflamenco.com",
    password: "Soporte#2026",
  },
  {
    name: "Rocio Soporte",
    email: "rocio.soporte@expoflamenco.com",
    password: "Soporte#2026",
  },
  {
    name: "Antonio Soporte",
    email: "antonio.soporte@expoflamenco.com",
    password: "Soporte#2026",
  },
]

const supportUsersFile =
  process.env.FLOW_SUPPORT_USERS_FILE ?? path.join(process.cwd(), "data", "support-users.json")

async function ensureSupportUsersFile(): Promise<void> {
  const directory = path.dirname(supportUsersFile)
  await mkdir(directory, { recursive: true })

  try {
    await readFile(supportUsersFile, "utf8")
  } catch {
    await writeFile(supportUsersFile, JSON.stringify(defaultSupportUsers, null, 2), "utf8")
  }
}

function sanitizeEntries(input: unknown): SupportUserConfigEntry[] {
  if (!Array.isArray(input)) {
    return defaultSupportUsers
  }

  const uniqueByEmail = new Map<string, SupportUserConfigEntry>()

  input.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return
    }

    const name = typeof entry.name === "string" ? entry.name.trim() : ""
    const emailRaw = typeof entry.email === "string" ? entry.email.trim() : ""
    const password = typeof entry.password === "string" ? entry.password : ""

    if (!name || !emailRaw || !password) {
      return
    }

    const email = normalizeEmail(emailRaw)

    if (!uniqueByEmail.has(email)) {
      uniqueByEmail.set(email, {
        name,
        email,
        password,
      })
    }
  })

  return uniqueByEmail.size > 0 ? [...uniqueByEmail.values()] : defaultSupportUsers
}

export async function readSupportUsersConfig(): Promise<SupportUserConfigEntry[]> {
  await ensureSupportUsersFile()

  const raw = await readFile(supportUsersFile, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return sanitizeEntries(parsed)
}
