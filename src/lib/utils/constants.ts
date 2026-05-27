/** Current CFB season year */
export const CURRENT_SEASON = 2026

/** Sport slugs — used in routing and DB */
export const SPORTS = {
  CFB: 'cfb',
  NFL: 'nfl',
  NBA: 'nba',
  MLB: 'mlb',
} as const

export type SportId = (typeof SPORTS)[keyof typeof SPORTS]

/** CFB regular season runs weeks 1–15 (approx) */
export const CFB_WEEKS = Array.from({ length: 15 }, (_, i) => i + 1)

/** Season types */
export const SEASON_TYPES = {
  REGULAR: 'regular',
  POSTSEASON: 'postseason',
} as const

/** Game statuses */
export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

/** Major CFB conferences (used as filter/display defaults) */
export const MAJOR_CONFERENCES = [
  'SEC',
  'Big Ten',
  'Big 12',
  'ACC',
  'Pac-12',
  'American Athletic',
  'Mountain West',
  'Sun Belt',
  'MAC',
  'Conference USA',
] as const

/** App brand colors */
export const BRAND = {
  lime: '#84cc16',
  limeLight: '#a3e635',
  limeDark: '#65a30d',
  black: '#0a0a0a',
  white: '#ffffff',
} as const
