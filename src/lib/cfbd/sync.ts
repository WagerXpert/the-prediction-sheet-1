import { createServiceClient } from '@/lib/supabase/server'
import { cfbd } from './client'
import { CURRENT_SEASON, GAME_STATUS } from '@/lib/utils/constants'

export type SyncResult =
  | { ok: true; records: number; elapsed_ms: number; detail?: string }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Sync: FBS conferences + teams
// ---------------------------------------------------------------------------

export async function syncTeams(season = CURRENT_SEASON): Promise<SyncResult> {
  const t0 = Date.now()
  const db = createServiceClient()

  try {
    // Ensure sport row exists
    await db.from('sports').upsert(
      { id: 'cfb', name: 'College Football', abbreviation: 'CFB', is_active: true },
      { onConflict: 'id' }
    )

    const [cfbdConfs, cfbdTeams] = await Promise.all([
      cfbd.conferences(),
      cfbd.teams(season),
    ])

    const fbsTeams = cfbdTeams.filter(t => t.classification === 'fbs')
    const fbsConfNames = new Set(fbsTeams.map(t => t.conference).filter(Boolean) as string[])
    const relevantConfs = cfbdConfs.filter(c => fbsConfNames.has(c.name))

    // ---- Conferences -------------------------------------------------------
    const { data: existingConfs } = await db
      .from('conferences')
      .select('id, external_id, name')
      .eq('sport_id', 'cfb')

    const confByExtId = new Map(
      existingConfs?.filter(c => c.external_id).map(c => [c.external_id!, c.id]) ?? []
    )
    // Also index by name so we can merge with existing seed rows instead of inserting duplicates
    const confByName = new Map(
      existingConfs?.map(c => [c.name, c.id]) ?? []
    )

    for (const c of relevantConfs) {
      const extId = String(c.id)
      const row = {
        sport_id: 'cfb',
        external_id: extId,
        name: c.name,
        abbreviation: c.abbreviation || c.short_name || c.name.slice(0, 12),
      }
      if (confByExtId.has(extId)) {
        // Already linked by CFBD numeric id — just update
        await db.from('conferences').update(row).eq('id', confByExtId.get(extId)!)
      } else if (confByName.has(c.name)) {
        // A seed row with the same name exists — update it and claim the CFBD id (no new row)
        const existingId = confByName.get(c.name)!
        await db.from('conferences').update({ ...row, external_id: extId }).eq('id', existingId)
        confByExtId.set(extId, existingId)
      } else {
        const { data } = await db.from('conferences').insert(row).select('id, external_id').single()
        if (data) confByExtId.set(extId, data.id)
      }
    }

    // Refresh name → id map after upserts
    const { data: allConfs } = await db
      .from('conferences')
      .select('id, name')
      .eq('sport_id', 'cfb')
    const confByNameFinal = new Map(allConfs?.map(c => [c.name, c.id]) ?? [])

    // ---- Teams -------------------------------------------------------------
    const { data: existingTeams } = await db
      .from('teams')
      .select('id, external_id, name')
      .eq('sport_id', 'cfb')

    const teamByExtId = new Map(
      existingTeams?.filter(t => t.external_id).map(t => [t.external_id!, t.id]) ?? []
    )
    // Index by name to merge with seed rows instead of inserting duplicates
    const teamByName = new Map(
      existingTeams?.map(t => [t.name, t.id]) ?? []
    )

    const toInsert: any[] = []
    const toUpdate: { id: string; row: object }[] = []

    for (const t of fbsTeams) {
      const extId = String(t.id)
      const row = {
        sport_id: 'cfb',
        external_id: extId,
        conference_id: t.conference ? confByNameFinal.get(t.conference) ?? null : null,
        name: t.school,
        abbreviation: t.abbreviation,
        mascot: t.mascot,
        logo_url: t.logos?.[0] ?? null,
        color: t.color,
        alt_color: t.alt_color,
      }
      if (teamByExtId.has(extId)) {
        toUpdate.push({ id: teamByExtId.get(extId)!, row })
      } else if (teamByName.has(t.school)) {
        // Seed team with same name — update it with CFBD data (no new row)
        toUpdate.push({ id: teamByName.get(t.school)!, row: { ...row, external_id: extId } })
        teamByExtId.set(extId, teamByName.get(t.school)!)
      } else {
        toInsert.push(row as any)
      }
    }

    if (toInsert.length) {
      const { error } = await db.from('teams').insert(toInsert as any)
      if (error) throw error
    }
    for (const { id, row } of toUpdate) {
      await db.from('teams').update(row).eq('id', id)
    }

    const records = fbsTeams.length
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: 'teams',
      season,
      week: null,
      status: 'success',
      records_affected: records,
      error_message: null,
    })

    return { ok: true, records, elapsed_ms: Date.now() - t0 }
  } catch (err: any) {
    const error = String(err?.message ?? err)
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: 'teams',
      season,
      week: null,
      status: 'error',
      records_affected: null,
      error_message: error,
    })
    return { ok: false, error }
  }
}

