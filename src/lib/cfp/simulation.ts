// Game simulation engine for The Prediction Sheet.
// Used when a user has not manually predicted a game.
// User picks always override simulation — this only fills gaps.
//
// Design goals:
//   - Deterministic per (sessionId, gameId): same result every render for a given user
//   - Varies across sessions: different users see different simulated outcomes
//   - Realistic upset rate: ~7-10% for elite vs bottom-tier matchups
//   - Near 50/50 for evenly matched teams, scales continuously

// FNV-1a 32-bit hash → stable float in [0, 1)
function seededRandom(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) | 0
  }
  return (h >>> 0) / 0x100000000
}

// Logistic win probability based on rating difference.
// scale=15 produces:
//   0  pt gap  → 53% (home adv only)
//  10 pt gap   → 66%
//  20 pt gap   → 79%
//  30 pt gap   → 88%
//  40 pt gap   → 93%   (elite 98 vs bottom 55 ≈ 93%, upset ≈ 7%)
function winProbability(homeRating: number, awayRating: number, neutralSite = false): number {
  const homeAdv = neutralSite ? 0 : 3
  const diff = homeRating - awayRating + homeAdv
  return 1 / (1 + Math.exp(-diff / 15))
}

// Simulate a single game. Returns the winning team's ID.
// Deterministic per (sessionId, gameId) pair.
export function simulateGame(
  sessionId: string,
  gameId: string,
  homeId: string,
  awayId: string,
  homeRating: number,
  awayRating: number,
  neutralSite = false,
): string {
  const rand = seededRandom(`${sessionId}|${gameId}`)
  const prob = winProbability(homeRating, awayRating, neutralSite)
  return rand < prob ? homeId : awayId
}
