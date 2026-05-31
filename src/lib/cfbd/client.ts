const BASE_URL = 'https://api.collegefootballdata.com'

function getHeaders(): HeadersInit {
  const key = process.env.CFBD_API_KEY
  if (!key) throw new Error('CFBD_API_KEY is not configured in .env.local')
  return { Authorization: `Bearer ${key}` }
}

async function cfbdFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CFBD ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export interface CfbdConference {
  id: number
  name: string
  short_name: string
  abbreviation: string
  classification: 'fbs' | 'fcs' | 'ii' | 'iii' | null
}

export interface CfbdTeam {
  id: number
  school: string
  mascot: string | null
  abbreviation: string | null
  conference: string | null
  classification: 'fbs' | 'fcs' | 'ii' | 'iii' | null
  color: string | null
  alt_color: string | null
  logos: string[] | null
}

export interface CfbdGame {
  id: number
  season: number
  week: number
  seasonType: string
  startDate: string | null
  homeTeam: string
  awayTeam: string
  homePoints: number | null
  awayPoints: number | null
  completed: boolean
  neutralSite: boolean
  conferenceGame: boolean | null
  notes: string | null
}

export const cfbd = {
  conferences: () =>
    cfbdFetch<CfbdConference[]>('/conferences'),

  teams: (year: number) =>
    cfbdFetch<CfbdTeam[]>(`/teams?year=${year}`),

  games: (year: number, seasonType: 'regular' | 'postseason' = 'regular') =>
    cfbdFetch<CfbdGame[]>(`/games?year=${year}&seasonType=${seasonType}`),

  weekGames: (year: number, week: number, seasonType = 'regular') =>
    cfbdFetch<CfbdGame[]>(`/games?year=${year}&week=${week}&seasonType=${seasonType}`),
}
