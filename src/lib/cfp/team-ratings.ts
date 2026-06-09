// Preseason 2026 FBS team ratings (0–100 scale)
// Based on ESPN FPI, preseason polls, recruiting, returning production, and recent program success.
//
// 95-99 = National Championship Contenders
// 90-94 = Playoff Contenders
// 85-89 = Top 25 Teams
// 80-84 = Above Average Power Conference Teams
// 75-79 = Average Bowl Teams
// 70-74 = Fringe Bowl Teams
// 60-69 = Lower Tier FBS Teams
// <60   = Bottom Tier FBS Teams

export const DEFAULT_RATING = 65

export const TEAM_RATINGS: Record<string, number> = {

  // ── SEC ─────────────────────────────────────────────────────────
  'Georgia':              98,
  'Texas':                97,
  'Alabama':              96,
  'LSU':                  90,
  'Ole Miss':             89,
  'Tennessee':            88,
  'Oklahoma':             88,
  'Texas A&M':            87,
  'Auburn':               82,
  'Missouri':             81,
  'Kentucky':             79,
  'Florida':              78,
  'Mississippi State':    76,
  'Arkansas':             76,
  'South Carolina':       75,
  'Vanderbilt':           72,

  // ── Big Ten ──────────────────────────────────────────────────────
  'Ohio State':           99,
  'Oregon':               95,
  'Indiana':              93,
  'Penn State':           88,
  'Michigan':             86,
  'USC':                  83,
  'Illinois':             78,
  'Wisconsin':            73,
  'Minnesota':            76,
  'Iowa':                 72,
  'Nebraska':             78,
  'Washington':           80,
  'UCLA':                 68,
  'Maryland':             68,
  'Michigan State':       72,
  'Purdue':               67,
  'Rutgers':              59,
  'Northwestern':         59,

  // ── ACC ─────────────────────────────────────────────────────────
  'Clemson':              84,
  'Miami':                93,
  'Florida State':        70,
  'Louisville':           78,
  'SMU':                  76,
  'Georgia Tech':         77,
  'Virginia Tech':        80,
  'Pittsburgh':           74,
  'North Carolina':       66,
  'Duke':                 73,
  'Syracuse':             71,
  'NC State':             67,
  'Stanford':             69,
  'California':           66,
  'Wake Forest':          68,
  'Virginia':             65,
  'Boston College':       65,

  // ── Big 12 ──────────────────────────────────────────────────────
  'BYU':                  86,
  'Texas Tech':           90,
  'Oklahoma State':       83,
  'Arizona State':        82,
  'Houston':              79,
  'Iowa State':           78,
  'Utah':                 77,
  'West Virginia':        74,
  'Colorado':             73,
  'Kansas State':         75,
  'TCU':                  70,
  'Baylor':               69,
  'UCF':                  69,
  'Arizona':              63,
  'Kansas':               65,
  'Cincinnati':           65,

  // ── American Athletic ───────────────────────────────────────────
  'South Florida':        76,
  'Memphis':              79,
  'Tulane':               74,
  'Army':                 78,
  'Navy':                 58,
  'Tulsa':                62,
  'UAB':                  63,
  'UTSA':                 62,
  'East Carolina':        58,
  'North Texas':          62,
  'Florida Atlantic':     62,
  'Temple':               55,
  'Charlotte':            57,
  'Rice':                 60,

  // ── Mountain West ───────────────────────────────────────────────
  'Boise State':          83,
  'Hawaii':               74,
  'Fresno State':         66,
  'UNLV':                 62,
  'San Diego State':      64,
  'Colorado State':       65,
  'Utah State':           64,
  'Nevada':               65,
  'Wyoming':              63,
  'San Jose State':       60,
  'Air Force':            62,
  'New Mexico':           58,

  // ── Sun Belt ────────────────────────────────────────────────────
  'James Madison':        75,
  'Liberty':              75,
  'Appalachian State':    63,
  'Coastal Carolina':     63,
  'Georgia Southern':     64,
  'Georgia State':        65,
  'South Alabama':        64,
  'Louisiana':            63,
  'Troy':                 61,
  'Texas State':          63,
  'Arkansas State':       60,
  'Louisiana Monroe':     57,
  'Southern Miss':        57,
  'Marshall':             61,
  'Old Dominion':         57,

  // ── MAC ─────────────────────────────────────────────────────────
  'Toledo':               59,
  'Northern Illinois':    58,
  'Ohio':                 57,
  'Miami (OH)':           61,
  'Central Michigan':     57,
  'Western Michigan':     57,
  'Eastern Michigan':     57,
  'Ball State':           55,
  'Bowling Green':        56,
  'Buffalo':              56,
  'Akron':                54,
  'Kent State':           54,

  // ── CUSA ────────────────────────────────────────────────────────
  'Louisiana Tech':       60,
  'Western Kentucky':     63,
  'UTEP':                 58,
  'Middle Tennessee':     60,
  'New Mexico State':     55,
  'Sam Houston':          57,
  'Florida International':55,
  'Kennesaw State':       55,
  'Jacksonville State':   56,

  // ── Independents ────────────────────────────────────────────────
  'Notre Dame':           95,
  'Oregon State':         76,
  'Washington State':     65,
  'Connecticut':          74,
  'Massachusetts':        52,
}

// Look up a team rating by school name with fallback matching
export function getTeamRating(teamName: string): number {
  if (!teamName) return DEFAULT_RATING

  // 1. Exact match
  const exact = TEAM_RATINGS[teamName]
  if (exact !== undefined) return exact

  // 2. Case-insensitive exact
  const lower = teamName.toLowerCase()
  for (const [k, v] of Object.entries(TEAM_RATINGS)) {
    if (k.toLowerCase() === lower) return v
  }

  // 3. One name fully contains the other (handles "UL Lafayette" ↔ "Louisiana", etc.)
  for (const [k, v] of Object.entries(TEAM_RATINGS)) {
    const kl = k.toLowerCase()
    if (lower.includes(kl) || kl.includes(lower)) return v
  }

  return DEFAULT_RATING
}
