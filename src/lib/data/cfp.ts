import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getConferenceLogo } from '@/lib/data/cfb'
import { computeCFPRankings, type TeamData, type TeamGameResult, type CFPRankedTeam } from '@/lib/cfp/rankings'
import { generateCFPField, type CFPSeed } from '@/lib/cfp/selection'
import { getTeamRating, DEFAULT_RATING } from '@/lib/cfp/team-ratings'
import { simulateGame } from '@/lib/cfp/simulation'
import type { Json } from '@/lib/supabase/types'

export type { CFPSeed, CFPRankedTeam }

// ── Types ─────────────────────────────────────────────────────────

export interface CFPBracket {
  id: string
  session_id: string
  season: number
  seedings: CFPSeed[]
  cfp_rankings: CFPRankedTeam[]
  is_customized: boolean
  sim_seed: string
}

export interface CFPPick {
  bracket_id: string
  round: number
  game_index: number
  winner_team_id: string
}

export interface CFPConfChampGame {
  id: string
  bracket_id: string
  conference_id: string
  conference_name: string
  conference_abbr: string
  conference_logo: string | null
  team_a_id: string | null
  team_b_id: string | null
  team_a_name: string
  team_b_name: string
  team_a_abbr: string | null
  team_b_abbr: string | null
  team_a_logo: string | null
  team_b_logo: string | null
  team_a_color: string | null
  team_b_color: string | null
  team_a_wins: number
  team_a_losses: number
  team_b_wins: number
  team_b_losses: number
  team_a_conf_wins: number
  team_a_conf_losses: number
  team_b_conf_wins: number
  team_b_conf_losses: number
  winner_team_id: string | null
}

// ── Bracket read/write ────────────────────────────────────────────

export async function getCFPBracket(sessionId: string): Promise<CFPBracket | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cfp_brackets')
    .select('id, session_id, season, seedings, cfp_rankings, is_customized, sim_seed')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (!data) return null
  return {
    ...data,
    sim_seed: (data as any).sim_seed ?? '',
    seedings: data.seedings as unknown as CFPSeed[],
    cfp_rankings: data.cfp_rankings as unknown as CFPRankedTeam[],
  }
}

function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function createEmptyBracket(sessionId: string, season: number): Promise<CFPBracket> {
  const supabase = await createClient()
  const sim_seed = randomSeed()
  const { data } = await supabase
    .from('cfp_brackets')
    .insert({ session_id: sessionId, season, seedings: [] as unknown as Json, cfp_rankings: [] as unknown as Json, is_customized: false, sim_seed })
    .select('id, session_id, season, seedings, cfp_rankings, is_customized, sim_seed')
    .single()
  if (!data) throw new Error('Failed to create bracket')
  return { ...data, sim_seed: (data as any).sim_seed ?? sim_seed, seedings: [], cfp_rankings: [] }
}

// ── Conference championship game helpers ──────────────────────────

export async function getConfChampGames(bracketId: string): Promise<CFPConfChampGame[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cfp_conf_champ_games')
    .select('*')
    .eq('bracket_id', bracketId)
    .order('conference_name')
  return (data ?? []).map(row => ({
    ...(row as any),
    conference_logo: getConferenceLogo(row.conference_name),
  })) as CFPConfChampGame[]
}

export async function saveConfChampPick(gameId: string, winnerTeamId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('cfp_conf_champ_games')
    .update({ winner_team_id: winnerTeamId, updated_at: new Date().toISOString() })
    .eq('id', gameId)
}

// ── All-FBS data fetcher (shared between conf champ gen and ranking) ─

interface AllFBSData {
  teams: TeamData[]
  teamById: Map<string, TeamData & { logo_url: string | null; color: string | null; abbreviation: string | null }>
  teamsByConf: Map<string, string[]>    // confId → teamIds
  ratingByTeamId: Map<string, number>  // teamId → 0-100 rating
  games: Array<{
    id: string
    home_team_id: string | null
    away_team_id: string | null
    conference_game: boolean
    neutral_site: boolean
    status: string
    home_team_points: number | null
    away_team_points: number | null
  }>
  predMap: Map<string, string>           // gameId → winner_team_id
  getEffectiveWinner: (gameId: string, homeId: string | null, awayId: string | null, status: string, homePoints: number | null, awayPoints: number | null, neutralSite?: boolean) => string | null
}

