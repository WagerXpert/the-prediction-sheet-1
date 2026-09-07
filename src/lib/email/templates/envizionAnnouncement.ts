import { emailShell, emailFooterText, ctaButtonHtml } from '../layout'
import { BRAND } from '@/lib/utils/constants'

export type EnvizionAnnouncementArgs = {
  name: string
  /** App Store link (or waitlist/landing page if not live yet) */
  ctaUrl: string
  unsubscribeUrl?: string
}

/** One-time promo — announces the Envizion Sports app to the existing user base. */
export function envizionAnnouncementEmail({ name, ctaUrl, unsubscribeUrl }: EnvizionAnnouncementArgs) {
  const subject = `Introducing Envizion Sports — predict against friends, win real cash`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:800;">Hey ${name},</p>
    <p style="margin:0 0 16px;">
      From the team behind The Prediction Sheet — we're launching
      <strong style="color:${BRAND.limeDark};">Envizion Sports</strong>, a new app coming soon to the iOS App Store.
    </p>
    <p style="margin:0 0 16px;">
      Build fantasy-style prediction leagues with your friends across any sport, compete head-to-head all season,
      and the winner takes home real cash.
    </p>
    <p style="margin:0 0 16px;">
      If you've enjoyed competing on The Prediction Sheet, you're going to feel right at home.
    </p>
    ${ctaButtonHtml('Get Envizion Sports', ctaUrl)}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;">
      More details coming soon — this is just a heads up so you're first in line.
    </p>
  `

  const text = `Hey ${name},

From the team behind The Prediction Sheet — we're launching Envizion Sports, a new app coming soon to the iOS App Store.

Build fantasy-style prediction leagues with your friends across any sport, compete head-to-head all season, and the winner takes home real cash.

If you've enjoyed competing on The Prediction Sheet, you're going to feel right at home.

${ctaUrl}

More details coming soon — this is just a heads up so you're first in line.
${emailFooterText(unsubscribeUrl)}`

  return { subject, html: emailShell({ preheader: 'A new app from the team behind The Prediction Sheet — predict sports vs. friends for real cash', bodyHtml, unsubscribeUrl }), text }
}
