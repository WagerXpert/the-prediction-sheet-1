import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { computeCFPRankings, type RankingInput, type TeamData, type TeamGameResult, type CFPRankedTeam } from '@/lib/cfp/rankings'
import { generateCFPField, type CFPSeed } from '@/lib/cfp/selection'

export type { CFPSeed, CFPRankedTeam }

export interface CFPBracket {
  id: string
  session_id: string
  season: number
  seedings: CFPSeed[]
  cfp_rankings: CFPRankedTeam[]
  is_customized: boolean
}

export interface CFPPick {
  bracket_id: string
  round: number
  game_index: number
  winner_team_id: string
}

export async function getCFPBracket(sessionId: string): Promise<CFPBracket | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cfp_brackets')
    .select('id, session_id, season, seedings, cfp_rankings, is_customized')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (!data) return null
  return { ...data, seedings: data.seedings as unknown as CFPSeed[], cfp_rankings: data.cfp_rankings as unknown as CFPRankedTeam[] }
}

export async function generateAndSaveCFPBracket(sessionId: string, season = CURRENT_SEASON): Promise<CFPBracket> {
  const supabase = await createClient()

  const { data: confRows } = await supabase
    .from('full_season_conferences')
    .select('conference_id, conference:conferences(id, name, abbreviation, teams(id, name, abbreviation, logo_url, color, conference_id))')
    .eq('session_id', sessionId)

  if (!confRows?.length) throw new Error('No conferences in session')

  const teams: TeamData[] = []
  for (const row of confRows) {
    const conf = row.conference as any
    for (const team of (conf.teams ?? []) as any[]) {
      teams.push({
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        logo_url: team.logo_url,
        color: team.color,
        conference_id: conf.id,
        conference_name: conf.name,
        conference_abbr: conf.abbreviation,
      })
    }
  }
  if (!teams.length) throw new Error('No teams found')

  const teamIds = teams.map(t => t.id)
  const { data: games } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, conference_game, status, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('season_type', 'regular')
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)

  if (!games?.length) throw new Error('No games found')

  const gameIds = games.map(g => g.id)
  const { data: preds } = await supabase
    .from('full_season_predictions')
    .select('game_id, winner_team_id')
    .eq('session_id', sessionId)
    .in('game_id', gameIds)

  const predMap = new Map((preds ?? []).map(p => [p.game_id, p.winner_team_id]))
  const teamSet = new Set(teamIds)
  const results: Record<string, TeamGameResult[]> = {}
  for (const t of teams) results[t.id] = []

  for (const g of games) {
    if (!g.home_team_id || !g.away_team_id) continue
    let winnerId: string | null = null
    if (g.status === 'completed' && g.home_team_points !== null && g.away_team_points !== null) {
      winnerId = g.home_team_points > g.away_team_points ? g.home_team_id : g.away_team_id
    } else {
      winnerId = predMap.get(g.id) ?? null
    }
    if (!winnerId) continue

    if (teamSet.has(g.home_team_id)) {
      results[g.home_team_id].push({
        game_id: g.id, opponent_id: g.away_team_id,
        won: winnerId === g.home_team_id, conference_game: g.conference_game,
      })
    }
    if (teamSet.has(g.away_team_id)) {
      results[g.away_team_id].push({
        game_id: g.id, opponent_id: g.home_team_id,
        won: winnerId === g.away_team_id, conference_game: g.conference_game,
      })
    }
  }

  const ranked = computeCFPRankings({ teams, results })
  const seedings = generateCFPField(ranked)

  const { data: saved } = await supabase
    .from('cfp_brackets')
    .upsert(
      { session_id: sessionId, season, seedings: seedings as unknown as import('../supabase/types').Json, cfp_rankings: ranked as unknown as import('../supabase/types').Json, is_customized: false, updated_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select('id, session_id, season, seedings, cfp_rankings, is_customized')
    .single()

  if (!saved) throw new Error('Failed to save bracket')
  return { ...saved, seedings: saved.seedings as unknown as CFPSeed[], cfp_rankings: saved.cfp_rankings as unknown as CFPRankedTeam[] }
}

export async function regenerateCFPBracket(sessionId: string): Promise<CFPBracket> {
  // Delete existing bracket (cascade deletes picks), then regenerate
  const supabase = await createClient()
  await supabase.from('cfp_brackets').delete().eq('session_id', sessionId)
  return generateAndSaveCFPBracket(sessionId)
}

export async function saveCFPBracketCustom(bracketId: string, seedings: CFPSeed[], rankings: CFPRankedTeam[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('cfp_brackets')
    .update({ seedings: seedings as unknown as import('../supabase/types').Json, cfp_rankings: rankings as unknown as import('../supabase/types').Json, is_customized: true, updated_at: new Date().toISOString() })
    .eq('id', bracketId)
}

export async function getCFPPicks(bracketId: string): Promise<CFPPick[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cfp_picks')
    .select('bracket_id, round, game_index, winner_team_id')
    .eq('bracket_id', bracketId)
  return (data ?? []) as unknown as CFPPick[]
}
