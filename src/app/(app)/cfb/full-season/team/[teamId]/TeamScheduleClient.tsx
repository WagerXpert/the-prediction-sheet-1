'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FSGame, ConferenceGameRow, ConferenceTeamRow } from '@/lib/data/full-season'

interface Props {
  sessionId: string
  teamId: string
  games: FSGame[]
  conferenceTeams: ConferenceTeamRow[]
  conferenceGames: ConferenceGameRow[]
  initialPicks: Record<string, string>
  season: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function actualWinner(game: { status: string; home_team_points: number | null; away_team_points: number | null; home_team: { id: string } | null; away_team: { id: string } | null }): string | null {
  if (game.status !== 'completed' || game.home_team_points === null || game.away_team_points === null) return null
  return game.home_team_points > game.away_team_points
    ? game.home_team?.id ?? null
    : game.away_team?.id ?? null
}

function effectiveWinner(game: ConferenceGameRow, picks: Record<string, string>): string | null {
  if (game.status === 'completed' && game.home_team_points !== null && game.away_team_points !== null) {
    return game.home_team_points > game.away_team_points ? game.home_team_id ?? null : game.away_team_id ?? null
  }
  return picks[game.id] ?? null
}

// For FSGame (which has home_team/away_team objects, not just ids)
function effectiveWinnerFromGame(game: FSGame, picks: Record<string, string>): string | null {
  if (game.status === 'completed' && game.home_team_points !== null && game.away_team_points !== null) {
    return game.home_team_points > game.away_team_points
      ? game.home_team?.id ?? null
      : game.away_team?.id ?? null
  }
  return picks[game.id] ?? null
}

function computeStandings(
  teams: ConferenceTeamRow[],
  games: ConferenceGameRow[],
  picks: Record<string, string>
) {
  const records = new Map(teams.map(t => [t.id, { wins: 0, losses: 0, confWins: 0, confLosses: 0 }]))

  for (const game of games) {
    const winnerId = effectiveWinner(game, picks)
    if (!winnerId || !game.home_team_id || !game.away_team_id) continue
    const loserId = winnerId === game.home_team_id ? game.away_team_id : game.home_team_id

    const winRec = records.get(winnerId)
    const loseRec = records.get(loserId)
    if (winRec) { winRec.wins++; if (game.conference_game) winRec.confWins++ }
    if (loseRec) { loseRec.losses++; if (game.conference_game) loseRec.confLosses++ }
  }

  return teams
    .map(t => ({ team: t, ...records.get(t.id)! }))
    .sort((a, b) => b.confWins - a.confWins || b.wins - a.wins || a.team.name.localeCompare(b.team.name))
}

export default function TeamScheduleClient({
  sessionId,
  teamId,
  games: initialGames,
  conferenceTeams,
  conferenceGames,
  initialPicks,
}: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const base = { ...initialPicks }
    for (const g of initialGames) {
      if (g.winner_team_id) base[g.id] = g.winner_team_id
    }
    return base
  })
  const [, startTransition] = useTransition()
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const standings = useMemo(
    () => computeStandings(conferenceTeams, conferenceGames, picks),
    [conferenceTeams, conferenceGames, picks]
  )

  function handlePick(gameId: string, winnerTeamId: string) {
    setPicks(prev => ({ ...prev, [gameId]: winnerTeamId }))
    setSavingGame(gameId)

    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('full_season_predictions').upsert(
        { session_id: sessionId, game_id: gameId, winner_team_id: winnerTeamId, updated_at: new Date().toISOString() },
        { onConflict: 'session_id,game_id' }
      )
      setSavingGame(null)
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    })
  }

  // Projected record: actual results for completed games + picks for future games
  let teamWins = 0
  let teamLosses = 0
  let gamesLeft = 0
  for (const g of initialGames) {
    const w = effectiveWinnerFromGame(g, picks)
    if (w) {
      if (w === teamId) teamWins++
      else teamLosses++
    } else {
      gamesLeft++
    }
  }

  const completedCount = initialGames.filter(g => g.status === 'completed').length
  const predictedFuture = initialGames.filter(g => g.status !== 'completed' && picks[g.id]).length

  return (
    <div>
      {/* Record + save status */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          {(teamWins + teamLosses) > 0 ? (
            <span className="text-sm font-black">
              {teamWins}–{teamLosses}
              {gamesLeft > 0 && (
                <span className="text-zinc-400 font-normal ml-1.5">
                  projected · {gamesLeft} game{gamesLeft !== 1 ? 's' : ''} unpicked
                </span>
              )}
              {gamesLeft === 0 && (
                <span className="text-[#65a30d] font-normal ml-1.5">projected final record</span>
              )}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Pick winners to build your projected record</span>
          )}
        </div>
        <div className="text-xs text-zinc-400 flex items-center gap-1.5">
          {savingGame ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse inline-block" />Saving…</>
          ) : lastSaved ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] inline-block" />Saved {lastSaved}</>
          ) : predictedFuture > 0 ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" />All picks saved</>
          ) : null}
        </div>
      </div>

      {/* Progress bar (future games only) */}
      {initialGames.length > completedCount && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-zinc-400 mb-1.5">
            <span>
              {completedCount} actual · {predictedFuture} predicted
            </span>
            <span>{initialGames.length - completedCount - predictedFuture} remaining</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
            {/* Actual results portion */}
            <div
              className="h-full bg-zinc-400 rounded-l-full transition-all duration-300"
              style={{ width: `${(completedCount / initialGames.length) * 100}%` }}
            />
            {/* Predicted portion */}
            <div
              className="h-full bg-[#84cc16] transition-all duration-300"
              style={{ width: `${(predictedFuture / initialGames.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />Actual</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#84cc16] inline-block" />Your picks</span>
          </div>
        </div>
      )}

      {/* Conference standings */}
      {conferenceTeams.length > 1 && (
        <div className="mb-8 rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Conference Standings
              {completedCount > 0 && <span className="ml-2 font-normal text-zinc-400 normal-case">(actual + projected)</span>}
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {standings.map((row, idx) => {
              const isCurrentTeam = row.team.id === teamId
              return (
                <div
                  key={row.team.id}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm ${isCurrentTeam ? 'bg-[#84cc16]/10' : ''}`}
                >
                  <span className="w-5 text-zinc-400 font-medium text-xs shrink-0">{idx + 1}</span>
                  {row.team.logo_url ? (
                    <img src={row.team.logo_url} alt={row.team.name} className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-200 shrink-0" />
                  )}
                  <span className={`flex-1 truncate font-${isCurrentTeam ? 'black' : 'medium'} ${isCurrentTeam ? 'text-black' : 'text-zinc-700'}`}>
                    {row.team.name}
                  </span>
                  <span className="text-zinc-500 text-xs tabular-nums">{row.wins}–{row.losses}</span>
                  <span className="text-zinc-400 text-xs tabular-nums w-16 text-right">{row.confWins}–{row.confLosses} conf</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Game list */}
      {initialGames.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No schedule loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">An admin needs to run the schedule sync.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialGames.map(game => {
            const isCompleted = game.status === 'completed'
            const actualWinnerId = actualWinner(game)
            const pickedWinnerId = picks[game.id] ?? null
            const displayWinnerId = actualWinnerId ?? pickedWinnerId

            return (
              <div
                key={game.id}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
              >
                {/* Meta */}
                <div className="flex items-center gap-3 px-5 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-400">
                  <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">Wk {game.week}</span>
                  {game.game_date && <span>{formatDate(game.game_date)}</span>}
                  {game.conference_game && <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Conf</span>}
                  {isCompleted && <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-white">Final</span>}
                  {savingGame === game.id && <span className="ml-auto text-[#84cc16]">Saving…</span>}
                </div>

                {/* Teams */}
                <div className="flex items-stretch gap-3 px-5 py-4">
                  <TeamButton
                    team={game.away_team}
                    score={isCompleted ? game.away_team_points : null}
                    isWinner={displayWinnerId === game.away_team?.id}
                    isLoser={displayWinnerId !== null && displayWinnerId !== game.away_team?.id}
                    isActual={isCompleted}
                    isCurrentTeam={game.away_team?.id === teamId}
                    onClick={() => !isCompleted && game.away_team && handlePick(game.id, game.away_team.id)}
                  />
                  <div className="flex flex-col items-center justify-center shrink-0 text-zinc-300 font-semibold text-xs px-1">
                    {game.neutral_site ? 'vs' : '@'}
                  </div>
                  <TeamButton
                    team={game.home_team}
                    score={isCompleted ? game.home_team_points : null}
                    isWinner={displayWinnerId === game.home_team?.id}
                    isLoser={displayWinnerId !== null && displayWinnerId !== game.home_team?.id}
                    isActual={isCompleted}
                    isCurrentTeam={game.home_team?.id === teamId}
                    onClick={() => !isCompleted && game.home_team && handlePick(game.id, game.home_team.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TeamButton({
  team,
  score,
  isWinner,
  isLoser,
  isActual,
  isCurrentTeam,
  onClick,
}: {
  team: FSGame['home_team']
  score: number | null
  isWinner: boolean
  isLoser: boolean
  isActual: boolean
  isCurrentTeam: boolean
  onClick: () => void
}) {
  if (!team) {
    return (
      <div className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 text-zinc-300 text-sm flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-zinc-200 shrink-0" />
        <span>TBD</span>
      </div>
    )
  }

  let cls = 'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all border '
  cls += isActual ? 'cursor-default ' : 'cursor-pointer '

  if (isWinner && isActual) {
    cls += 'bg-zinc-800 text-white border-zinc-800'
  } else if (isWinner) {
    cls += 'bg-[#84cc16] border-[#84cc16] text-black shadow-sm'
  } else if (isLoser) {
    cls += 'bg-zinc-50 border-zinc-100 text-zinc-300'
  } else {
    cls += 'bg-white border-zinc-200 hover:border-[#84cc16] hover:shadow-sm text-zinc-800'
  }

  return (
    <button onClick={onClick} disabled={isActual} className={cls}>
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} className="w-6 h-6 object-contain shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
      )}
      <div className="min-w-0 flex-1">
        <span className={`block truncate leading-tight ${isCurrentTeam && !isLoser ? 'font-black' : ''}`}>
          {team.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {score !== null && (
            <span className={`text-xs font-bold ${isWinner ? 'opacity-90' : 'opacity-50'}`}>{score}</span>
          )}
          {!isActual && isWinner && <span className="text-xs font-bold opacity-70">W</span>}
          {!isActual && isLoser && <span className="text-xs font-medium opacity-50">L</span>}
          {isActual && isWinner && <span className="text-xs font-bold opacity-70">W</span>}
          {isActual && isLoser && <span className="text-xs font-medium opacity-50">L</span>}
        </div>
      </div>
    </button>
  )
}
