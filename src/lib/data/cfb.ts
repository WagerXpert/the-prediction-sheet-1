import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

// Conference logos — verified ESPN CDN numeric IDs (screenshotted to confirm correct conference).
// Keys cover both CFBD short names (after sync) and seed full names (before sync).
const CONFERENCE_LOGO_MAP: Record<string, string> = {
  // CFBD short names (what the DB stores after the admin Teams sync runs)
  'SEC':               'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/8.png',
  'Big Ten':           'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/5.png',
  'Big 12':            'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/4.png',
  'ACC':               'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/acc.png',
  'American Athletic': 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/151.png',
  'Mountain West':     'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/17.png',
  'Sun Belt':          'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/37.png',
  'MAC':               'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/mac.png',
  'Mid-American':      'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/mac.png',
  'Conference USA':    'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/12.png',
  'Pac-12':            'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/9.png',
  'FBS Independents':  'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/18.png',
  'Independent':       'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/18.png',
  'Independents':      'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/18.png',
  // Seed full names (what the DB stores before the admin sync runs)
  'Southeastern Conference':      'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/8.png',
  'Big Ten Conference':           'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/5.png',
  'Big 12 Conference':            'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/4.png',
  'Atlantic Coast Conference':    'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/acc.png',
  'American Athletic Conference': 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/151.png',
  'Mountain West Conference':     'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/17.png',
  'Sun Belt Conference':          'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/37.png',
  'Mid-American Conference':      'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/mac.png',
  'Pac-12 Conference':            'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/9.png',
}

export function getConferenceLogo(name: string): string | null {
  return CONFERENCE_LOGO_MAP[name] ?? null
}

export interface CfbTeam {
  id: string
  name: string
  abbreviation: string | null
  mascot: string | null
  logo_url: string | null
}

export interface CfbConference {
  id: string
  name: string
  abbreviation: string
  logo_url: string | null
  teams: CfbTeam[]
}

export interface CfbGame {
  id: string
  week: number
  game_date: string | null
  neutral_site: boolean
  conference_game: boolean
  season_type: string
  status: string
  home_team: CfbTeam | null
  away_team: CfbTeam | null
}

