const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard'

// ESPN team.location → CFBD school name corrections for known mismatches
const ESPN_NAME_MAP: Record<string, string> = {
  'ul monroe':          'louisiana monroe',
  'southern miss':      'southern mississippi',
  'fiu':                'florida international',
  'fau':                'florida atlantic',
  'app state':          'appalachian state',
  'appalachian st':     'appalachian state',
  'sam houston':        'sam houston state',
  'jacksonville st':    'jacksonville state',
  'kennesaw st':        'kennesaw state',
  'tarleton st':        'tarleton state',
  'lamar':              'lamar',
  "hawai'i":            'hawaii',
}

export function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim()
  return (ESPN_NAME_MAP[lower] ?? lower)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type EspnLiveGame = {
  espnId: string
  week: number
  homeTeamLocation: string
  awayTeamLocation: string
  homeScore: number | null
  awayScore: number | null
  /** 'scheduled' | 'in_progress' | 'halftime' | 'completed' */
  status: string
  statusDetail: string
  clock: string
  period: number
  startTime: string
}

export async function fetchEspnScoreboard(
  week?: number,
  season?: number
): Promise<EspnLiveGame[]> {
  const params = new URLSearchParams({ limit: '100', groups: '80' })
  if (week)   params.set('week', String(week))
  if (season) params.set('year', String(season))
  if (week)   params.set('seasontype', '2')

  const res = await fetch(`${ESPN_SCOREBOARD}?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN API ${res.status}`)

  const data = await res.json()
  const games: EspnLiveGame[] = []

  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0]
    if (!comp) continue

    const home = comp.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away')
    if (!home || !away) continue

    const statusName: string = comp.status?.type?.name ?? 'STATUS_SCHEDULED'
    let status = 'scheduled'
    if (statusName === 'STATUS_HALFTIME')    status = 'halftime'
    else if (statusName === 'STATUS_IN_PROGRESS') status = 'in_progress'
    else if (comp.status?.type?.completed)   status = 'completed'

    const hasScore = status !== 'scheduled'

    games.push({
      espnId: event.id,
      week: event.week?.number ?? 0,
      homeTeamLocation: home.team?.location ?? '',
      awayTeamLocation: away.team?.location ?? '',
      homeScore: hasScore ? parseInt(home.score ?? '0', 10) : null,
      awayScore: hasScore ? parseInt(away.score ?? '0', 10) : null,
      status,
      statusDetail: comp.status?.type?.detail ?? '',
      clock: comp.status?.displayClock ?? '',
      period: comp.status?.period ?? 0,
      startTime: comp.date ?? event.date ?? '',
    })
  }

  return games
}
