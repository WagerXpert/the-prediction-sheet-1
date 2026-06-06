// CFP ranking algorithm — pure function, runs in both server and client environments.
// Models how the real CFP Committee evaluates teams:
//   - Power 4 conference championships are the most valuable accomplishment
//   - SOS weighted by opponent conference prestige (P4 > G5 > Independent)
//   - Quality wins weighted by opponent strength and conference prestige
//   - Notre Dame and other independents treated as premium at-large candidates
//   - G5 champions can earn auto bids but realistically rank below P4 champions

export interface TeamData {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  color: string | null
  conference_id: string
  conference_name: string
  conference_abbr: string
}

export interface TeamGameResult {
  game_id: string
  opponent_id: string
  won: boolean
  conference_game: boolean
}

export interface CFPRankedTeam {
  rank: number
  team_id: string
  team_name: string
  team_abbr: string | null
  team_logo: string | null
  team_color: string | null
  conf_id: string
  conf_name: string
  conf_abbr: string
  overall_wins: number
  overall_losses: number
  conf_wins: number
  conf_losses: number
  is_conf_champ: boolean
  is_auto_bid: boolean
  cfp_score: number
  win_pct: number
  sos_pct: number
  quality_wins: number
}

export interface RankingInput {
  teams: TeamData[]
  results: Record<string, TeamGameResult[]>
}

// ── Conference prestige (0–100) ───────────────────────────────────

const PRESTIGE_TABLE: [RegExp, number][] = [
  [/SEC|Southeastern/i, 100],
  [/Big Ten/i, 95],
  [/ACC|Atlantic Coast/i, 78],
  [/Big 12/i, 78],
  [/Pac.?12/i, 72],
  [/Mountain West/i, 55],
  [/American Athletic/i, 52],
  [/Sun Belt/i, 46],
  [/Mid.?American|^MAC$/i, 42],
  [/Conference USA|CUSA/i, 40],
]

function getPrestige(confName: string): number {
  if (!confName || /independent/i.test(confName)) return 65
  for (const [re, score] of PRESTIGE_TABLE) {
    if (re.test(confName)) return score
  }
  return 35
}

function isP4(name: string) { return /SEC|Southeastern|Big Ten|ACC|Atlantic Coast|Big 12|Pac.?12/i.test(name) }
function isG5(name: string) { return /Mountain West|American Athletic|Sun Belt|Mid.?American|^MAC$|Conference USA|CUSA/i.test(name) }
function isIndependent(name: string) { return /independent/i.test(name) || !name }

// ── Core algorithm ────────────────────────────────────────────────

