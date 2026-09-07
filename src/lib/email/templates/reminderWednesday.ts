import { emailShell, emailFooterText, ctaButtonHtml, APP_URL } from '../layout'

export type ReminderWednesdayArgs = {
  name: string
  week: number
  unpickedCount: number
  unsubscribeUrl?: string
}

/** Mid-week nudge — sent Wednesday to anyone with unpicked games in the open week. */
export function reminderWednesdayEmail({ name, week, unpickedCount, unsubscribeUrl }: ReminderWednesdayArgs) {
  const pickUrl = `${APP_URL}/cfb/game-picks?week=${week}`
  const gamesWord = unpickedCount === 1 ? 'game' : 'games'

  const subject = `Week ${week} picks are open — ${unpickedCount} ${gamesWord} left`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:800;">Hey ${name},</p>
    <p style="margin:0 0 16px;">
      Week ${week} is open on The Prediction Sheet and you've still got
      <strong>${unpickedCount} ${gamesWord}</strong> left to pick.
    </p>
    <p style="margin:0 0 16px;">
      Picks lock once kickoff hits, so get them in before Friday to make sure every game counts toward your score.
    </p>
    ${ctaButtonHtml('Make My Picks', pickUrl)}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;">
      See you on the leaderboard.
    </p>
  `

  const text = `Hey ${name},

Week ${week} is open on The Prediction Sheet and you've still got ${unpickedCount} ${gamesWord} left to pick.

Picks lock once kickoff hits, so get them in before Friday to make sure every game counts toward your score.

Make your picks: ${pickUrl}
${emailFooterText(unsubscribeUrl)}`

  return { subject, html: emailShell({ preheader: `${unpickedCount} ${gamesWord} left to pick for Week ${week}`, bodyHtml, unsubscribeUrl }), text }
}
