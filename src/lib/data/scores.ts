import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export interface UserScoreSummary {
  totalPoints: number
  gamePoints: number
  gameCorrect: number
  gameGraded: number
  recordPoints: number
  recordCorrect: number
  recordGraded: number
  standingsPoints: number
  hasAnyPredictions: boolean
}

export async function getUserScoreSummary(userId: string): Promise<UserScoreSummary> {
  const supabase = await createClient()

  const { data: predSet } = await supabase
    .from('prediction_sets')
    .select('id')
    .eq('user_id', userId)
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .maybeSingle()

  const empty: UserScoreSummary = {
    totalPoints: 0,
    gamePoints: 0,
    gameCorrect: 0,
    gameGraded: 0,
    recordPoints: 0,
    recordCorrect: 0,
    recordGraded: 0,
    standingsPoints: 0,
    hasAnyPredictions: false,
  }

  if (!predSet) return empty

  const [gamePreds, recordPreds, standingsPreds] = await Promise.all([
    supabase
      .from('predictions_game')
      .select('points_awarded, is_correct')
      .eq('prediction_set_id', predSet.id),
    supabase
      .from('predictions_record')
      .select('points_awarded, is_correct')
      .eq('prediction_set_id', predSet.id),
    supabase
      .from('predictions_standings')
      .select('points_awarded')
      .eq('prediction_set_id', predSet.id),
  ])

  const games = gamePreds.data ?? []
  const records = recordPreds.data ?? []
  const standings = standingsPreds.data ?? []

  if (games.length + records.length + standings.length === 0) return empty

  const gamePoints = games.reduce((s, r) => s + (r.points_awarded ?? 0), 0)
  const gameGraded = games.filter((r) => r.is_correct !== null).length
  const gameCorrect = games.filter((r) => r.is_correct === true).length

  const recordPoints = records.reduce((s, r) => s + (r.points_awarded ?? 0), 0)
  const recordGraded = records.filter((r) => r.is_correct !== null).length
  const recordCorrect = records.filter((r) => r.is_correct === true).length

  const standingsPoints = standings.reduce((s, r) => s + (r.points_awarded ?? 0), 0)

  return {
    totalPoints: gamePoints + recordPoints + standingsPoints,
    gamePoints,
    gameCorrect,
    gameGraded,
    recordPoints,
    recordCorrect,
    recordGraded,
    standingsPoints,
    hasAnyPredictions: true,
  }
}

export interface GamePickResult {
  gameId: string
  pickedTeamId: string
  isCorrect: boolean | null
  pointsAwarded: number
}

export async function getUserGamePickResults(
  userId: string,
  gameIds: string[]
): Promise<Record<string, GamePickResult>> {
  if (gameIds.length === 0) return {}

  const supabase = await createClient()

  const { data: predSet } = await supabase
    .from('prediction_sets')
    .select('id')
    .eq('user_id', userId)
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .maybeSingle()

  if (!predSet) return {}

  const { data: picks } = await supabase
    .from('predictions_game')
    .select('game_id, picked_team_id, is_correct, points_awarded')
    .eq('prediction_set_id', predSet.id)
    .in('game_id', gameIds)

  const map: Record<string, GamePickResult> = {}
  for (const p of picks ?? []) {
    map[p.game_id] = {
      gameId: p.game_id,
      pickedTeamId: p.picked_team_id,
      isCorrect: p.is_correct,
      pointsAwarded: p.points_awarded ?? 0,
    }
  }
  return map
}
