import { createServiceClient } from '@/lib/supabase/server'
import { CURRENT_SEASON, GAME_STATUS } from '@/lib/utils/constants'
import { sendEmail } from './client'
import { reminderWednesdayEmail } from './templates/reminderWednesday'
import { reminderFridayEmail } from './templates/reminderFriday'
import { resultsSettledEmail } from './templates/resultsSettled'
import { envizionAnnouncementEmail } from './templates/envizionAnnouncement'

type Db = ReturnType<typeof createServiceClient>

type Recipient = { id: string; name: string; email: string }

/** All auth users, id -> email. Paginates in case the user base outgrows one page. */
async function getEmailMap(db: Db, ids: string[]): Promise<Map<string, string>> {
  const wanted = new Set(ids)
  const map = new Map<string, string>()
  let page = 1
  const perPage = 1000

  while (wanted.size > map.size) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      if (wanted.has(u.id) && u.email) map.set(u.id, u.email)
    }
    if (data.users.length < perPage) break
    page++
  }

  return map
}

/** Profiles opted in to pick'em emails, joined with their auth email. */
async function getOptedInRecipients(db: Db): Promise<Recipient[]> {
  const { data: profiles } = await db
    .from('profiles')
    .select('id, display_name')
    .eq('email_reminders_opt_in', true)

  if (!profiles?.length) return []

  const emailMap = await getEmailMap(db, profiles.map((p) => p.id))

  return profiles
    .map((p) => ({ id: p.id, name: p.display_name ?? 'there', email: emailMap.get(p.id) }))
    .filter((r): r is Recipient => !!r.email)
}

/** Season-total points per user (game + record + standings picks), mirrors the leaderboard calc. */
async function getSeasonPointsByUser(db: Db, userIds: string[]): Promise<Map<string, number>> {
  const { data: predSets } = await db
    .from('prediction_sets')
    .select('id, user_id')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .in('user_id', userIds)

  const points = new Map<string, number>()
  if (!predSets?.length) return points

  const predSetIds = predSets.map((s) => s.id)

  const [gamePreds, recordPreds, standingsPreds] = await Promise.all([
    db.from('predictions_game').select('user_id, points_awarded').in('prediction_set_id', predSetIds),
    db.from('predictions_record').select('user_id, points_awarded').in('prediction_set_id', predSetIds),
    db.from('predictions_standings').select('user_id, points_awarded').in('prediction_set_id', predSetIds),
  ])

  for (const rows of [gamePreds.data, recordPreds.data, standingsPreds.data]) {
    for (const p of rows ?? []) {
      points.set(p.user_id, (points.get(p.user_id) ?? 0) + (p.points_awarded ?? 0))
    }
  }

  return points
}

/** Season rank per user, computed over everyone with a prediction set (not just the recipients passed in). */
async function getSeasonRanks(db: Db): Promise<Map<string, number>> {
  const { data: predSets } = await db
    .from('prediction_sets')
    .select('id, user_id')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)

  const ranks = new Map<string, number>()
  if (!predSets?.length) return ranks

  const allUserIds = [...new Set(predSets.map((s) => s.user_id))]
  const points = await getSeasonPointsByUser(db, allUserIds)

  const ordered = allUserIds
    .map((userId) => ({ userId, points: points.get(userId) ?? 0 }))
    .sort((a, b) => b.points - a.points)

  let rank = 1
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i].points < ordered[i - 1].points) rank = i + 1
    ranks.set(ordered[i].userId, rank)
  }

  return ranks
}

export type ReminderResult = { sent: number; week: number | null }

/** Wednesday/Friday nudge — emails everyone opted in who hasn't finished the open week. */
export async function sendPickReminders(variant: 'wednesday' | 'friday'): Promise<ReminderResult> {
  const db = createServiceClient()

  const { data: openWeekRows } = await db
    .from('games')
    .select('week')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .not('week', 'is', null)
    .neq('status', GAME_STATUS.COMPLETED)
    .order('week')
    .limit(1)

  const openWeek = openWeekRows?.[0]?.week ?? null
  if (openWeek === null) return { sent: 0, week: null }

  const { data: weekGames } = await db
    .from('games')
    .select('id')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .eq('week', openWeek)
    .neq('status', GAME_STATUS.COMPLETED)

  const gameIds = (weekGames ?? []).map((g) => g.id)
  if (!gameIds.length) return { sent: 0, week: openWeek }

  const recipients = await getOptedInRecipients(db)
  if (!recipients.length) return { sent: 0, week: openWeek }

  const { data: picks } = await db.from('predictions_game').select('user_id, game_id').in('game_id', gameIds)
  const pickedCountByUser = new Map<string, number>()
  for (const p of picks ?? []) {
    pickedCountByUser.set(p.user_id, (pickedCountByUser.get(p.user_id) ?? 0) + 1)
  }

  const build = variant === 'wednesday' ? reminderWednesdayEmail : reminderFridayEmail

  let sent = 0
  for (const recipient of recipients) {
    const unpickedCount = gameIds.length - (pickedCountByUser.get(recipient.id) ?? 0)
    if (unpickedCount <= 0) continue

    const { subject, html, text } = build({ name: recipient.name, week: openWeek, unpickedCount })
    await sendEmail({ to: recipient.email, subject, html, text })
    sent++
  }

  return { sent, week: openWeek }
}

