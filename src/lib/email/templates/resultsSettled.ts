import { emailShell, emailFooterText, ctaButtonHtml, APP_URL } from '../layout'
import { BRAND } from '@/lib/utils/constants'

export type ResultsSettledArgs = {
  name: string
  week: number
  correct: number
  total: number
  seasonPoints: number
  /** Leaderboard rank, if known — omit the line entirely if not available */
  rank?: number
  unsubscribeUrl?: string
}

/** Sent once a week finishes grading — recaps that user's pick'em performance. */
export function resultsSettledEmail({ name, week, correct, total, seasonPoints, rank, unsubscribeUrl }: ResultsSettledArgs) {
  const leaderboardUrl = `${APP_URL}/leaderboard`
  const missed = total - correct

  const subject = `Week ${week} results: you went ${correct}-${missed}`

  const rankLine = rank
    ? `<p style="margin:0 0 16px;">That puts you at <strong>#${rank}</strong> on the season leaderboard.</p>`
    : ''

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:800;">Hey ${name},</p>
    <p style="margin:0 0 16px;">
      Week ${week} is in the books. You went
      <strong style="color:${BRAND.limeDark};">${correct}-${missed}</strong>
      on your picks, bringing your season total to <strong>${seasonPoints} points</strong>.
    </p>
    ${rankLine}
    ${ctaButtonHtml('View Full Leaderboard', leaderboardUrl)}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;">
      Next week's slate opens soon — get your picks in early.
    </p>
  `

  const text = `Hey ${name},

Week ${week} is in the books. You went ${correct}-${missed} on your picks, bringing your season total to ${seasonPoints} points.
${rank ? `\nThat puts you at #${rank} on the season leaderboard.\n` : ''}
View the full leaderboard: ${leaderboardUrl}

Next week's slate opens soon — get your picks in early.
${emailFooterText(unsubscribeUrl)}`

  return { subject, html: emailShell({ preheader: `You went ${correct}-${missed} in Week ${week}`, bodyHtml, unsubscribeUrl }), text }
}