export async function getCfbConferencesWithTeams(): Promise<CfbConference[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conferences')
    .select('id, name, abbreviation, teams(id, name, abbreviation, mascot, logo_url)')
    .eq('sport_id', 'cfb')
    .order('name')

  if (!data) return []

  return data
    .map((conf) => ({
      id: conf.id,
      name: conf.name,
      abbreviation: conf.abbreviation,
      logo_url: CONFERENCE_LOGO_MAP[conf.name] ?? null,
      teams: ((conf.teams ?? []) as CfbTeam[]).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((conf) => conf.teams.length > 0)
}

export async function getCfbConferenceById(id: string): Promise<CfbConference | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conferences')
    .select('id, name, abbreviation, teams(id, name, abbreviation, mascot, logo_url)')
    .eq('id', id)
    .single()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    abbreviation: data.abbreviation,
    logo_url: CONFERENCE_LOGO_MAP[data.name] ?? null,
    teams: ((data.teams ?? []) as CfbTeam[]).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export async function getCfbTeamById(id: string): Promise<CfbTeam | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('teams')
    .select('id, name, abbreviation, mascot, logo_url')
    .eq('id', id)
    .single()

  return data ?? null
}

export async function getCfbTeamSchedule(teamId: string): Promise<CfbGame[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('games')
    .select(
      `id, week, game_date, neutral_site, conference_game, season_type, status,
       home_team:teams!games_home_team_id_fkey(id, name, abbreviation, mascot, logo_url),
       away_team:teams!games_away_team_id_fkey(id, name, abbreviation, mascot, logo_url)`
    )
    .eq('season', CURRENT_SEASON)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('game_date')

  if (!data) return []

  return data.map((g) => ({
    id: g.id,
    week: g.week as number,
    game_date: g.game_date,
    neutral_site: g.neutral_site,
    conference_game: g.conference_game,
    season_type: g.season_type as string,
    status: g.status,
    home_team: (g.home_team as unknown as CfbTeam) ?? null,
    away_team: (g.away_team as unknown as CfbTeam) ?? null,
  }))
}

export async function getCfbGamesByWeek(week: number): Promise<CfbGame[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('games')
    .select(
      `id, week, game_date, neutral_site, conference_game, season_type, status,
       home_team:teams!games_home_team_id_fkey(id, name, abbreviation, mascot, logo_url, conference_id),
       away_team:teams!games_away_team_id_fkey(id, name, abbreviation, mascot, logo_url, conference_id)`
    )
    .eq('season', CURRENT_SEASON)
    .eq('week', week)
    .order('game_date')

  if (!data) return []

  type RawTeam = CfbTeam & { conference_id: string | null }

  return data
    .filter((g) => {
      const home = g.home_team as unknown as RawTeam | null
      const away = g.away_team as unknown as RawTeam | null
      return home?.conference_id != null && away?.conference_id != null
    })
    .map((g) => ({
      id: g.id,
      week: g.week as number,
      game_date: g.game_date,
      neutral_site: g.neutral_site,
      conference_game: g.conference_game,
      season_type: g.season_type as string,
      status: g.status,
      home_team: (g.home_team as unknown as CfbTeam) ?? null,
      away_team: (g.away_team as unknown as CfbTeam) ?? null,
    }))
}

export async function getCfbAvailableWeeks(): Promise<number[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('games')
    .select('week')
    .eq('season', CURRENT_SEASON)
    .not('week', 'is', null)
    .order('week')

  if (!data) return []

  return [...new Set(data.map((g) => g.week as number))].sort((a, b) => a - b)
}

// The open week is the earliest week that still has at least one non-completed game.
// All other weeks are locked (view-only). Returns null if all weeks are complete or no games exist.
export async function getOpenWeek(): Promise<number | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('games')
    .select('week')
    .eq('season', CURRENT_SEASON)
    .not('week', 'is', null)
    .neq('status', 'completed')
    .order('week')
    .limit(1)

  if (!data?.length) return null
  return data[0].week as number
}

// Returns actual W-L record for every team from completed games this season.
export async function getActualTeamRecords(
  season = CURRENT_SEASON
): Promise<Record<string, { wins: number; losses: number }>> {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('games')
    .select('home_team_id, away_team_id, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('status', 'completed')
    .not('home_team_points', 'is', null)
    .not('away_team_points', 'is', null)

  const records: Record<string, { wins: number; losses: number }> = {}
  for (const g of games ?? []) {
    if (!g.home_team_id || !g.away_team_id) continue
    const homeWon = (g.home_team_points ?? 0) > (g.away_team_points ?? 0)
    records[g.home_team_id] ??= { wins: 0, losses: 0 }
    records[g.away_team_id] ??= { wins: 0, losses: 0 }
    if (homeWon) { records[g.home_team_id].wins++; records[g.away_team_id].losses++ }
    else { records[g.home_team_id].losses++; records[g.away_team_id].wins++ }
  }
  return records
}

// Returns a Map of DB team_id → AP rank for the most recent week.
// Teams not in the top 25 are absent from the map.
export async function getLatestRankings(season = CURRENT_SEASON): Promise<Map<string, number>> {
  const supabase = await createClient()

  const { data: latestRow } = await (supabase as any)
    .from('rankings')
    .select('week')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('poll', 'AP Top 25')
    .order('week', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRow) return new Map()

  const { data: rows } = await (supabase as any)
    .from('rankings')
    .select('team_id, rank')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('week', latestRow.week)
    .eq('poll', 'AP Top 25')
    .not('team_id', 'is', null)

  if (!rows) return new Map()
  return new Map((rows as { team_id: string; rank: number }[]).map(r => [r.team_id, r.rank]))
}