// ---------------------------------------------------------------------------
// Sync: full season schedule (regular + postseason)
// ---------------------------------------------------------------------------

export async function syncSchedule(season = CURRENT_SEASON): Promise<SyncResult> {
  const t0 = Date.now()
  const db = createServiceClient()

  try {
    const [regularGames, postGames] = await Promise.all([
      cfbd.games(season, 'regular'),
      cfbd.games(season, 'postseason'),
    ])
    const allGames = [...regularGames, ...postGames]

    // Build team name → id map
    const { data: teams } = await db
      .from('teams')
      .select('id, name')
      .eq('sport_id', 'cfb')
    const teamByName = new Map(teams?.map(t => [t.name, t.id]) ?? [])

    // Build existing external_id → game id map
    const { data: existingGames } = await db
      .from('games')
      .select('id, external_id')
      .eq('sport_id', 'cfb')
      .eq('season', season)
    const gameByExtId = new Map(
      existingGames?.filter(g => g.external_id != null).map(g => [String(g.external_id!), g.id]) ?? []
    )

    const toInsert: object[] = []
    const toUpdate: { id: string; row: object }[] = []

    for (const g of allGames) {
      const extId = String(g.id)
      const row = {
        sport_id: 'cfb',
        external_id: g.id,
        season: g.season,
        season_type: g.seasonType ?? 'regular',
        week: g.week,
        game_date: g.startDate,
        home_team_id: teamByName.get(g.homeTeam) ?? null,
        away_team_id: teamByName.get(g.awayTeam) ?? null,
        home_team_points: g.homePoints,
        away_team_points: g.awayPoints,
        status: g.completed ? GAME_STATUS.COMPLETED : GAME_STATUS.SCHEDULED,
        neutral_site: g.neutralSite ?? false,
        conference_game: g.conferenceGame ?? false,
        notes: g.notes,
      }
      if (gameByExtId.has(extId)) {
        toUpdate.push({ id: gameByExtId.get(extId)!, row })
      } else {
        toInsert.push(row)
      }
    }

    if (toInsert.length) {
      const { error } = await db.from('games').insert(toInsert as any)
      if (error) throw error
    }
    for (const { id, row } of toUpdate) {
      await db.from('games').update(row).eq('id', id)
    }

    const records = allGames.length
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: 'schedule',
      season,
      week: null,
      status: 'success',
      records_affected: records,
      error_message: null,
    })

    return { ok: true, records, elapsed_ms: Date.now() - t0 }
  } catch (err: any) {
    const error = String(err?.message ?? err)
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: 'schedule',
      season,
      week: null,
      status: 'error',
      records_affected: null,
      error_message: error,
    })
    return { ok: false, error }
  }
}

// ---------------------------------------------------------------------------
// Sync: game results for a specific week (or full season) + grade predictions
// ---------------------------------------------------------------------------

export async function syncResults(season = CURRENT_SEASON, week?: number): Promise<SyncResult> {
  const t0 = Date.now()
  const db = createServiceClient()

  try {
    // Fetch completed games from CFBD
    const cfbdGames = week
      ? await cfbd.weekGames(season, week)
      : [
          ...(await cfbd.games(season, 'regular')),
          ...(await cfbd.games(season, 'postseason')),
        ]

    const completedGames = cfbdGames.filter(g => g.completed)

    // Update our games table with scores + completed status
    const { data: ourGames } = await db
      .from('games')
      .select('id, external_id')
      .eq('sport_id', 'cfb')
      .eq('season', season)

    const gameByExtId = new Map(
      ourGames?.filter(g => g.external_id != null).map(g => [String(g.external_id!), g.id]) ?? []
    )

    let updatedGames = 0
    for (const g of completedGames) {
      const ourId = gameByExtId.get(String(g.id))
      if (!ourId) continue
      await db.from('games').update({
        home_team_points: g.homePoints,
        away_team_points: g.awayPoints,
        status: GAME_STATUS.COMPLETED,
      }).eq('id', ourId)
      updatedGames++
    }

    // Grade game pick predictions
    await gradeGamePicks(db, season, week)

    // Grade season record + standings predictions only on full-season sync
    if (!week) {
      await gradePredictionRecords(db, season)
      await gradePredictionStandings(db, season)
    }

    const syncType = week ? `results_week_${week}` : 'results_season'
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: syncType,
      season,
      week: week ?? null,
      status: 'success',
      records_affected: updatedGames,
      error_message: null,
    })

    return {
      ok: true,
      records: updatedGames,
      elapsed_ms: Date.now() - t0,
      detail: `Updated ${updatedGames} games`,
    }
  } catch (err: any) {
    const error = String(err?.message ?? err)
    await db.from('sync_log').insert({
      sport_id: 'cfb',
      sync_type: week ? `results_week_${week}` : 'results_season',
      season,
      week: week ?? null,
      status: 'error',
      records_affected: null,
      error_message: error,
    })
    return { ok: false, error }
  }
}

