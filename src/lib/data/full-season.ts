import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getConferenceLogo } from '@/lib/data/cfb'

// ── Types ─────────────────────────────────────────────────────────

export interface FSSession {
  id: string
  user_id: string
  sport_id: string
  season: number
  name: string | null
}

export interface FSConferenceOption {
  id: string
  name: string
  abbreviation: string
  logo_url: string | null
  team_count: number
  tier: 'power' | 'g5' | 'independent' | 'other'
}

export interface FSTeamProgress {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  color: string | null
  games_total: number
  games_predicted: number
  predicted_wins: number
  predicted_losses: number
}

export interface FSDashboardConference {
  id: string
  name: string
  abbreviation: string
  logo_url: string | null
  teams: FSTeamProgress[]
}

export interface FSGame {
  id: string
  week: number
  game_date: string | null
  neutral_site: boolean
  conference_game: boolean
  season_type: string
  status: string
  home_team_points: number | null
  away_team_points: number | null
  home_team: { id: string; name: string; abbreviation: string | null; logo_url: string | null; color: string | null } | null
  away_team: { id: string; name: string; abbreviation: string | null; logo_url: string | null; color: string | null } | null
  winner_team_id: string | null
}

export interface FSStandingRow {
  team: { id: string; name: string; abbreviation: string | null; logo_url: string | null }
  conf_wins: number
  conf_losses: number
  conf_games: number
}

// ── Session helpers ───────────────────────────────────────────────

export async function getSession(userId: string, season = CURRENT_SEASON): Promise<FSSession | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('full_season_sessions')
    .select('id, user_id, sport_id, season, name')
    .eq('user_id', userId)
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export async function getOrCreateSession(userId: string, season = CURRENT_SEASON): Promise<FSSession | null> {
  const existing = await getSession(userId, season)
  if (existing) return existing

  const supabase = await createClient()
  const { data } = await supabase
    .from('full_season_sessions')
    .insert({ user_id: userId, sport_id: 'cfb', season })
    .select('id, user_id, sport_id, season, name')
    .single()
  return data ?? null
}

export async function getSessionConferenceIds(sessionId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('full_season_conferences')
    .select('conference_id')
    .eq('session_id', sessionId)
  return data?.map(r => r.conference_id) ?? []
}

export async function setSessionConferences(sessionId: string, conferenceIds: string[]): Promise<void> {
  const supabase = await createClient()
  await supabase.from('full_season_conferences').delete().eq('session_id', sessionId)
  if (conferenceIds.length > 0) {
    await supabase.from('full_season_conferences').insert(
      conferenceIds.map(conference_id => ({ session_id: sessionId, conference_id }))
    )
  }
}

// ── Setup: all conferences for the selection screen ───────────────

export async function getAllConferencesForSetup(): Promise<FSConferenceOption[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conferences')
    .select('id, name, abbreviation, teams(id)')
    .eq('sport_id', 'cfb')
    .order('name')

  if (!data) return []

  const { POWER_CONF_NAMES, G5_CONF_NAMES } = await import('@/lib/utils/constants')

  return data
    .filter(c => (c.teams as any[]).length > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      abbreviation: c.abbreviation,
      logo_url: getConferenceLogo(c.name),
      team_count: (c.teams as any[]).length,
      tier: POWER_CONF_NAMES.has(c.name)
        ? 'power'
        : G5_CONF_NAMES.has(c.name)
          ? 'g5'
          : c.name.toLowerCase().includes('independent')
            ? 'independent'
            : 'other',
    })) as FSConferenceOption[]
}

// ── Dashboard ─────────────────────────────────────────────────────