export function computeCFPRankings(input: RankingInput): CFPRankedTeam[] {
  const { teams, results } = input

  // Filter to teams that have played at least 1 game (predicted or actual)
  const activeTeams = teams.filter(t => (results[t.id]?.length ?? 0) > 0)
  if (!activeTeams.length) return []

  // Step 1: raw records
  const records = new Map<string, { wins: number; losses: number; confWins: number; confLosses: number }>()
  for (const t of activeTeams) {
    const games = results[t.id] ?? []
    let wins = 0, losses = 0, confWins = 0, confLosses = 0
    for (const g of games) {
      if (g.won) { wins++; if (g.conference_game) confWins++ }
      else { losses++; if (g.conference_game) confLosses++ }
    }
    records.set(t.id, { wins, losses, confWins, confLosses })
  }

  // Build teamData lookup by id
  const teamById = new Map(activeTeams.map(t => [t.id, t]))

  // Step 2: conference champions — best conf record; tiebreak overall
  const confChampions = new Map<string, string>()
  const byConf = new Map<string, TeamData[]>()
  for (const t of activeTeams) {
    const list = byConf.get(t.conference_id) ?? []
    list.push(t)
    byConf.set(t.conference_id, list)
  }
  for (const [confId, confTeams] of byConf) {
    const sorted = [...confTeams].sort((a, b) => {
      const ra = records.get(a.id)!
      const rb = records.get(b.id)!
      const ctA = ra.confWins + ra.confLosses
      const ctB = rb.confWins + rb.confLosses
      const cpA = ctA > 0 ? ra.confWins / ctA : 0
      const cpB = ctB > 0 ? rb.confWins / ctB : 0
      if (cpB !== cpA) return cpB - cpA
      const ovA = ra.wins + ra.losses > 0 ? ra.wins / (ra.wins + ra.losses) : 0
      const ovB = rb.wins + rb.losses > 0 ? rb.wins / (rb.wins + rb.losses) : 0
      return ovB - ovA
    })
    if (sorted.length > 0) confChampions.set(confId, sorted[0].id)
  }

  // Step 3: SOS — sum of (opponent win% × opponent conf prestige) per game, normalized
  const sosByTeam = new Map<string, number>()
  for (const t of activeTeams) {
    const games = results[t.id] ?? []
    if (!games.length) { sosByTeam.set(t.id, 0); continue }
    let total = 0
    for (const g of games) {
      const opp = records.get(g.opponent_id)
      const oppTeam = teamById.get(g.opponent_id)
      if (opp && oppTeam) {
        const oppTotal = opp.wins + opp.losses
        const oppWinPct = oppTotal > 0 ? opp.wins / oppTotal : 0
        const oppPrestige = getPrestige(oppTeam.conference_name) / 100
        total += oppWinPct * oppPrestige
      }
    }
    sosByTeam.set(t.id, total / games.length)
  }

  // Step 4: quality wins — wins vs 6+ win teams, weighted by opp conf prestige
  const qualityWinsByTeam = new Map<string, number>()
  for (const t of activeTeams) {
    const games = results[t.id] ?? []
    let score = 0
    for (const g of games) {
      if (!g.won) continue
      const opp = records.get(g.opponent_id)
      const oppTeam = teamById.get(g.opponent_id)
      if (!opp || !oppTeam || opp.wins < 6) continue
      const oppPrestige = getPrestige(oppTeam.conference_name) / 100
      const winValue = (opp.wins >= 8 ? 1.5 : 1.0) * (0.4 + oppPrestige * 0.6)
      score += winValue
    }
    qualityWinsByTeam.set(t.id, Math.min(score, 12))
  }

  // Normalize SOS
  const sosVals = [...sosByTeam.values()]
  const maxSos = Math.max(...sosVals, 0.001)
  const minSos = Math.min(...sosVals, 0)

  // Step 5: score
  const scored = activeTeams.map(t => {
    const rec = records.get(t.id)!
    const isChamp = confChampions.get(t.conference_id) === t.id && !isIndependent(t.conference_name)
    const total = rec.wins + rec.losses
    const winPct = total > 0 ? rec.wins / total : 0
    const sos = sosByTeam.get(t.id) ?? 0
    const qw = qualityWinsByTeam.get(t.id) ?? 0
    const sosNorm = maxSos > minSos ? (sos - minSos) / (maxSos - minSos) : 0
    const prestige = getPrestige(t.conference_name)

    // Conference champion bonus — biggest reward for winning a Power 4 conference
    const champBonus = isChamp
      ? (isP4(t.conference_name) ? 20 : isG5(t.conference_name) ? 8 : 0)
      : 0

    // Independents (Notre Dame) get a prestige floor as premium at-large candidates
    // Their tough schedules are captured in SOS; they don't get conf champ bonus
    const confBackground = (prestige / 100) * 8

    const score =
      winPct * 55 +    // 0-55: win% is primary factor
      champBonus +     // P4: +20, G5: +8, none: 0
      sosNorm * 20 +   // 0-20: SOS weighted by opp conf prestige
      qw +             // 0-12: quality wins
      confBackground   // 0-8: conference prestige background

    return { t, rec, isChamp, winPct, sos, qw, sosNorm, score }
  })

  // Sort by score, tiebreak wins
  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : b.rec.wins - a.rec.wins)

  // Mark auto bids:
  //   - Every P4 conference champion gets a guaranteed auto bid
  //   - Best-ranked non-P4 (G5) conference champion gets the 5th auto bid
  const p4AutoConfs = new Set<string>()
  const autoIds = new Set<string>()
  let g5AutoFound = false

  for (const s of scored) {
    if (!s.isChamp || isIndependent(s.t.conference_name)) continue
    if (isP4(s.t.conference_name) && !p4AutoConfs.has(s.t.conference_id)) {
      p4AutoConfs.add(s.t.conference_id)
      autoIds.add(s.t.id)
    } else if (!isP4(s.t.conference_name) && !g5AutoFound) {
      g5AutoFound = true
      autoIds.add(s.t.id)
    }
  }

  return scored.map((s, i) => ({
    rank: i + 1,
    team_id: s.t.id,
    team_name: s.t.name,
    team_abbr: s.t.abbreviation,
    team_logo: s.t.logo_url,
    team_color: s.t.color,
    conf_id: s.t.conference_id,
    conf_name: s.t.conference_name,
    conf_abbr: s.t.conference_abbr,
    overall_wins: s.rec.wins,
    overall_losses: s.rec.losses,
    conf_wins: s.rec.confWins,
    conf_losses: s.rec.confLosses,
    is_conf_champ: s.isChamp,
    is_auto_bid: autoIds.has(s.t.id),
    cfp_score: Math.round(s.score * 10) / 10,
    win_pct: Math.round(s.winPct * 1000) / 1000,
    sos_pct: Math.round(s.sos * 1000) / 1000,
    quality_wins: Math.round(s.qw * 10) / 10,
  }))
}
