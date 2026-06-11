import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { computeCFPRankings, type TeamData, type TeamGameResult, type CFPRankedTeam } from '@/lib/cfp/rankings'
import { generateCFPField, type CFPSeed } from '@/lib/cfp/selection'
import { getTeamRating, DEFAULT_RATING } from '@/lib/cfp/team-ratings'
import { simulateGame } from '@/lib/cfp/simulation'
import type { Json } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────────

export type { CFPSeed, CFPRankedTeam }

export interface PlayoffBracket {
  id: string
  user_id: string
  season: number
  seedings: CFPSeed[]
  setup_mode: 'sim' | 'manual'
  sim_seed: string
}

export interface PlayoffPick {
  bracket_id: string
  round: number
  game_index: number
  winner_team_id: string
}

// A lightweight team summary for the manual team-picker
export interface PlayoffTeamOption {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  color: string | null
  conf_name: string
  conf_abbr: string
  sim_wins: number
  sim_losses: number
  conf_wins: number
  conf_losses: number
  preseason_rating: number
}

// ── Bracket read/write ─────────────────────────────────────────────

export async function getPlayoffBracket(userId: string, season = CURRENT_SEASON): Promise<PlayoffBracket | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('standalone_playoff_brackets')
    .select('id, user_id, season, seedings, setup_mode, sim_seed')
    .eq('user_id', userId)
    .eq('season', season)
    .maybeSingle()
  if (!data) return null
  return {
    ...data,
    setup_mode: data.setup_mode as 'sim' | 'manual',
    seedings: data.seedings as unknown as CFPSeed[],
  }
}

export async function getPlayoffPicks(bracketId: string): Promise<PlayoffPick[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('standalone_playoff_picks')
    .select('bracket_id, round, game_index, winner_team_id')
    .eq('bracket_id', bracketId)
  return (data ?? []) as unknown as PlayoffPick[]
}

export async function savePlayoffPick(bracketId: string, round: number, gameIndex: number, winnerTeamId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('standalone_playoff_picks')
    .upsert(
      { bracket_id: bracketId, round, game_index: gameIndex, winner_team_id: winnerTeamId, updated_at: new Date().toISOString() },
      { onConflict: 'bracket_id,round,game_index' }
    )
}

export async function clearPlayoffPicks(bracketId: string, keys: string[]): Promise<void> {
  if (!keys.length) return
  const supabase = await createClient()
  for (const key of keys) {
    const [round, gi] = key.split('-').map(Number)
    await supabase
      .from('standalone_playoff_picks')
      .delete()
      .eq('bracket_id', bracketId)
      .eq('round', round)
      .eq('game_index', gi)
  }
}

export async function resetPlayoffBracket(userId: string, season = CURRENT_SEASON): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('standalone_playoff_brackets')
    .delete()
    .eq('user_id', userId)
    .eq('season', season)
}

// ── Simulation engine ─────────────────────────────────────────────
// Runs a complete FBS season simulation using actual results + team ratings,
// then generates the 12-team CFP field. No user picks involved.

function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

interface SimResult {
  seedings: CFPSeed[]
  rankings: CFPRankedTeam[]
  simSeed: string
  teamOptions: PlayoffTeamOption[]
}