export async function getSessionDashboard(
  sessionId: string,
  season = CURRENT_SEASON
): Promise<FSDashboardConference[]> {
  const supabase = await createClient()

  const { data: confRows } = await supabase
    .from('full_season_conferences')
    .select(`
      conference_id,
      conference:conferences(
        id, name, abbreviation,
        teams(id, name, abbreviation, logo_url, color)
      )
    `)
    .eq('session_id', sessionId)

  if (!confRows?.length) return []

  // All picks for this session (need winner_team_id for W/L computation)
  const { data: picks } = await supabase
    .from('full_season_predictions')
    .select('game_id, winner_team_id')
    .eq('session_id', sessionId)
  const predictedIds = new Set(picks?.map(p => p.game_id) ?? [])
  const winnerByGame = new Map(picks?.map(p => [p.game_id, p.winner_team_id]) ?? [])

  // All regular season games — include status/points so completed games auto-count
  const { data: games } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, status, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('season_type', 'regular')

  const teamCount = new Map<string, { total: number; predicted: number; wins: number; losses: number }>()
  for (const g of games ?? []) {
    // Actual result beats prediction; fall back to user's pick for future games
    const isActual = g.status === 'completed' && g.home_team_points !== null && g.away_team_points !== null
    const effectiveWinnerId: string | null = isActual
      ? (g.home_team_points! > g.away_team_points! ? g.home_team_id : g.away_team_id)
      : (winnerByGame.get(g.id) ?? null)

    for (const tid of [g.home_team_id, g.away_team_id]) {
      if (!tid) continue
      const rec = teamCount.get(tid) ?? { total: 0, predicted: 0, wins: 0, losses: 0 }
      rec.total++
      if (effectiveWinnerId) {
        rec.predicted++
        if (tid === effectiveWinnerId) rec.wins++
        else rec.losses++
      }
      teamCount.set(tid, rec)
    }
  }

  return confRows
    .map(row => {
      const conf = row.conference as any
      const teams: FSTeamProgress[] = ((conf.teams ?? []) as any[])
        .map(t => ({
          id: t.id,
          name: t.name,
          abbreviation: t.abbreviation,
          logo_url: t.logo_url,
          color: t.color,
          games_total: teamCount.get(t.id)?.total ?? 0,
          games_predicted: teamCount.get(t.id)?.predicted ?? 0,
          predicted_wins: teamCount.get(t.id)?.wins ?? 0,
          predicted_losses: teamCount.get(t.id)?.losses ?? 0,
        }))
        .sort((a: FSTeamProgress, b: FSTeamProgress) => a.name.localeCompare(b.name))
      return {
        id: conf.id,
        name: conf.name,
        abbreviation: conf.abbreviation,
        logo_url: getConferenceLogo(conf.name),
        teams,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Session progress summary ──────────────────────────────────────

export async function getSessionProgress(sessionId: string, season = CURRENT_SEASON) {
  const supabase = await createClient()

  const { data: confRows } = await supabase
    .from('full_season_conferences')
    .select('conference_id, conference:conferences(teams(id))')
    .eq('session_id', sessionId)

  const teamIds = (confRows ?? []).flatMap(c => {
    const conf = c.conference as any
    return ((conf?.teams ?? []) as any[]).map((t: any) => t.id as string)
  })

  if (teamIds.length === 0) {
    return { conferences: 0, teams: 0, games_predicted: 0, games_total: 0 }
  }

  const [{ data: picksData }, { count: totalGames }] = await Promise.all([
    supabase
      .from('full_season_predictions')
      .select('game_id')
      .eq('session_id', sessionId),
    supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('sport_id', 'cfb')
      .eq('season', season)
      .eq('season_type', 'regular')
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`),
  ])

  // De-duplicate: a game between two conference teams only counts once
  const uniqueGameIds = new Set(picksData?.map(p => p.game_id) ?? [])

  return {
    conferences: confRows?.length ?? 0,
    teams: teamIds.length,
    games_predicted: uniqueGameIds.size,
    games_total: totalGames ?? 0,
  }
}

// ── Team schedule ─────────────────────────────────────────────────

export async function getTeamScheduleForSession(
  sessionId: string,
  teamId: string,
  season = CURRENT_SEASON
): Promise<FSGame[]> {
  const supabase = await createClient()

  const { data: games } = await supabase
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

  if (!games?.length) return []

  const gameIds = games.map(g => g.id)
  const { data: preds } = await supabase
    .from('full_season_predictions')
    .select('game_id, winner_team_id')
    .eq('session_id', sessionId)
    .in('game_id', gameIds)

  const predMap = new Map(preds?.map(p => [p.game_id, p.winner_team_id]) ?? [])

  return games.map(g => ({
    id: g.id,
    week: g.week as number,
    game_date: g.game_date,
    neutral_site: g.neutral_site,
    conference_game: g.conference_game,
    season_type: g.season_type as string,
    status: g.status,
    home_team_points: g.home_team_points,
    away_team_points: g.away_team_points,
    home_team: (g.home_team as any) ?? null,
    away_team: (g.away_team as any) ?? null,
    winner_team_id: predMap.get(g.id) ?? null,
  }))
}

// ── Conference standings data for the team page ───────────────────

export interface ConferenceGameRow {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  conference_game: boolean
  status: string
  home_team_points: number | null
  away_team_points: number | null
}

export interface ConferenceTeamRow {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
}

export async function getConferenceStandingsData(
  sessionId: string,
  conferenceId: string,
  season = CURRENT_SEASON
): Promise<{
  teams: ConferenceTeamRow[]
  games: ConferenceGameRow[]
  picks: Record<string, string>
}> {
  const supabase = await createClient()

  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, abbreviation, logo_url')
    .eq('sport_id', 'cfb')
    .eq('conference_id', conferenceId)

  const teams = (teamsData ?? []) as ConferenceTeamRow[]
  if (!teams.length) return { teams: [], games: [], picks: {} }

  const teamIds = teams.map(t => t.id)

  const { data: gamesData } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, conference_game, status, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('season_type', 'regular')
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)

  const games = (gamesData ?? []) as ConferenceGameRow[]
  const gameIds = games.map(g => g.id)

  const { data: picksData } = gameIds.length
    ? await supabase
        .from('full_season_predictions')
        .select('game_id, winner_team_id')
        .eq('session_id', sessionId)
        .in('game_id', gameIds)
    : { data: [] }

  const picks: Record<string, string> = {}
  for (const p of picksData ?? []) {
    picks[p.game_id] = p.winner_team_id
  }

  return { teams, games, picks }
}

// Flat map of teamId → predicted W-L for all teams in a session.
// Combines actual completed results + user picks for unplayed games.
export async function getSessionTeamRecords(
  sessionId: string,
  season = CURRENT_SEASON
): Promise<Record<string, { wins: number; losses: number }>> {
  const conferences = await getSessionDashboard(sessionId, season)
  const records: Record<string, { wins: number; losses: number }> = {}
  for (const conf of conferences) {
    for (const team of conf.teams) {
      records[team.id] = { wins: team.predicted_wins, losses: team.predicted_losses }
    }
  }
  return records
}

