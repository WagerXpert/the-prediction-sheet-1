import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

// ── Types ─────────────────────────────────────────────────────────

export interface TTTeam {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  color: string | null
}

export interface TTConference {
  id: string
  name: string
  abbreviation: string
  teams: TTTeam[]
}

export interface TTGame {
  id: string
  week: number | null
  game_date: string | null
  neutral_site: boolean
  conference_game: boolean
  season_type: string
  status: string
  home_team_points: number | null
  away_team_points: number | null
  home_team: TTTeam | null
  away_team: TTTeam | null
  user_pick: string | null      // winner_team_id the user picked
  actual_winner: string | null  // winner from completed result
}

// ── Queries ───────────────────────────────────────────────────────

export async function getAllFBSConferencesWithTeams(): Promise<TTConference[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('conferences')
    .select('id, name, abbreviation, teams(id, name, abbreviation, logo_url, color)')
    .eq('sport_id', 'cfb')
    .order('name')
  return (data ?? [])
    .filter(c => (c.teams as any[]).length > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      abbreviation: c.abbreviation,
      teams: ((c.teams as any[]) as TTTeam[]).sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export async function getTeamTrackerSchedule(
  userId: string,
  teamId: string,
  season = CURRENT_SEASON
): Promise<TTGame[]> {
  const supabase = await createClient()

  const [gamesRes, picksRes] = await Promise.all([
    supabase
      .from('games')
      .select(`
        id, week, game_date, neutral_site, conference_game, season_type,
        status, home_team_points, away_team_points,
        home_team:teams!games_home_team_id_fkey(id, name, abbreviation, logo_url, color),
        away_team:teams!games_away_team_id_fkey(id, name, abbreviation, logo_url, color)
      `)
      .eq('sport_id', 'cfb')
      .eq('season', season)
      .eq('season_type', 'regular')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('week')
      .order('game_date'),
    supabase
      .from('team_tracker_picks')
      .select('game_id, winner_team_id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('season', season),
  ])

  const pickMap = new Map((picksRes.data ?? []).map(p => [p.game_id, p.winner_team_id]))

  return (gamesRes.data ?? []).map(g => {
    const homePoints = g.home_team_points as number | null
    const awayPoints = g.away_team_points as number | null
    const ht = g.home_team as TTTeam | null
    const at = g.away_team as TTTeam | null

    const actualWinner =
      g.status === 'completed' && homePoints !== null && awayPoints !== null
        ? homePoints > awayPoints
          ? ht?.id ?? null
          : at?.id ?? null
        : null

    return {
      id: g.id,
      week: g.week,
      game_date: g.game_date,
      neutral_site: g.neutral_site,
      conference_game: g.conference_game,
      season_type: g.season_type,
      status: g.status,
      home_team_points: homePoints,
      away_team_points: awayPoints,
      home_team: ht,
      away_team: at,
      user_pick: pickMap.get(g.id) ?? null,
      actual_winner: actualWinner,
    }
  })
}