async function fetchAllFBSData(sessionId: string, season: number, simSeed: string): Promise<AllFBSData> {
  const supabase = await createClient()

  const [confsRes, gamesRes, predsRes] = await Promise.all([
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
    supabase
      .from('full_season_predictions')
      .select('game_id, winner_team_id')
      .eq('session_id', sessionId),
  ])

  const teams: TeamData[] = []
  const teamById = new Map<string, TeamData & { logo_url: string | null; color: string | null; abbreviation: string | null }>()
  const teamsByConf = new Map<string, string[]>()

  for (const conf of confsRes.data ?? []) {
    const list: string[] = []
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
      teamById.set(t.id, { ...td, logo_url: t.logo_url, color: t.color, abbreviation: t.abbreviation })
      list.push(t.id)
    }
    teamsByConf.set(conf.id, list)
  }

  const predMap = new Map((predsRes.data ?? []).map(p => [p.game_id, p.winner_team_id]))

  // Build rating lookup: team ID → 0-100 preseason power rating
  const ratingByTeamId = new Map<string, number>()
  for (const [id, team] of teamById) {
    ratingByTeamId.set(id, getTeamRating(team.name))
  }

  // Blend preseason ratings with actual in-season performance.
  // As more real games are played, a team's actual win% shifts their
  // effective simulation rating — a 12-0 team beats their preseason floor;
  // a highly-rated team going 2-6 gets dialed down.
  {
    const wins = new Map<string, number>()
    const losses = new Map<string, number>()
    for (const g of gamesRes.data ?? []) {
      if (g.status !== 'completed' || g.home_team_points === null || g.away_team_points === null) continue
      if (!g.home_team_id || !g.away_team_id) continue
      const homeWon = (g.home_team_points as number) > (g.away_team_points as number)
      wins.set(g.home_team_id,  (wins.get(g.home_team_id)  ?? 0) + (homeWon ? 1 : 0))
      losses.set(g.home_team_id,(losses.get(g.home_team_id)?? 0) + (homeWon ? 0 : 1))
      wins.set(g.away_team_id,  (wins.get(g.away_team_id)  ?? 0) + (homeWon ? 0 : 1))
      losses.set(g.away_team_id,(losses.get(g.away_team_id)?? 0) + (homeWon ? 1 : 0))
    }
    for (const [id, preseason] of ratingByTeamId) {
      const w = wins.get(id) ?? 0
      const l = losses.get(id) ?? 0
      const n = w + l
      if (n < 2) continue  // not enough games to meaningfully adjust
      const winPct = w / n
      // 0% → 30, 50% → 62.5, 100% → 95
      const perfRating = 30 + winPct * 65
      // Blend weight grows to max 40% at 10+ games (preseason always ≥60%)
      const blendW = Math.min(n, 10) / 25
      ratingByTeamId.set(id, Math.max(30, Math.min(99, Math.round(preseason * (1 - blendW) + perfRating * blendW))))
    }
  }

  // Priority: actual result > user pick > simulation
  function getEffectiveWinner(
    gameId: string,
    homeId: string | null,
    awayId: string | null,
    status: string,
    homePoints: number | null,
    awayPoints: number | null,
    neutralSite = false,
  ): string | null {
    // 1. Actual completed result
    if (status === 'completed' && homePoints !== null && awayPoints !== null && homeId && awayId) {
      return homePoints > awayPoints ? homeId : awayId
    }
    // 2. User's manual prediction
    const userPick = predMap.get(gameId)
    if (userPick) return userPick
    // 3. Simulate using team ratings (deterministic per session + game)
    if (!homeId || !awayId) return null
    const homeRating = ratingByTeamId.get(homeId) ?? DEFAULT_RATING
    const awayRating = ratingByTeamId.get(awayId) ?? DEFAULT_RATING
    return simulateGame(simSeed, gameId, homeId, awayId, homeRating, awayRating, neutralSite)
  }

  return {
    teams,
    teamById,
    teamsByConf,
    ratingByTeamId,
    games: (gamesRes.data ?? []) as AllFBSData['games'],
    predMap,
    getEffectiveWinner,
  }
}

// ── Generate conference championship matchups ─────────────────────
// Only generates games for conferences that have prediction data.
// Uses all-FBS game data so changes to predictions automatically reflect.

