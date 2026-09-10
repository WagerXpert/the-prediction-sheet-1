import { emailShell, emailFooterText, ctaButtonHtml, APP_URL } from '../layout'
import { BRAND } from '@/lib/utils/constants'

export type SiteUpdateAnnouncementArgs = {
  name: string
  unsubscribeUrl?: string
}

/** One-time promo — lets existing users know about the site refresh. */
export function siteUpdateAnnouncementEmail({ name, unsubscribeUrl }: SiteUpdateAnnouncementArgs) {
  const siteUrl = APP_URL
  const subject = `We gave The Prediction Sheet a fresh new look`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:800;">Hey ${name},</p>
    <p style="margin:0 0 16px;">
      We just shipped an update to The Prediction Sheet — new logo, a redesigned homepage,
      and a cleaner look across the site.
    </p>
    <p style="margin:0 0 16px;">
      You'll also start seeing <strong style="color:${BRAND.limeDark};">Envizion Sports</strong>
      branding around the site — that's the team behind The Prediction Sheet, and the name to watch
      for what's coming next.
    </p>
    <p style="margin:0 0 16px;">
      Nothing about your picks or your season changed — just come take a look at the new interface.
    </p>
    ${ctaButtonHtml('Check Out the New Look', siteUrl)}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;">
      Same picks, same leaderboard — just a fresher coat of paint.
    </p>
  `

  const text = `Hey ${name},

We just shipped an update to The Prediction Sheet — new logo, a redesigned homepage, and a cleaner look across the site.

You'll also start seeing Envizion Sports branding around the site — that's the team behind The Prediction Sheet, and the name to watch for what's coming next.

Nothing about your picks or your season changed — just come take a look at the new interface.

${siteUrl}

Same picks, same leaderboard — just a fresher coat of paint.
${emailFooterText(unsubscribeUrl)}`

  return {
    subject,
    html: emailShell({ preheader: 'New logo, redesigned homepage, cleaner look — come take a look', bodyHtml, unsubscribeUrl }),
    text,
  }
}