async function runFullSeasonSim(simSeed: string, season: number): Promise<SimResult> {
  const supabase = await createClient()

  const [confsRes, gamesRes] = await Promise.all([
    supabase
      .from('conferences')
      .select('id, name, abbreviation, teams(id, name, abbreviation, logo_url, color, conference_id)')
      .eq('sport_id', 'cfb'),
    supabase
      .from('games')
      .select('id, home_team_id, away_team_id, conference_game, neutral_site, status, home_team_points, away_team_points')
      .eq('sport_id', 'cfb')
      .eq('season', season)
      .eq('season_type', 'regular'),
  ])

  const teams: TeamData[] = []
  const teamById = new Map<string, TeamData>()
  const ratingByTeamId = new Map<string, number>()

  for (const conf of confsRes.data ?? []) {
    for (const t of (conf.teams as any[]) ?? []) {
      const td: TeamData = {
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
        logo_url: t.logo_url,
        color: t.color,
        conference_id: conf.id,
        conference_name: conf.name,
        conference_abbr: conf.abbreviation,
      }
      teams.push(td)
      teamById.set(t.id, td)
      ratingByTeamId.set(t.id, getTeamRating(t.name))
    }
  }

  // Blend preseason ratings with actual in-season performance (same logic as full-season mode)
  {
    const wins = new Map<string, number>()
    const losses = new Map<string, number>()
    for (const g of gamesRes.data ?? []) {
      if (g.status !== 'completed' || g.home_team_points === null || g.away_team_points === null) continue
      if (!g.home_team_id || !g.away_team_id) continue
      const homeWon = (g.home_team_points as number) > (g.away_team_points as number)
      wins.set(g.home_team_id, (wins.get(g.home_team_id) ?? 0) + (homeWon ? 1 : 0))
      losses.set(g.home_team_id, (losses.get(g.home_team_id) ?? 0) + (homeWon ? 0 : 1))
      wins.set(g.away_team_id, (wins.get(g.away_team_id) ?? 0) + (homeWon ? 0 : 1))
      losses.set(g.away_team_id, (losses.get(g.away_team_id) ?? 0) + (homeWon ? 1 : 0))
    }
    for (const [id, preseason] of ratingByTeamId) {
      const w = wins.get(id) ?? 0
      const l = losses.get(id) ?? 0
      const n = w + l
      if (n < 2) continue
      const winPct = w / n
      const perfRating = 30 + winPct * 65
      const blendW = Math.min(n, 10) / 25
      ratingByTeamId.set(id, Math.max(30, Math.min(99, Math.round(preseason * (1 - blendW) + perfRating * blendW))))
    }
  }

  // Resolve each game: actual result → simulation
  const effectiveWinners = new Map<string, string>()
  for (const g of gamesRes.data ?? []) {
    const { id, home_team_id, away_team_id, status, home_team_points, away_team_points, neutral_site } = g
    if (status === 'completed' && home_team_points !== null && away_team_points !== null && home_team_id && away_team_id) {
      effectiveWinners.set(id, (home_team_points as number) > (away_team_points as number) ? home_team_id : away_team_id)
    } else if (home_team_id && away_team_id) {
      const homeR = ratingByTeamId.get(home_team_id) ?? DEFAULT_RATING
      const awayR = ratingByTeamId.get(away_team_id) ?? DEFAULT_RATING
      effectiveWinners.set(id, simulateGame(simSeed, id, home_team_id, away_team_id, homeR, awayR, neutral_site ?? false))
    }
  }

  // Build per-team results for the ranking algorithm
  const results: Record<string, TeamGameResult[]> = {}
  for (const t of teams) results[t.id] = []

  for (const g of gamesRes.data ?? []) {
    const wid = effectiveWinners.get(g.id)
    if (!wid || !g.home_team_id || !g.away_team_id) continue
    for (const [tid, oid] of [
      [g.home_team_id, g.away_team_id],
      [g.away_team_id, g.home_team_id],
    ] as [string, string][]) {
      if (!results[tid]) continue
      results[tid].push({
        game_id: g.id,
        opponent_id: oid,
        won: wid === tid,
        conference_game: g.conference_game,
      })
    }
  }

  const rankings = computeCFPRankings({ teams, results })
  const seedings = generateCFPField(rankings)

  // Build team options for manual picker (all FBS teams with sim records)
  const teamOptions: PlayoffTeamOption[] = rankings.map(r => ({
    id: r.team_id,
    name: r.team_name,
    abbreviation: r.team_abbr,
    logo_url: r.team_logo,
    color: r.team_color,
    conf_name: r.conf_name,
    conf_abbr: r.conf_abbr,
    sim_wins: r.overall_wins,
    sim_losses: r.overall_losses,
    conf_wins: r.conf_wins,
    conf_losses: r.conf_losses,
    preseason_rating: getTeamRating(r.team_name),
  }))

  return { seedings, rankings, simSeed, teamOptions }
}

// ── Create / regenerate bracket (sim mode) ────────────────────────