async function generateConfChampionshipGames(
  bracketId: string,
  data: AllFBSData,
  selectedConfIds: Set<string>
): Promise<CFPConfChampGame[]> {
  const supabase = await createClient()

  // For each game, resolve the effective winner (actual > user pick > simulation)
  const effectiveWinners = new Map<string, string>()
  for (const g of data.games) {
    const w = data.getEffectiveWinner(g.id, g.home_team_id, g.away_team_id, g.status, g.home_team_points, g.away_team_points, g.neutral_site)
    if (w) effectiveWinners.set(g.id, w)
  }

  // Build per-team record from all games
  const overallRec = new Map<string, { w: number; l: number }>()
  const confRec = new Map<string, { w: number; l: number }>()
  for (const t of data.teams) {
    overallRec.set(t.id, { w: 0, l: 0 })
    confRec.set(t.id, { w: 0, l: 0 })
  }
  for (const g of data.games) {
    const wid = effectiveWinners.get(g.id)
    if (!wid || !g.home_team_id || !g.away_team_id) continue
    for (const [tid, oid] of [[g.home_team_id, g.away_team_id], [g.away_team_id, g.home_team_id]] as [string, string][]) {
      if (!overallRec.has(tid)) continue
      const won = wid === tid
      const ov = overallRec.get(tid)!
      won ? ov.w++ : ov.l++
      if (g.conference_game) {
        const cf = confRec.get(tid)!
        won ? cf.w++ : cf.l++
      }
    }
  }

  // Determine which conferences have enough data to generate a matchup
  const inserts: any[] = []
  for (const [confId, teamIds] of data.teamsByConf) {
    if (!selectedConfIds.has(confId)) continue
    if (teamIds.length < 2) continue
    const conf = data.teams.find(t => t.conference_id === confId)
    if (!conf) continue

    // Only generate if teams in this conf have at least some game data
    const teamsWithData = teamIds.filter(id => {
      const ov = overallRec.get(id)
      return ov && (ov.w + ov.l) > 0
    })
    if (teamsWithData.length < 2) continue

    // Sort by conf record, tiebreak overall
    const sorted = teamIds
      .filter(id => overallRec.has(id))
      .sort((a, b) => {
        const ca = confRec.get(a)!
        const cb = confRec.get(b)!
        const ctA = ca.w + ca.l
        const ctB = cb.w + cb.l
        const cpA = ctA > 0 ? ca.w / ctA : 0
        const cpB = ctB > 0 ? cb.w / ctB : 0
        if (cpB !== cpA) return cpB - cpA
        const oa = overallRec.get(a)!
        const ob = overallRec.get(b)!
        const ovA = oa.w + oa.l > 0 ? oa.w / (oa.w + oa.l) : 0
        const ovB = ob.w + ob.l > 0 ? ob.w / (ob.w + ob.l) : 0
        return ovB - ovA
      })

    if (sorted.length < 2) continue
    const [aId, bId] = sorted
    const tA = data.teamById.get(aId)!
    const tB = data.teamById.get(bId)!
    const recA = overallRec.get(aId)!
    const recB = overallRec.get(bId)!
    const cA = confRec.get(aId)!
    const cB = confRec.get(bId)!

    inserts.push({
      bracket_id: bracketId,
      conference_id: confId,
      conference_name: conf.conference_name,
      conference_abbr: conf.conference_abbr,
      team_a_id: aId,
      team_b_id: bId,
      team_a_name: tA.name,
      team_b_name: tB.name,
      team_a_abbr: tA.abbreviation,
      team_b_abbr: tB.abbreviation,
      team_a_logo: tA.logo_url,
      team_b_logo: tB.logo_url,
      team_a_color: tA.color,
      team_b_color: tB.color,
      team_a_wins: recA.w,
      team_a_losses: recA.l,
      team_b_wins: recB.w,
      team_b_losses: recB.l,
      team_a_conf_wins: cA.w,
      team_a_conf_losses: cA.l,
      team_b_conf_wins: cB.w,
      team_b_conf_losses: cB.l,
    })
  }

  if (!inserts.length) return []

  const { data: saved } = await supabase
    .from('cfp_conf_champ_games')
    .upsert(inserts, { onConflict: 'bracket_id,conference_id' })
    .select('*')

  return ((saved ?? []) as any[]).map(row => ({
    ...row,
    conference_logo: getConferenceLogo(row.conference_name),
  })) as CFPConfChampGame[]
}

// ── Init CFP session ──────────────────────────────────────────────
// Creates bracket + generates conf championship games.
// Safe to call multiple times — idempotent.

export async function initCFPSession(sessionId: string, season = CURRENT_SEASON): Promise<{
  bracket: CFPBracket
  confChampGames: CFPConfChampGame[]
}> {
  // Get or create bracket
  let bracket = await getCFPBracket(sessionId)
  if (!bracket) {
    bracket = await createEmptyBracket(sessionId, season)
  }

  // Get existing conf champ games
  const existing = await getConfChampGames(bracket.id)
  if (existing.length > 0) {
    return { bracket, confChampGames: existing }
  }

  // Fetch user's selected conferences
  const supabaseForConfs = await createClient()
  const { data: confRows } = await supabaseForConfs
    .from('full_season_conferences')
    .select('conference_id')
    .eq('session_id', sessionId)
  const selectedConfIds = new Set((confRows ?? []).map(r => r.conference_id))

  // Generate conf champ games only for selected conferences
  const allData = await fetchAllFBSData(sessionId, season, bracket.sim_seed || sessionId)
  const confChampGames = await generateConfChampionshipGames(bracket.id, allData, selectedConfIds)
  return { bracket, confChampGames }
}

