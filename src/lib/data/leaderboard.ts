import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  username: string | null
  gamePoints: number
  recordPoints: number
  standingsPoints: number
  totalPoints: number
  rank: number
}

export interface WeeklyEntry {
  userId: string
  displayName: string
  username: string | null
  points: number
  correct: number
  total: number
  rank: number
}

export async function getSeasonLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  const { data: predSets } = await supabase
    .from('prediction_sets')
    .select('id, user_id')
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)

  if (!predSets || predSets.length === 0) return []

  const predSetIds = predSets.map((s) => s.id)
  const userIds = [...new Set(predSets.map((s) => s.user_id))]

  const [gamePreds, recordPreds, standingsPreds, profiles] = await Promise.all([
    supabase
      .from('predictions_game')
      .select('user_id, points_awarded')
      .in('prediction_set_id', predSetIds),
    supabase
      .from('predictions_record')
      .select('user_id, points_awarded')
      .in('prediction_set_id', predSetIds),
    supabase
      .from('predictions_standings')
      .select('user_id, points_awarded')
      .in('prediction_set_id', predSetIds),
    supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', userIds),
  ])

  const gameMap: Record<string, number> = {}
  const recordMap: Record<string, number> = {}
  const standingsMap: Record<string, number> = {}

  for (const p of gamePreds.data ?? []) {
    gameMap[p.user_id] = (gameMap[p.user_id] ?? 0) + (p.points_awarded ?? 0)
  }
  for (const p of recordPreds.data ?? []) {
    recordMap[p.user_id] = (recordMap[p.user_id] ?? 0) + (p.points_awarded ?? 0)
  }
  for (const p of standingsPreds.data ?? []) {
    standingsMap[p.user_id] = (standingsMap[p.user_id] ?? 0) + (p.points_awarded ?? 0)
  }

  const profileMap: Record<string, { display_name: string | null; username: string | null }> = {}
  for (const p of profiles.data ?? []) {
    profileMap[p.id] = { display_name: p.display_name, username: p.username }
  }

  const entries = userIds.map((userId) => {
    const profile = profileMap[userId]
    const gamePoints = gameMap[userId] ?? 0
    const recordPoints = recordMap[userId] ?? 0
    const standingsPoints = standingsMap[userId] ?? 0
    return {
      userId,
      displayName: profile?.display_name ?? 'Anonymous',
      username: profile?.username ?? null,
      gamePoints,
      recordPoints,
      standingsPoints,
      totalPoints: gamePoints + recordPoints + standingsPoints,
      rank: 0,
    }
  })

  entries.sort((a, b) => b.totalPoints - a.totalPoints)
  let rank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].totalPoints < entries[i - 1].totalPoints) rank = i + 1
    entries[i].rank = rank
  }

  return entries
}

export async function getWeeklyLeaderboard(week: number): Promise<WeeklyEntry[]> {
  const supabase = await createClient()

  const { data: weekGames } = await supabase
    .from('games')
    .select('id')
    .eq('season', CURRENT_SEASON)
    .eq('week', week)

  if (!weekGames || weekGames.length === 0) return []

  const gameIds = weekGames.map((g) => g.id)

  const { data: preds } = await supabase
    .from('predictions_game')
    .select('user_id, points_awarded, is_correct')
    .in('game_id', gameIds)

  if (!preds || preds.length === 0) return []

  const userIds = [...new Set(preds.map((p) => p.user_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .in('id', userIds)

  const profileMap: Record<string, { display_name: string | null; username: string | null }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { display_name: p.display_name, username: p.username }
  }

  const pointsMap: Record<string, number> = {}
  const correctMap: Record<string, number> = {}
  const totalMap: Record<string, number> = {}

  for (const p of preds) {
    pointsMap[p.user_id] = (pointsMap[p.user_id] ?? 0) + (p.points_awarded ?? 0)
    totalMap[p.user_id] = (totalMap[p.user_id] ?? 0) + 1
    if (p.is_correct) {
      correctMap[p.user_id] = (correctMap[p.user_id] ?? 0) + 1
    }
  }

  const entries = userIds.map((userId) => {
    const profile = profileMap[userId]
    return {
      userId,
      displayName: profile?.display_name ?? 'Anonymous',
      username: profile?.username ?? null,
      points: pointsMap[userId] ?? 0,
      correct: correctMap[userId] ?? 0,
      total: totalMap[userId] ?? 0,
      rank: 0,
    }
  })

  entries.sort((a, b) => b.points - a.points || b.correct - a.correct)
  let rank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].points < entries[i - 1].points) rank = i + 1
    entries[i].rank = rank
  }

  return entries
}
