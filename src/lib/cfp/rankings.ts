// Pure ranking algorithm — no server imports, runs in both environments.
// Approximates CFP Committee logic from predicted season results.

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

const POWER_4 = new Set([
  'SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12',
  'Southeastern Conference', 'Big Ten Conference',
  'Big 12 Conference', 'Atlantic Coast Conference', 'Pac-12 Conference',
])
const G5 = new Set([
  'American Athletic', 'Mountain West', 'Sun Belt', 'MAC', 'Conference USA', 'Mid-American',
  'American Athletic Conference', 'Mountain West Conference', 'Sun Belt Conference',
  'Mid-American Conference',
])

function confPrestige(name: string): number {
  if (POWER_4.has(name)) return 10
  if (G5.has(name)) return 5
  return 2
}

export function computeCFPRankings(input: RankingInput): CFPRankedTeam[] {
  const { teams, results } = input

  // Step 1: raw records
  const records = new Map<string, { wins: number; losses: number; confWins: number; confLosses: number }>()
  for (const t of teams) {
    const games = results[t.id] ?? []
    let wins = 0, losses = 0, confWins = 0, confLosses = 0
    for (const g of games) {
      if (g.won) { wins++; if (g.conference_game) confWins++ }
      else { losses++; if (g.conference_game) confLosses++ }
    }
    records.set(t.id, { wins, losses, confWins, confLosses })
  }

  // Step 2: conference champions (best conf record, tiebreak overall)
  const confChampions = new Map<string, string>()
  const byConf = new Map<string, TeamData[]>()
  for (const t of teams) {
    const list = byConf.get(t.conference_id) ?? []
    list.push(t)
    byConf.set(t.conference_id, list)
  }
  for (const [confId, confTeams] of byConf) {
    const sorted = [...confTeams].sort((a, b) => {
      const ra = records.get(a.id)!
      const rb = records.get(b.id)!
      const confTotalA = ra.confWins + ra.confLosses
      const confTotalB = rb.confWins + rb.confLosses
      const confPctA = confTotalA > 0 ? ra.confWins / confTotalA : 0
      const confPctB = confTotalB > 0 ? rb.confWins / confTotalB : 0
      if (confPctB !== confPctA) return confPctB - confPctA
      const ovA = ra.wins + ra.losses > 0 ? ra.wins / (ra.wins + ra.losses) : 0
      const ovB = rb.wins + rb.losses > 0 ? rb.wins / (rb.wins + rb.losses) : 0
      return ovB - ovA
    })
    if (sorted.length > 0) confChampions.set(confId, sorted[0].id)
  }

  // Step 3: strength of schedule — avg opponent win pct
  const sosByTeam = new Map<string, number>()
  for (const t of teams) {
    const games = results[t.id] ?? []
    if (!games.length) { sosByTeam.set(t.id, 0); continue }
    let total = 0
    for (const g of games) {
      const opp = records.get(g.opponent_id)
      if (opp) {
        const oppTotal = opp.wins + opp.losses
        total += oppTotal > 0 ? opp.wins / oppTotal : 0
      }
    }
    sosByTeam.set(t.id, total / games.length)
  }

  // Step 4: quality wins (wins vs opponents with 7+ wins)
  const qualityWinsByTeam = new Map<string, number>()
  for (const t of teams) {
    const games = results[t.id] ?? []
    const qw = games.filter(g => {
      if (!g.won) return false
      const opp = records.get(g.opponent_id)
      return opp && opp.wins >= 7
    }).length
    qualityWinsByTeam.set(t.id, qw)
  }

  // Step 5: normalize
  const sosVals = [...sosByTeam.values()]
  const maxSos = Math.max(...sosVals, 0.001)
  const minSos = Math.min(...sosVals, 0)
  const maxQw = Math.max(...qualityWinsByTeam.values(), 1)

  // Step 6: score
  const scored = teams.map(t => {
    const rec = records.get(t.id)!
    const isChamp = confChampions.get(t.conference_id) === t.id
    const total = rec.wins + rec.losses
    const winPct = total > 0 ? rec.wins / total : 0
    const sos = sosByTeam.get(t.id) ?? 0
    const qw = qualityWinsByTeam.get(t.id) ?? 0
    const sosNorm = maxSos > minSos ? (sos - minSos) / (maxSos - minSos) : 0
    const qwNorm = maxQw > 0 ? qw / maxQw : 0
    const prestige = confPrestige(t.conference_name)

    const score =
      winPct * 45 +
      (isChamp ? 15 : 0) +
      sosNorm * 20 +
      qwNorm * 10 +
      (prestige / 10) * 10

    return { t, rec, isChamp, winPct, sos, sosNorm, qw, score }
  })

  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : b.rec.wins - a.rec.wins)

  // Step 7: mark auto bids (top 5 ranked conf champs)
  const autoBidConfs = new Set<string>()
  return scored.map((s, i) => {
    const isAutoBid = s.isChamp && autoBidConfs.size < 5 && (() => {
      if (!autoBidConfs.has(s.t.conference_id)) {
        autoBidConfs.add(s.t.conference_id)
        return true
      }
      return false
    })()

    return {
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
      is_auto_bid: isAutoBid ?? false,
      cfp_score: Math.round(s.score * 10) / 10,
      win_pct: Math.round(s.winPct * 1000) / 1000,
      sos_pct: Math.round(s.sos * 1000) / 1000,
      quality_wins: s.qw,
    }
  })
}