// ── Compute and save bracket seedings ────────────────────────────
// Runs after all conf champ games are picked.
// Uses ALL FBS teams + conference champ results for realistic rankings.

export async function computeAndSaveBracketSeedings(sessionId: string, season = CURRENT_SEASON, newSimSeed?: string): Promise<CFPBracket> {
  const supabase = await createClient()

  const bracket = await getCFPBracket(sessionId)
  if (!bracket) throw new Error('No bracket found')

  // Use a new seed if provided (regenerate), otherwise keep the existing one
  const simSeed = newSimSeed ?? (bracket.sim_seed || sessionId)

  // Fetch all data
  const allData = await fetchAllFBSData(sessionId, season, simSeed)

  // Fetch conf champ game picks
  const { data: champRows } = await supabase
    .from('cfp_conf_champ_games')
    .select('team_a_id, team_b_id, winner_team_id, conference_id')
    .eq('bracket_id', bracket.id)
    .not('winner_team_id', 'is', null)

  // Resolve effective winners for regular season (actual > user pick > simulation)
  const effectiveWinners = new Map<string, string>()
  for (const g of allData.games) {
    const w = allData.getEffectiveWinner(g.id, g.home_team_id, g.away_team_id, g.status, g.home_team_points, g.away_team_points, g.neutral_site)
    if (w) effectiveWinners.set(g.id, w)
  }

  // Build results from regular season
  const results: Record<string, TeamGameResult[]> = {}
  for (const t of allData.teams) results[t.id] = []

  for (const g of allData.games) {
    const wid = effectiveWinners.get(g.id)
    if (!wid || !g.home_team_id || !g.away_team_id) continue
    for (const [tid, oid] of [[g.home_team_id, g.away_team_id], [g.away_team_id, g.home_team_id]] as [string, string][]) {
      if (!results[tid]) continue
      results[tid].push({
        game_id: g.id,
        opponent_id: oid,
        won: wid === tid,
        conference_game: g.conference_game,
      })
    }
  }

  // Add conference championship game results
  for (const cg of champRows ?? []) {
    if (!cg.team_a_id || !cg.team_b_id || !cg.winner_team_id) continue
    const aWon = cg.winner_team_id === cg.team_a_id
    const gameKey = `conf-champ-${cg.conference_id}`
    if (results[cg.team_a_id]) {
      results[cg.team_a_id].push({ game_id: gameKey, opponent_id: cg.team_b_id, won: aWon, conference_game: true })
    }
    if (results[cg.team_b_id]) {
      results[cg.team_b_id].push({ game_id: gameKey, opponent_id: cg.team_a_id, won: !aWon, conference_game: true })
    }
  }

  const ranked = computeCFPRankings({ teams: allData.teams, results })
  const seedings = generateCFPField(ranked)

  const { data: saved } = await supabase
    .from('cfp_brackets')
    .update({
      seedings: seedings as unknown as Json,
      cfp_rankings: ranked as unknown as Json,
      is_customized: false,
      sim_seed: simSeed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bracket.id)
    .select('id, session_id, season, seedings, cfp_rankings, is_customized, sim_seed')
    .single()

  if (!saved) throw new Error('Failed to save seedings')
  return {
    ...saved,
    sim_seed: (saved as any).sim_seed ?? simSeed,
    seedings: saved.seedings as unknown as CFPSeed[],
    cfp_rankings: saved.cfp_rankings as unknown as CFPRankedTeam[],
  }
}

// ── Custom rankings save ──────────────────────────────────────────

export async function saveCFPBracketCustom(bracketId: string, seedings: CFPSeed[], rankings: CFPRankedTeam[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('cfp_brackets')
    .update({
      seedings: seedings as unknown as Json,
      cfp_rankings: rankings as unknown as Json,
      is_customized: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bracketId)
}

// ── Picks ─────────────────────────────────────────────────────────

export async function getCFPPicks(bracketId: string): Promise<CFPPick[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cfp_picks')
    .select('bracket_id, round, game_index, winner_team_id')
    .eq('bracket_id', bracketId)
  return (data ?? []) as unknown as CFPPick[]
}

// ── Reset everything ──────────────────────────────────────────────

export async function resetCFPSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  // Cascade deletes conf champ games and picks
  await supabase.from('cfp_brackets').delete().eq('session_id', sessionId)
}
