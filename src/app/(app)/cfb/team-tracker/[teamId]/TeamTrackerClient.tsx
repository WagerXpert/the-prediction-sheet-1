'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TTGame } from '@/lib/data/team-tracker'
import { saveTeamTrackerPickAction } from './actions'

interface Props {
  userId: string
  teamId: string
  games: TTGame[]
  season: number
  backHref: string
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatGameTime(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

type Team = NonNullable<TTGame['home_team']>

function TeamPickButton({
  team,
  pickedId,
  actualWinner,
  isCurrentTeam,
  isCompleted,
  onClick,
}: {
  team: Team | null
  pickedId: string | null
  actualWinner: string | null
  isCurrentTeam: boolean
  isCompleted: boolean
  onClick: () => void
}) {
  if (!team) {
    return <div className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-300">TBD</div>
  }

  const isPicked = pickedId === team.id
  const isActualWinner = actualWinner === team.id
  const isActualLoser = actualWinner !== null && !isActualWinner

  let cls = 'flex-1 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all border '

  if (isCompleted) {
    if (isActualWinner && isPicked) {
      cls += 'bg-[#84cc16] text-black border-[#84cc16] cursor-default'
    } else if (isActualWinner) {
      cls += 'bg-zinc-100 text-zinc-600 border-zinc-200 cursor-default'
    } else if (isPicked && isActualLoser) {
      cls += 'bg-red-400 text-white border-red-400 cursor-default'
    } else {
      cls += 'bg-zinc-50 text-zinc-300 border-zinc-100 cursor-default opacity-50'
    }
  } else if (isPicked) {
    cls += 'bg-[#84cc16] text-black border-[#84cc16]'
  } else {
    cls += 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
  }

  return (
    <button onClick={onClick} disabled={isCompleted} className={cls}>
      <span className="flex items-center gap-2">
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="w-6 h-6 object-contain shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
        )}
        <span className={`leading-tight ${isCurrentTeam ? 'font-black' : ''}`}>{team.name}</span>
      </span>
    </button>
  )
}

export default function TeamTrackerClient({ teamId, games: initialGames, season, backHref }: Props) {
  const router = useRouter()

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

  function handlePick(gameId: string, teamIdPick: string) {
    setPicks(prev => ({ ...prev, [gameId]: teamIdPick }))
    setSavingGame(gameId)
    startTransition(async () => {
      await saveTeamTrackerPickAction(teamId, gameId, teamIdPick, season)
      setSavingGame(null)
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    })
  }

  // Compute projected record
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

  // Group by week
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
              {gamesLeft > 0 && <span className="text-zinc-400 font-normal ml-1.5">projected · {gamesLeft} unpicked</span>}
              {gamesLeft === 0 && <span className="text-[#65a30d] font-normal ml-1.5">projected final</span>}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Click a team abbreviation to pick</span>
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
            <div className="h-full bg-zinc-400 transition-all duration-300" style={{ width: `${(completedCount / initialGames.length) * 100}%` }} />
            <div className="h-full bg-[#84cc16] transition-all duration-300" style={{ width: `${(predictedFuture / initialGames.length) * 100}%` }} />
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
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          {weeks.map((week, wi) => {
            const weekGames = byWeek.get(week)!
            return (
              <div key={week}>
                <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Week {week || '?'}</span>
                </div>
                {weekGames.map((game, gi) => {
                  const isCompleted = game.actual_winner !== null
                  const pickedId = picks[game.id] ?? null
                  const isSaving = savingGame === game.id
                  const isLastInWeek = gi === weekGames.length - 1
                  const isLastWeek = wi === weeks.length - 1
                  const gameTime = formatGameTime(game.game_date)

                  return (
                    <div
                      key={game.id}
                      className={!isLastInWeek || !isLastWeek ? 'border-b border-zinc-100' : ''}
                    >
                      {/* Meta row */}
                      <div className="flex items-center gap-2 px-4 pt-2.5 text-xs text-zinc-400">
                        {game.game_date && <span>{formatShortDate(game.game_date)}</span>}
                        {gameTime && <span className="text-zinc-300">· {gameTime}</span>}
                        {game.conference_game && (
                          <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold uppercase tracking-wide">Conf</span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          {isCompleted ? (
                            <span className="font-semibold text-zinc-500 tabular-nums">
                              {game.away_team_points}–{game.home_team_points}
                            </span>
                          ) : isSaving ? (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse inline-block" />
                              Saving…
                            </span>
                          ) : pickedId ? (
                            <button
                              onClick={() => {
                                const newPicks = { ...picks }
                                delete newPicks[game.id]
                                setPicks(newPicks)
                              }}
                              className="flex items-center gap-1 text-zinc-300 hover:text-red-400 transition-colors"
                              title="Remove pick"
                            >
                              <TrashIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Pick buttons */}
                      <div className="flex items-center gap-2 px-4 pb-2.5 pt-2">
                        <TeamPickButton
                          team={game.away_team}
                          pickedId={pickedId}
                          actualWinner={game.actual_winner}
                          isCurrentTeam={game.away_team?.id === teamId}
                          isCompleted={isCompleted}
                          onClick={() => game.away_team && handlePick(game.id, game.away_team.id)}
                        />
                        <span className="text-zinc-300 text-xs font-semibold shrink-0">
                          {game.neutral_site ? 'vs' : '@'}
                        </span>
                        <TeamPickButton
                          team={game.home_team}
                          pickedId={pickedId}
                          actualWinner={game.actual_winner}
                          isCurrentTeam={game.home_team?.id === teamId}
                          isCompleted={isCompleted}
                          onClick={() => game.home_team && handlePick(game.id, game.home_team.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Done / Save Picks */}
      {initialGames.length > 0 && (
        <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            {gamesLeft === 0
              ? 'All games picked — picks save automatically.'
              : `${gamesLeft} game${gamesLeft !== 1 ? 's' : ''} still unpicked.`}
          </p>
          <button
            onClick={() => router.push(backHref)}
            className="shrink-0 px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors"
          >
            Done — Save Picks
          </button>
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
