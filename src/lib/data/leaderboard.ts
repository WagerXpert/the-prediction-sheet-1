import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getSessionsByUserIds, getGamesPickedCounts, getGamePickAccuracyBySession } from '@/lib/data/full-season'
import { getChampionPicksBySessionIds, type CFPChampionPick } from '@/lib/data/cfp'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  username: string | null
  gamePoints: number
  recordPoints: number
  standingsPoints: number
  totalPoints: number
  rank: number
  // Game-winner picks decided so far (across CFB Pick'em + Full Season Mode)
  // and how many of those the user got right — "12/18", not just "12".
  gameCorrect: number
  gameTotal: number
  // Full Season Mode extras — present only if the user has a Full Season session
  fullSeasonSessionId: string | null
  fullSeasonGamesPicked: number
  championPick: CFPChampionPick | null
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
      .select('user_id, points_awarded, is_correct')
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
  const gameDecidedMap: Record<string, number> = {}
  const recordMap: Record<string, number> = {}
  const standingsMap: Record<string, number> = {}

  for (const p of gamePreds.data ?? []) {
    gameMap[p.user_id] = (gameMap[p.user_id] ?? 0) + (p.points_awarded ?? 0)
    if (p.is_correct !== null) {
      gameDecidedMap[p.user_id] = (gameDecidedMap[p.user_id] ?? 0) + 1
    }
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

  // Full Season Mode extras: games-picked counter + CFP champion pick icon.
  // Batched to avoid an N+1 query per leaderboard row.
  const fsSessionByUser = await getSessionsByUserIds(userIds)
  const fsSessionIds = [...fsSessionByUser.values()].map(s => s.id)
  const [gamesPickedBySession, championBySession, accuracyBySession] = await Promise.all([
    getGamesPickedCounts(fsSessionIds),
    getChampionPicksBySessionIds(fsSessionIds),
    getGamePickAccuracyBySession(fsSessionIds),
  ])

  const entries = userIds.map((userId) => {
    const profile = profileMap[userId]
    const gamePoints = gameMap[userId] ?? 0
    const recordPoints = recordMap[userId] ?? 0
    const standingsPoints = standingsMap[userId] ?? 0
    const fsSession = fsSessionByUser.get(userId) ?? null
    const fsAccuracy = fsSession ? accuracyBySession.get(fsSession.id) : undefined

    // Game-winner picks correct/decided so far — combines CFB Pick'em
    // (predictions_game, 1pt per correct pick, so gamePoints === correct count)
    // with Full Season Mode's own per-game picks, which have no separate point
    // total of their own.
    const gameCorrect = gamePoints + (fsAccuracy?.correct ?? 0)
    const gameTotal = (gameDecidedMap[userId] ?? 0) + (fsAccuracy?.total ?? 0)

    return {
      userId,
      displayName: profile?.display_name ?? 'Anonymous',
      username: profile?.username ?? null,
      gamePoints,
      recordPoints,
      standingsPoints,
      totalPoints: gameCorrect + recordPoints + standingsPoints,
      rank: 0,
      gameCorrect,
      gameTotal,
      fullSeasonSessionId: fsSession?.id ?? null,
      fullSeasonGamesPicked: fsSession ? (gamesPickedBySession.get(fsSession.id) ?? 0) : 0,
      championPick: fsSession ? (championBySession.get(fsSession.id) ?? null) : null,
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
