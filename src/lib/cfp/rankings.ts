// CFP ranking algorithm — pure function, runs in both server and client environments.
// Models the 2026 CFP Selection Committee criteria:
//   - Strength of schedule (primary differentiator between close teams)
//   - Head-to-head results (captured via wins/losses + quality-win weighting)
//   - Comparative outcomes vs common opponents (quality win scoring)
//   - Power 4 (ACC, Big 12, Big Ten, SEC) conference championships are highest value
//   - Group of 6 (American, CUSA, MAC, Mountain West, Pac-12, Sun Belt) champions earn auto bid
//   - Notre Dame guaranteed a spot if ranked top 12 (marked is_guaranteed)

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
  is_guaranteed: boolean  // Notre Dame: guaranteed spot if ranked top 12
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

// 2026 Power 4: ACC, Big 12, Big Ten, SEC — Pac-12 is now Group of 6
const PRESTIGE_TABLE: [RegExp, number][] = [
  [/SEC|Southeastern/i, 100],
  [/Big Ten/i, 95],
  [/ACC|Atlantic Coast/i, 80],
  [/Big 12/i, 78],
  [/Mountain West/i, 55],
  [/American Athletic/i, 53],
  [/Pac.?12/i, 52],
  [/Sun Belt/i, 47],
  [/Mid.?American|^MAC$/i, 43],
  [/Conference USA|CUSA/i, 41],
]

function getPrestige(confName: string): number {
  if (!confName || /independent/i.test(confName)) return 68  // Notre Dame / independents get solid floor
  for (const [re, score] of PRESTIGE_TABLE) {
    if (re.test(confName)) return score
  }
  return 35
}

// 2026 Power 4: ACC, Big 12, Big Ten, SEC (Pac-12 removed)
function isP4(name: string) { return /SEC|Southeastern|Big Ten|ACC|Atlantic Coast|Big 12/i.test(name) }
// Group of 6: American, CUSA, MAC, Mountain West, Pac-12, Sun Belt
function isG6(name: string) { return /Mountain West|American Athletic|Sun Belt|Mid.?American|^MAC$|Conference USA|CUSA|Pac.?12/i.test(name) }
function isIndependent(name: string) { return /independent/i.test(name) || !name }
function isNotreDame(name: string) { return /notre dame/i.test(name) }

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

  // Step 4: quality wins — wins vs 6+ win teams, weighted by opp conf prestige + opp record
  // This captures "comparative outcomes vs common opponents" from committee criteria
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
      // Tiers: 10+ wins = elite, 8-9 = very good, 6-7 = good
      const winTier = opp.wins >= 10 ? 2.0 : opp.wins >= 8 ? 1.5 : 1.0
      const winValue = winTier * (0.35 + oppPrestige * 0.65)
      score += winValue
    }
    qualityWinsByTeam.set(t.id, Math.min(score, 15))
  }

  // Normalize SOS
  const sosVals = [...sosByTeam.values()]
  const maxSos = Math.max(...sosVals, 0.001)
  const minSos = Math.min(...sosVals, 0)

  // Step 5: score — weights reflect 2026 CFP committee criteria:
  //   win% (record), SOS, quality wins (covers head-to-head + common opponents), conf prestige
  const scored = activeTeams.map(t => {
    const rec = records.get(t.id)!
    const isChamp = confChampions.get(t.conference_id) === t.id && !isIndependent(t.conference_name)
    const total = rec.wins + rec.losses
    const winPct = total > 0 ? rec.wins / total : 0
    const sos = sosByTeam.get(t.id) ?? 0
    const qw = qualityWinsByTeam.get(t.id) ?? 0
    const sosNorm = maxSos > minSos ? (sos - minSos) / (maxSos - minSos) : 0
    const prestige = getPrestige(t.conference_name)

    // Conference champion bonus — P4 champs get highest reward; G6 champ gets meaningful bump
    const champBonus = isChamp
      ? (isP4(t.conference_name) ? 22 : isG6(t.conference_name) ? 7 : 0)
      : 0

    // Independents (Notre Dame) get a prestige floor — their SOS score captures schedule difficulty
    const confBackground = (prestige / 100) * 8

    const score =
      winPct * 50 +    // 0-50: win% is primary factor
      champBonus +     // P4: +22, G6: +7, none: 0
      sosNorm * 22 +   // 0-22: SOS (weighted by opp conf prestige) — committee priority
      qw +             // 0-15: quality wins + comparative outcomes vs common opponents
      confBackground   // 0-8: conference prestige background

    return { t, rec, isChamp, winPct, sos, qw, sosNorm, score }
  })

  // Sort by score, tiebreak: more wins, then fewer losses
  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score :
    b.rec.wins !== a.rec.wins ? b.rec.wins - a.rec.wins :
    a.rec.losses - b.rec.losses
  )

  // Mark auto bids:
  //   - Every P4 (ACC, Big 12, Big Ten, SEC) conference champion gets an auto bid
  //   - Highest-ranked G6 (American, CUSA, MAC, Mountain West, Pac-12, Sun Belt) champion
  //     gets the 5th auto bid
  const p4AutoConfs = new Set<string>()
  const autoIds = new Set<string>()
  let g6AutoFound = false

  for (const s of scored) {
    if (!s.isChamp || isIndependent(s.t.conference_name)) continue
    if (isP4(s.t.conference_name) && !p4AutoConfs.has(s.t.conference_id)) {
      p4AutoConfs.add(s.t.conference_id)
      autoIds.add(s.t.id)
    } else if (isG6(s.t.conference_name) && !g6AutoFound) {
      g6AutoFound = true
      autoIds.add(s.t.id)
    }
  }

  // Assign provisional ranks so Notre Dame guarantee can be evaluated
  const provisional = scored.map((s, i) => ({ ...s, provisionalRank: i + 1 }))

  // Mark Notre Dame as guaranteed if ranked top 12
  const guaranteedIds = new Set<string>()
  for (const s of provisional) {
    if (s.provisionalRank <= 12 && isNotreDame(s.t.name)) {
      guaranteedIds.add(s.t.id)
    }
  }

  return provisional.map((s, i) => ({
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
    is_guaranteed: guaranteedIds.has(s.t.id),
    cfp_score: Math.round(s.score * 10) / 10,
    win_pct: Math.round(s.winPct * 1000) / 1000,
    sos_pct: Math.round(s.sos * 1000) / 1000,
    quality_wins: Math.round(s.qw * 10) / 10,
  }))
}