export type SettledResult = { weeksNotified: number[]; sent: number }

/**
 * Finds any week whose games are all completed but hasn't been notified yet,
 * emails everyone opted in who picked that week, then marks it notified.
 * Safe to call every time the results sync runs — idempotent per week.
 */
export async function sendSettledWeekResults(): Promise<SettledResult> {
  const db = createServiceClient()

  const { data: allGames } = await db
    .from('games')
    .select('week, status')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .not('week', 'is', null)

  if (!allGames?.length) return { weeksNotified: [], sent: 0 }

  const weeks = [...new Set(allGames.map((g) => g.week as number))]
  const settledWeeks = weeks.filter((w) => {
    const gamesInWeek = allGames.filter((g) => g.week === w)
    return gamesInWeek.length > 0 && gamesInWeek.every((g) => g.status === GAME_STATUS.COMPLETED)
  })
  if (!settledWeeks.length) return { weeksNotified: [], sent: 0 }

  const { data: alreadyNotified } = await db
    .from('week_notifications')
    .select('week')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .in('week', settledWeeks)

  const alreadyNotifiedSet = new Set((alreadyNotified ?? []).map((r) => r.week))
  const weeksToNotify = settledWeeks.filter((w) => !alreadyNotifiedSet.has(w))
  if (!weeksToNotify.length) return { weeksNotified: [], sent: 0 }

  const recipients = await getOptedInRecipients(db)
  const recipientById = new Map(recipients.map((r) => [r.id, r]))

  let totalSent = 0

  for (const week of weeksToNotify) {
    const { data: weekGames } = await db
      .from('games')
      .select('id')
      .eq('sport_id', 'cfb')
      .eq('season', CURRENT_SEASON)
      .eq('week', week)

    const gameIds = (weekGames ?? []).map((g) => g.id)

    if (gameIds.length) {
      const { data: picks } = await db.from('predictions_game').select('user_id, is_correct').in('game_id', gameIds)

      const statsByUser = new Map<string, { correct: number; total: number }>()
      for (const p of picks ?? []) {
        const s = statsByUser.get(p.user_id) ?? { correct: 0, total: 0 }
        s.total++
        if (p.is_correct) s.correct++
        statsByUser.set(p.user_id, s)
      }

      if (statsByUser.size) {
        const [seasonPoints, ranks] = await Promise.all([
          getSeasonPointsByUser(db, [...statsByUser.keys()]),
          getSeasonRanks(db),
        ])

        for (const [userId, stat] of statsByUser) {
          const recipient = recipientById.get(userId)
          if (!recipient) continue

          const { subject, html, text } = resultsSettledEmail({
            name: recipient.name,
            week,
            correct: stat.correct,
            total: stat.total,
            seasonPoints: seasonPoints.get(userId) ?? 0,
            rank: ranks.get(userId),
          })
          await sendEmail({ to: recipient.email, subject, html, text })
          totalSent++
        }
      }
    }

    // Mark notified even if nobody had picks that week — prevents retrying forever.
    await db.from('week_notifications').insert({ sport_id: 'cfb', season: CURRENT_SEASON, week })
  }

  return { weeksNotified: weeksToNotify, sent: totalSent }
}

/**
 * One-time promo blast for the Envizion Sports app launch. Not on a cron —
 * trigger manually via /api/admin/send-envizion-announcement once the App
 * Store / waitlist link is live. Pass testEmail to send a single preview
 * copy before blasting the full list.
 */
export async function sendEnvizionAnnouncement(ctaUrl: string, testEmail?: string): Promise<{ sent: number }> {
  const db = createServiceClient()

  if (testEmail) {
    const { subject, html, text } = envizionAnnouncementEmail({ name: 'there', ctaUrl })
    await sendEmail({ to: testEmail, subject, html, text })
    return { sent: 1 }
  }

  const recipients = await getOptedInRecipients(db)
  let sent = 0
  for (const recipient of recipients) {
    const { subject, html, text } = envizionAnnouncementEmail({ name: recipient.name, ctaUrl })
    await sendEmail({ to: recipient.email, subject, html, text })
    sent++
  }

  return { sent }
}
