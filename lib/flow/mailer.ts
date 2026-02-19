import "server-only"

import nodemailer, { Transporter } from "nodemailer"

export interface EmailPayload {
  to: string | string[]
  subject: string
  text: string
}

let transporter: Transporter | null | undefined

function getMailerTransporter(): Transporter | null {
  if (transporter !== undefined) {
    return transporter
  }

  const host = process.env.FLOW_SMTP_HOST
  const port = Number(process.env.FLOW_SMTP_PORT ?? "587")
  const user = process.env.FLOW_SMTP_USER
  const pass = process.env.FLOW_SMTP_PASSWORD

  if (!host || !user || !pass) {
    transporter = null
    return transporter
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })

  return transporter
}

function getFromAddress(): string {
  return process.env.FLOW_SMTP_FROM ?? "Expoflamenco Flow <no-reply@expoflamenco.local>"
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const configuredTransporter = getMailerTransporter()

  if (!configuredTransporter) {
    console.info("[flow-email:console]", {
      ...payload,
      to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
    })
    return
  }

  await configuredTransporter.sendMail({
    from: getFromAddress(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  })
}

export function getSupportNotificationRecipients(): string[] {
  const recipients = process.env.FLOW_SUPPORT_NOTIFICATION_EMAILS

  if (!recipients) {
    return []
  }

  return recipients
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}
