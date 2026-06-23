// CFP selection process: takes ranked teams, produces 12-team seeded field.
// 2026 CFP rules (12-team format):
//   - 4 Power 4 (ACC, Big 12, Big Ten, SEC) champions get automatic bids
//   - Highest-ranked Group of 6 (American, CUSA, MAC, Mountain West, Pac-12, Sun Belt) champion gets 5th auto bid
//   - Notre Dame is guaranteed a spot if ranked top 12 (is_guaranteed flag)
//   - Seeds 1-4 = the 4 highest-ranked conference champions → first-round byes
//   - Seeds 5-12 = 5th auto bid + at-large picks, ordered by committee ranking

import type { CFPRankedTeam } from './rankings'

// 2026 Power 4: ACC, Big 12, Big Ten, SEC (Pac-12 removed — now Group of 6)
const P4_RE = /SEC|Southeastern|Big Ten|Atlantic Coast|^ACC$|Big 12/i
// Group of 6: American, CUSA, MAC, Mountain West, Pac-12, Sun Belt
const G6_RE = /American Athletic|Mountain West|Sun Belt|Mid.?American|^MAC$|Conference USA|CUSA|Pac.?12/i

export interface CFPSeed {
  seed: number
  team_id: string
  team_name: string
  team_abbr: string | null
  team_logo: string | null
  team_color: string | null
  conf_name: string
  conf_abbr: string
  is_auto_bid: boolean
  is_guaranteed: boolean  // Notre Dame top-12 guarantee
  is_bye: boolean
  overall_wins: number
  overall_losses: number
  conf_wins: number
  conf_losses: number
  cfp_rank: number
}

export function generateCFPField(rankedTeams: CFPRankedTeam[]): CFPSeed[] {
  // ── Step 1: P4 automatic bids (ACC, Big 12, Big Ten, SEC champions) ──
  const p4AutoBids: CFPRankedTeam[] = []
  const seenP4Confs = new Set<string>()

  for (const team of rankedTeams) {
    if (team.is_conf_champ && P4_RE.test(team.conf_name) && !seenP4Confs.has(team.conf_id)) {
      p4AutoBids.push(team)
      seenP4Confs.add(team.conf_id)
    }
  }

  // ── Step 2: Group of 6 auto bid — highest-ranked G6 conference champion ──
  // Eligible: American, CUSA, MAC, Mountain West, Pac-12, Sun Belt
  const takenP4Ids = new Set(p4AutoBids.map(t => t.team_id))
  const g6AutoBid = rankedTeams.find(
    t => t.is_conf_champ && G6_RE.test(t.conf_name) && !takenP4Ids.has(t.team_id)
  ) ?? null

  // All auto bids sorted by CFP rank (best first)
  const allAutoBids = [...p4AutoBids, ...(g6AutoBid ? [g6AutoBid] : [])]
    .sort((a, b) => a.rank - b.rank)

  // ── Step 3: Seeds 1-4 = the 4 highest-ranked conference champions → first-round byes ──
  // Per CFP rules, top 4 seeds are exclusively for the 4 highest-ranked conf champions
  const byeTeams = allAutoBids.slice(0, 4)
  const fifthAuto = allAutoBids[4] ?? null

  // ── Step 4: Seeds 5-12 = 5th auto bid + at-large (ordered by ranking) ──
  // Notre Dame is guaranteed a spot if ranked top 12 (is_guaranteed flag from rankings)
  const takenIds = new Set(allAutoBids.map(t => t.team_id))

  // Guaranteed teams (Notre Dame top-12) that aren't already in via auto bid
  const guaranteed = rankedTeams.filter(
    t => t.is_guaranteed && !takenIds.has(t.team_id)
  )
  const guaranteedIds = new Set(guaranteed.map(t => t.team_id))
  for (const t of guaranteed) takenIds.add(t.team_id)

  const atLargeNeeded = Math.max(0, 8 - (fifthAuto ? 1 : 0) - guaranteed.length)
  const atLarge = rankedTeams
    .filter(t => !takenIds.has(t.team_id))
    .slice(0, atLargeNeeded)

  const seeds5to12 = [
    ...(fifthAuto ? [fifthAuto] : []),
    ...guaranteed,
    ...atLarge,
  ]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)

  const autoIds = new Set(allAutoBids.map(t => t.team_id))

  const toSeed = (team: CFPRankedTeam, seed: number, isAutoBid: boolean, isBye: boolean): CFPSeed => ({
    seed,
    team_id: team.team_id,
    team_name: team.team_name,
    team_abbr: team.team_abbr,
    team_logo: team.team_logo,
    team_color: team.team_color,
    conf_name: team.conf_name,
    conf_abbr: team.conf_abbr,
    is_auto_bid: isAutoBid,
    is_guaranteed: team.is_guaranteed ?? false,
    is_bye: isBye,
    overall_wins: team.overall_wins,
    overall_losses: team.overall_losses,
    conf_wins: team.conf_wins,
    conf_losses: team.conf_losses,
    cfp_rank: team.rank,
  })

  return [
    ...byeTeams.map((t, i) => toSeed(t, i + 1, true, true)),
    ...seeds5to12.map((t, i) => toSeed(t, i + 5, autoIds.has(t.team_id), false)),
  ]
}