// ---------------------------------------------------------------------------
// Grading helpers
// ---------------------------------------------------------------------------

async function gradeGamePicks(db: ReturnType<typeof createServiceClient>, season: number, week?: number) {
  // Fetch completed games with scores
  let query = db
    .from('games')
    .select('id, home_team_id, away_team_id, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('status', GAME_STATUS.COMPLETED)

  if (week) query = query.eq('week', week)

  const { data: games } = await query
  if (!games?.length) return

  for (const game of games) {
    if (game.home_team_points === null || game.away_team_points === null) continue
    const winnerId =
      game.home_team_points > game.away_team_points ? game.home_team_id : game.away_team_id

    // Find all picks for this game
    const { data: picks } = await db
      .from('predictions_game')
      .select('id, picked_team_id')
      .eq('game_id', game.id)

    if (!picks?.length) continue

    for (const pick of picks) {
      const isCorrect = pick.picked_team_id === winnerId
      await db.from('predictions_game').update({
        is_correct: isCorrect,
        points_awarded: isCorrect ? 1 : 0,
      }).eq('id', pick.id)
    }
  }
}

async function gradePredictionRecords(db: ReturnType<typeof createServiceClient>, season: number) {
  const { data: games } = await db
    .from('games')
    .select('home_team_id, away_team_id, home_team_points, away_team_points')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('season_type', 'regular')
    .eq('status', GAME_STATUS.COMPLETED)

  if (!games?.length) return

  // Tally wins per team
  const wins: Record<string, number> = {}
  const losses: Record<string, number> = {}

  for (const g of games) {
    if (!g.home_team_id || !g.away_team_id || g.home_team_points === null || g.away_team_points === null) continue
    const homeWon = g.home_team_points > g.away_team_points
    const winnerId = homeWon ? g.home_team_id : g.away_team_id
    const loserId = homeWon ? g.away_team_id : g.home_team_id
    wins[winnerId] = (wins[winnerId] ?? 0) + 1
    losses[loserId] = (losses[loserId] ?? 0) + 1
  }

  const { data: preds } = await db
    .from('predictions_record')
    .select('id, team_id, predicted_wins')

  if (!preds?.length) return

  for (const pred of preds) {
    const actualWins = wins[pred.team_id] ?? 0
    const actualLosses = losses[pred.team_id] ?? 0
    const diff = Math.abs(pred.predicted_wins - actualWins)
    // Scoring: exact = 3pts, off by 1 = 1pt, else 0
    const points = diff === 0 ? 3 : diff === 1 ? 1 : 0
    await db.from('predictions_record').update({
      actual_wins: actualWins,
      actual_losses: actualLosses,
      is_correct: diff === 0,
      points_awarded: points,
    }).eq('id', pred.id)
  }
}

async function gradePredictionStandings(db: ReturnType<typeof createServiceClient>, season: number) {
  // Count conference wins per team for the season
  const { data: games } = await db
    .from('games')
    .select('home_team_id, away_team_id, home_team_points, away_team_points, conference_game')
    .eq('sport_id', 'cfb')
    .eq('season', season)
    .eq('season_type', 'regular')
    .eq('status', GAME_STATUS.COMPLETED)
    .eq('conference_game', true)

  if (!games?.length) return

  const confWins: Record<string, number> = {}
  for (const g of games) {
    if (!g.home_team_id || !g.away_team_id || g.home_team_points === null || g.away_team_points === null) continue
    const homeWon = g.home_team_points > g.away_team_points
    const winnerId = homeWon ? g.home_team_id : g.away_team_id
    confWins[winnerId] = (confWins[winnerId] ?? 0) + 1
  }

  // Get all conferences and their teams
  const { data: confs } = await db
    .from('conferences')
    .select('id, teams(id)')
    .eq('sport_id', 'cfb')

  if (!confs?.length) return

  // Calculate actual rank within each conference (1 = most conf wins)
  const actualRankByTeam: Record<string, number> = {}
  for (const conf of confs) {
    const teams = (conf.teams ?? []) as { id: string }[]
    const ranked = [...teams].sort(
      (a, b) => (confWins[b.id] ?? 0) - (confWins[a.id] ?? 0)
    )
    ranked.forEach((t, idx) => {
      actualRankByTeam[t.id] = idx + 1
    })
  }

  const { data: preds } = await db
    .from('predictions_standings')
    .select('id, team_id, predicted_rank')

  if (!preds?.length) return

  for (const pred of preds) {
    const actualRank = actualRankByTeam[pred.team_id] ?? null
    if (actualRank === null) continue
    const diff = Math.abs(pred.predicted_rank - actualRank)
    // Scoring: exact = 3pts, off by 1 = 1pt, else 0
    const points = diff === 0 ? 3 : diff === 1 ? 1 : 0
    await db.from('predictions_standings').update({
      actual_rank: actualRank,
      points_awarded: points,
    }).eq('id', pred.id)
  }
}