export async function createOrRegenerateSimBracket(userId: string, season = CURRENT_SEASON): Promise<PlayoffBracket> {
  const supabase = await createClient()
  const simSeed = randomSeed()
  const { seedings, rankings } = await runFullSeasonSim(simSeed, season)

  const { data } = await supabase
    .from('standalone_playoff_brackets')
    .upsert(
      {
        user_id: userId,
        season,
        seedings: seedings as unknown as Json,
        setup_mode: 'sim',
        sim_seed: simSeed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,season' }
    )
    .select('id, user_id, season, seedings, setup_mode, sim_seed')
    .single()

  if (!data) throw new Error('Failed to create playoff bracket')

  // Clear any existing picks when regenerating
  await supabase
    .from('standalone_playoff_picks')
    .delete()
    .eq('bracket_id', data.id)

  return {
    ...data,
    setup_mode: 'sim',
    seedings,
  }
}

// ── Create bracket (manual mode — user picks teams) ───────────────
// selectedTeamIds: ordered list of 12 team IDs (index 0 = seed 1)

export async function createManualBracket(
  userId: string,
  selectedTeamIds: string[],
  season = CURRENT_SEASON
): Promise<PlayoffBracket> {
  const supabase = await createClient()

  // Run a sim to get team records for display, then override the field with user's selection
  const simSeed = randomSeed()
  const { rankings } = await runFullSeasonSim(simSeed, season)

  const rankMap = new Map(rankings.map(r => [r.team_id, r]))

  // Build seedings from the user's ordered selection
  const seedings: CFPSeed[] = selectedTeamIds.slice(0, 12).map((teamId, i) => {
    const seed = i + 1
    const r = rankMap.get(teamId)
    return {
      seed,
      team_id: teamId,
      team_name: r?.team_name ?? teamId,
      team_abbr: r?.team_abbr ?? null,
      team_logo: r?.team_logo ?? null,
      team_color: r?.team_color ?? null,
      conf_name: r?.conf_name ?? '',
      conf_abbr: r?.conf_abbr ?? '',
      is_auto_bid: true,
      is_bye: seed <= 4,
      overall_wins: r?.overall_wins ?? 0,
      overall_losses: r?.overall_losses ?? 0,
      conf_wins: r?.conf_wins ?? 0,
      conf_losses: r?.conf_losses ?? 0,
      cfp_rank: r?.rank ?? seed,
    }
  })

  const { data } = await supabase
    .from('standalone_playoff_brackets')
    .upsert(
      {
        user_id: userId,
        season,
        seedings: seedings as unknown as Json,
        setup_mode: 'manual',
        sim_seed: simSeed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,season' }
    )
    .select('id, user_id, season, seedings, setup_mode, sim_seed')
    .single()

  if (!data) throw new Error('Failed to create playoff bracket')

  await supabase.from('standalone_playoff_picks').delete().eq('bracket_id', data.id)

  return { ...data, setup_mode: 'manual', seedings }
}

// ── Update seedings (reorder within bracket) ──────────────────────

export async function updatePlayoffSeedings(bracketId: string, seedings: CFPSeed[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('standalone_playoff_brackets')
    .update({ seedings: seedings as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', bracketId)
}

// ── Team options for manual picker ───────────────────────────────
// Fast direct-DB query — does NOT run the full sim. Sorted by actual wins,
// then preseason rating as tiebreaker (so best teams appear first even early
// in the season when most records are 0-0).

export async function getPlayoffTeamOptions(season = CURRENT_SEASON): Promise<PlayoffTeamOption[]> {
  const supabase = await createClient()

  const [{ data: teams }, { data: games }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, abbreviation, logo_url, color, conference_id, conferences(name, abbreviation)')
      .eq('sport_id', 'cfb')
      .not('conference_id', 'is', null),
    supabase
      .from('games')
      .select('home_team_id, away_team_id, home_team_points, away_team_points, conference_game')
      .eq('sport_id', 'cfb')
      .eq('season', season)
      .eq('season_type', 'regular')
      .eq('status', 'completed'),
  ])

  const wins = new Map<string, number>()
  const losses = new Map<string, number>()
  const cWins = new Map<string, number>()
  const cLosses = new Map<string, number>()

  for (const g of games ?? []) {
    const { home_team_id: h, away_team_id: a, home_team_points: hp, away_team_points: ap, conference_game: cg } = g
    if (!h || !a || hp == null || ap == null) continue
    const homeWon = (hp as number) > (ap as number)
    const wid = homeWon ? h : a
    const lid = homeWon ? a : h
    wins.set(wid, (wins.get(wid) ?? 0) + 1)
    losses.set(lid, (losses.get(lid) ?? 0) + 1)
    if (cg) {
      cWins.set(wid, (cWins.get(wid) ?? 0) + 1)
      cLosses.set(lid, (cLosses.get(lid) ?? 0) + 1)
    }
  }

  return (teams ?? [])
    .map(t => {
      const conf = t.conferences as any
      const rating = getTeamRating(t.name)
      return {
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
        logo_url: t.logo_url,
        color: t.color,
        conf_name: conf?.name ?? '',
        conf_abbr: conf?.abbreviation ?? '',
        sim_wins: wins.get(t.id) ?? 0,
        sim_losses: losses.get(t.id) ?? 0,
        conf_wins: cWins.get(t.id) ?? 0,
        conf_losses: cLosses.get(t.id) ?? 0,
        preseason_rating: rating,
      }
    })
    .sort((a, b) => {
      if (b.sim_wins !== a.sim_wins) return b.sim_wins - a.sim_wins
      if (a.sim_losses !== b.sim_losses) return a.sim_losses - b.sim_losses
      return b.preseason_rating - a.preseason_rating
    })
}
