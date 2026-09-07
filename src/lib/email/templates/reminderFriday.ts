import { emailShell, emailFooterText, ctaButtonHtml, APP_URL } from '../layout'

export type ReminderFridayArgs = {
  name: string
  week: number
  unpickedCount: number
  unsubscribeUrl?: string
}

/** Final-call nudge — sent Friday to anyone who still hasn't finished the open week. */
export function reminderFridayEmail({ name, week, unpickedCount, unsubscribeUrl }: ReminderFridayArgs) {
  const pickUrl = `${APP_URL}/cfb/game-picks?week=${week}`
  const gamesWord = unpickedCount === 1 ? 'game' : 'games'

  const subject = `Last call: Week ${week} picks lock soon`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:800;">Hey ${name},</p>
    <p style="margin:0 0 16px;">
      Kickoffs start rolling in tomorrow and you still have <strong>${unpickedCount} ${gamesWord}</strong>
      unpicked for Week ${week}. Once a game starts, that pick is locked out for good.
    </p>
    <p style="margin:0 0 16px;">
      Don't leave points on the table — finish your sheet today.
    </p>
    ${ctaButtonHtml('Finish My Picks', pickUrl)}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;">
      This is your last reminder for Week ${week}.
    </p>
  `

  const text = `Hey ${name},

Kickoffs start rolling in tomorrow and you still have ${unpickedCount} ${gamesWord} unpicked for Week ${week}. Once a game starts, that pick is locked out for good.

Don't leave points on the table — finish your sheet today.

Finish your picks: ${pickUrl}

This is your last reminder for Week ${week}.
${emailFooterText(unsubscribeUrl)}`

  return { subject, html: emailShell({ preheader: `${unpickedCount} ${gamesWord} left before Week ${week} locks`, bodyHtml, unsubscribeUrl }), text }
}
