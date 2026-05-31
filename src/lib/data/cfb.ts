import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

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

  return data.map((conf) => ({
    id: conf.id,
    name: conf.name,
    abbreviation: conf.abbreviation,
    teams: ((conf.teams ?? []) as CfbTeam[]).sort((a, b) => a.name.localeCompare(b.name)),
  }))
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
       home_team:teams!games_home_team_id_fkey(id, name, abbreviation, mascot, logo_url),
       away_team:teams!games_away_team_id_fkey(id, name, abbreviation, mascot, logo_url)`
    )
    .eq('season', CURRENT_SEASON)
    .eq('week', week)
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
