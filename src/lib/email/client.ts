import { Resend } from 'resend'

let client: Resend | null = null

/** Lazy singleton — avoids throwing at import time if the key isn't set yet (e.g. during build). */
export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    client = new Resend(apiKey)
  }
  return client
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'The Prediction Sheet <onboarding@resend.dev>'

export type SendEmailArgs = {
  to: string | string[]
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const resend = getResendClient()
  return resend.emails.send({ from: EMAIL_FROM, to, subject, html, text })
}