// ── Bracket game definitions ──────────────────────────────────────
// seeds array is sorted by seed (index 0 = seed 1).
//
// Round 1 (game_index 0-3):
//   G0: seeds[4] (#5) vs seeds[11] (#12)
//   G1: seeds[7] (#8) vs seeds[8]  (#9)   ← Bracket A lower
//   G2: seeds[6] (#7) vs seeds[9]  (#10)  ← Bracket B upper
//   G3: seeds[5] (#6) vs seeds[10] (#11)  ← Bracket B lower
//
// Quarterfinals (game_index 0-3):
//   G0: seeds[3] (#4, bye) vs Winner(R1G0) ← Bracket A upper
//   G1: seeds[0] (#1, bye) vs Winner(R1G1) ← Bracket A lower
//   G2: seeds[1] (#2, bye) vs Winner(R1G2) ← Bracket B upper
//   G3: seeds[2] (#3, bye) vs Winner(R1G3) ← Bracket B lower
//
// Semifinals (game_index 0-1):
//   G0: Winner(QFG0) vs Winner(QFG1)  ← Bracket A
//   G1: Winner(QFG2) vs Winner(QFG3)  ← Bracket B
//
// Championship (game_index 0):
//   G0: Winner(SFG0) vs Winner(SFG1)

// Which next-round game does each game's winner feed into?
export const FEEDS_INTO: Record<string, [round: number, gameIndex: number]> = {
  '1-0': [2, 0],
  '1-1': [2, 1],
  '1-2': [2, 2],
  '1-3': [2, 3],
  '2-0': [3, 0],
  '2-1': [3, 0],
  '2-2': [3, 1],
  '2-3': [3, 1],
  '3-0': [4, 0],
  '3-1': [4, 0],
}

export interface BracketGame {
  round: number
  gameIndex: number
  label: string
  teamA: CFPSeed | null    // always known (null = TBD)
  teamB: CFPSeed | null
  teamASource?: string     // e.g. "Winner of #5 vs #12"
  teamBSource?: string
}

export function buildBracketGames(
  seeds: CFPSeed[],
  getPick: (round: number, gameIndex: number) => CFPSeed | null
): BracketGame[] {
  const s = [...seeds].sort((a, b) => a.seed - b.seed)

  function r1Winner(gi: number) { return getPick(1, gi) }
  function qfWinner(gi: number) { return getPick(2, gi) }
  function sfWinner(gi: number) { return getPick(3, gi) }

  const r1g0A = s[4] ?? null   // #5
  const r1g0B = s[11] ?? null  // #12
  const r1g1A = s[7] ?? null   // #8
  const r1g1B = s[8] ?? null   // #9
  const r1g2A = s[6] ?? null   // #7
  const r1g2B = s[9] ?? null   // #10
  const r1g3A = s[5] ?? null   // #6
  const r1g3B = s[10] ?? null  // #11

  return [
    // Round 1
    { round: 1, gameIndex: 0, label: 'First Round', teamA: r1g0A, teamB: r1g0B },
    { round: 1, gameIndex: 1, label: 'First Round', teamA: r1g1A, teamB: r1g1B },
    { round: 1, gameIndex: 2, label: 'First Round', teamA: r1g2A, teamB: r1g2B },
    { round: 1, gameIndex: 3, label: 'First Round', teamA: r1g3A, teamB: r1g3B },
    // Quarterfinals
    {
      round: 2, gameIndex: 0, label: 'Quarterfinal',
      teamA: s[3] ?? null,       // #4 bye
      teamB: r1Winner(0),
      teamBSource: r1g0A && r1g0B ? `Winner: #${r1g0A.seed} vs #${r1g0B.seed}` : undefined,
    },
    {
      round: 2, gameIndex: 1, label: 'Quarterfinal',
      teamA: s[0] ?? null,       // #1 bye
      teamB: r1Winner(1),
      teamBSource: r1g1A && r1g1B ? `Winner: #${r1g1A.seed} vs #${r1g1B.seed}` : undefined,
    },
    {
      round: 2, gameIndex: 2, label: 'Quarterfinal',
      teamA: s[1] ?? null,       // #2 bye
      teamB: r1Winner(2),
      teamBSource: r1g2A && r1g2B ? `Winner: #${r1g2A.seed} vs #${r1g2B.seed}` : undefined,
    },
    {
      round: 2, gameIndex: 3, label: 'Quarterfinal',
      teamA: s[2] ?? null,       // #3 bye
      teamB: r1Winner(3),
      teamBSource: r1g3A && r1g3B ? `Winner: #${r1g3A.seed} vs #${r1g3B.seed}` : undefined,
    },
    // Semifinals
    {
      round: 3, gameIndex: 0, label: 'Semifinal',
      teamA: qfWinner(0),
      teamB: qfWinner(1),
      teamASource: 'Winner: Quarterfinal A',
      teamBSource: 'Winner: Quarterfinal B',
    },
    {
      round: 3, gameIndex: 1, label: 'Semifinal',
      teamA: qfWinner(2),
      teamB: qfWinner(3),
      teamASource: 'Winner: Quarterfinal C',
      teamBSource: 'Winner: Quarterfinal D',
    },
    // Championship
    {
      round: 4, gameIndex: 0, label: 'National Championship',
      teamA: sfWinner(0),
      teamB: sfWinner(1),
      teamASource: 'Winner: Semifinal 1',
      teamBSource: 'Winner: Semifinal 2',
    },
  ]
}
