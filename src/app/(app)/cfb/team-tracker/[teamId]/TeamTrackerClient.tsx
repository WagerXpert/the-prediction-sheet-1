'use client'

import { useState, useTransition } from 'react'
import type { TTGame } from '@/lib/data/team-tracker'
import { saveTeamTrackerPickAction } from './actions'

interface Props {
  userId: string
  teamId: string
  games: TTGame[]
  season: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

type Team = NonNullable<TTGame['home_team']>

function TeamButton({
  team,
  score,
  isWinner,
  isLoser,
  isActual,
  isTrackedTeam,
  onClick,
}: {
  team: Team | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
  isActual: boolean
  isTrackedTeam: boolean
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

  if (isWinner && isActual) cls += 'bg-zinc-800 text-white border-zinc-800'
  else if (isWinner) cls += 'bg-[#84cc16] border-[#84cc16] text-black shadow-sm'
  else if (isLoser) cls += 'bg-zinc-50 border-zinc-100 text-zinc-300'
  else cls += 'bg-white border-zinc-200 hover:border-[#84cc16] hover:shadow-sm text-zinc-800'

  return (
    <button onClick={onClick} disabled={isActual} className={cls}>
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} className="w-6 h-6 object-contain shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
      )}
      <div className="min-w-0 flex-1">
        <span className={`block truncate leading-tight ${isTrackedTeam && !isLoser ? 'font-black' : ''}`}>
          {team.name}
        </span>
        {score !== null && (
          <span className={`text-xs font-bold block mt-0.5 ${isWinner ? 'opacity-90' : 'opacity-40'}`}>{score}</span>
        )}
      </div>
      {isWinner && <span className={`text-xs font-bold shrink-0 ${isActual ? 'opacity-60' : ''}`}>W</span>}
      {isLoser && <span className="text-xs font-medium shrink-0 opacity-40">L</span>}
    </button>
  )
}

export default function TeamTrackerClient({ teamId, games: initialGames, season }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const g of initialGames) {
      if (g.user_pick) m[g.id] = g.user_pick
    }
    return m
  })
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handlePick(gameId: string, teamIdPick: string, trackedTeamId: string) {
    setPicks(prev => ({ ...prev, [gameId]: teamIdPick }))
    setSavingGame(gameId)

    startTransition(async () => {
      await saveTeamTrackerPickAction(trackedTeamId, gameId, teamIdPick, season)
      setSavingGame(null)
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    })
  }

  // Compute projected record: actual results + user picks for future games
  let projWins = 0, projLosses = 0, gamesLeft = 0
  for (const g of initialGames) {
    const winner = g.actual_winner ?? picks[g.id] ?? null
    if (winner) {
      if (winner === teamId) projWins++
      else projLosses++
    } else {
      gamesLeft++
    }
  }

  const completedCount = initialGames.filter(g => g.actual_winner !== null).length
  const predictedFuture = initialGames.filter(g => !g.actual_winner && picks[g.id]).length

  // Group games by week
  const byWeek = new Map<number, TTGame[]>()
  for (const g of initialGames) {
    const week = g.week ?? 0
    const list = byWeek.get(week) ?? []
    list.push(g)
    byWeek.set(week, list)
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b)

  return (
    <div>
      {/* Record + save status */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          {(projWins + projLosses) > 0 ? (
            <span className="text-sm font-black">
              {projWins}–{projLosses}
              {gamesLeft > 0 && (
                <span className="text-zinc-400 font-normal ml-1.5">
                  projected · {gamesLeft} game{gamesLeft !== 1 ? 's' : ''} unpicked
                </span>
              )}
              {gamesLeft === 0 && (
                <span className="text-[#65a30d] font-normal ml-1.5">projected final</span>
              )}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Click a team to start picking</span>
          )}
        </div>
        <div className="text-xs text-zinc-400 flex items-center gap-1.5">
          {savingGame ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse inline-block" />Saving…</>
          ) : lastSaved ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] inline-block" />Saved {lastSaved}</>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      {initialGames.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-zinc-400 mb-1.5">
            <span>{completedCount} actual · {predictedFuture} predicted</span>
            <span>{initialGames.length - completedCount - predictedFuture} remaining</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-zinc-400 transition-all duration-300"
              style={{ width: `${(completedCount / initialGames.length) * 100}%` }}
            />
            <div
              className="h-full bg-[#84cc16] transition-all duration-300"
              style={{ width: `${(predictedFuture / initialGames.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />Actual results
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#84cc16] inline-block" />Your picks
            </span>
          </div>
        </div>
      )}

      {/* Games by week */}
      {initialGames.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No schedule loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">An admin needs to run the schedule sync.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weeks.map(week => {
            const weekGames = byWeek.get(week)!
            return (
              <div key={week}>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Week {week}</p>
                <div className="space-y-3">
                  {weekGames.map(game => {
                    const isCompleted = game.actual_winner !== null
                    const pickedId = picks[game.id] ?? null
                    const displayWinnerId = game.actual_winner ?? pickedId

                    // For completed games: was the user's pick correct?
                    const pickResult = isCompleted && pickedId
                      ? pickedId === game.actual_winner ? 'correct' : 'incorrect'
                      : null

                    return (
                      <div
                        key={game.id}
                        className={`rounded-2xl border overflow-hidden ${
                          pickResult === 'correct'
                            ? 'border-[#84cc16]/60'
                            : pickResult === 'incorrect'
                              ? 'border-red-200'
                              : 'border-zinc-200'
                        } bg-white`}
                      >
                        {/* Meta row */}
                        <div className="flex items-center gap-3 px-5 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-400">
                          {game.game_date && <span>{formatDate(game.game_date)}</span>}
                          {game.conference_game && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Conf</span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-white">Final</span>
                          )}
                          {pickResult === 'correct' && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-[#84cc16]/20 text-[#65a30d] font-bold">Correct pick</span>
                          )}
                          {pickResult === 'incorrect' && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">Wrong pick</span>
                          )}
                          {savingGame === game.id && <span className="ml-auto text-[#84cc16]">Saving…</span>}
                        </div>

                        {/* Team buttons */}
                        <div className="flex items-stretch gap-3 px-5 py-4">
                          <TeamButton
                            team={game.away_team}
                            score={isCompleted ? game.away_team_points : null}
                            isWinner={displayWinnerId === game.away_team?.id}
                            isLoser={displayWinnerId !== null && displayWinnerId !== game.away_team?.id}
                            isActual={isCompleted}
                            isTrackedTeam={game.away_team?.id === teamId}
                            onClick={() => !isCompleted && game.away_team && handlePick(game.id, game.away_team.id, teamId)}
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
                            isTrackedTeam={game.home_team?.id === teamId}
                            onClick={() => !isCompleted && game.home_team && handlePick(game.id, game.home_team.id, teamId)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
