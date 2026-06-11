import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchEspnScoreboard, normalizeTeamName } from '@/lib/espn/client'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const week   = searchParams.get('week')   ? parseInt(searchParams.get('week')!)   : undefined
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : CURRENT_SEASON

  try {
    const [espnGames, db] = [
      await fetchEspnScoreboard(week, season),
      createServiceClient(),
    ]

    // Only return games that are live or just finished — skip future scheduled games
    const activeGames = espnGames.filter(g => g.status !== 'scheduled')
    if (!activeGames.length) {
      return NextResponse.json({ games: [], fetchedAt: new Date().toISOString() })
    }

    // Load our team name → id map
    const { data: teams } = await db.from('teams').select('id, name').eq('sport_id', 'cfb')
    const teamByNorm = new Map(teams?.map(t => [normalizeTeamName(t.name), t.id]) ?? [])

    // Load our game records for the relevant week/season
    let query = db
      .from('games')
      .select('id, week, home_team_id, away_team_id, status')
      .eq('sport_id', 'cfb')
      .eq('season', season)
    if (week) query = query.eq('week', week)
    const { data: ourGames } = await query

    // Index by "homeId::awayId" for O(1) lookup
    const gameByTeamPair = new Map(
      ourGames?.map(g => [`${g.home_team_id}::${g.away_team_id}`, g.id]) ?? []
    )

    const matched = activeGames.map(eg => {
      const homeId = teamByNorm.get(normalizeTeamName(eg.homeTeamLocation))
      const awayId = teamByNorm.get(normalizeTeamName(eg.awayTeamLocation))
      const gameId = homeId && awayId
        ? (gameByTeamPair.get(`${homeId}::${awayId}`) ?? null)
        : null
      return { ...eg, gameId }
    })

    return NextResponse.json({ games: matched, fetchedAt: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
