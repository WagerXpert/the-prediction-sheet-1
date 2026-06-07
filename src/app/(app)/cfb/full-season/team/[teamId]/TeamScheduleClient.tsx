'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  backHref: string
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function actualWinnerId(game: FSGame): string | null {
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

function computeStandings(teams: ConferenceTeamRow[], games: ConferenceGameRow[], picks: Record<string, string>) {
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

// ── Compact team chip ─────────────────────────────────────────────

function TeamChip({
  team,
  isWinner,
  isLoser,
  isCurrentTeam,
}: {
  team: FSGame['home_team'] | null
  isWinner: boolean
  isLoser: boolean
  isCurrentTeam: boolean
}) {
  if (!team) return <span className="text-sm text-zinc-300 w-24">TBD</span>
  const abbr = team.abbreviation ?? team.name.slice(0, 5)
  return (
    <div className={`flex items-center gap-2 w-28 shrink-0 ${isLoser ? 'opacity-30' : ''}`}>
      {team.logo_url ? (
        <img src={team.logo_url} alt={abbr} className="w-5 h-5 object-contain shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
      )}
      <span className={`text-sm truncate ${isCurrentTeam ? 'font-black' : 'font-semibold'} ${isWinner ? 'text-[#3f6212]' : 'text-zinc-700'}`}>
        {abbr}
      </span>
    </div>
  )
}

export default function TeamScheduleClient({
  sessionId,
  teamId,
  games: initialGames,
  conferenceTeams,
  conferenceGames,
  initialPicks,
  backHref,
}: Props) {
  const router = useRouter()

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

  let teamWins = 0, teamLosses = 0, gamesLeft = 0
  for (const g of initialGames) {
    const actual = actualWinnerId(g)
    const w = actual ?? picks[g.id] ?? null
    if (w) {
      if (w === teamId) teamWins++
      else teamLosses++
    } else {
      gamesLeft++
    }
  }

  const completedCount = initialGames.filter(g => g.status === 'completed').length
  const predictedFuture = initialGames.filter(g => g.status !== 'completed' && picks[g.id]).length

  // Group by week
  const byWeek = new Map<number, FSGame[]>()
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
          {(teamWins + teamLosses) > 0 ? (
            <span className="text-sm font-black">
              {teamWins}–{teamLosses}
              {gamesLeft > 0 && <span className="text-zinc-400 font-normal ml-1.5">projected · {gamesLeft} unpicked</span>}
              {gamesLeft === 0 && <span className="text-[#65a30d] font-normal ml-1.5">projected final</span>}
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

      {/* Progress bar */}
      {initialGames.length > completedCount && (
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

      {/* Conference standings */}
      {conferenceTeams.length > 1 && (
        <div className="mb-6 rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Conference Standings {completedCount > 0 && <span className="font-normal normal-case text-zinc-300">· actual + projected</span>}
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {standings.map((row, idx) => {
              const isCurrent = row.team.id === teamId
              return (
                <div key={row.team.id} className={`flex items-center gap-2 px-4 py-2 text-xs ${isCurrent ? 'bg-[#84cc16]/10' : ''}`}>
                  <span className="w-4 text-zinc-400 shrink-0">{idx + 1}</span>
                  {row.team.logo_url ? (
                    <img src={row.team.logo_url} alt={row.team.name} className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-zinc-200 shrink-0" />
                  )}
                  <span className={`flex-1 truncate ${isCurrent ? 'font-black' : 'font-medium'} text-zinc-700`}>{row.team.name}</span>
                  <span className="text-zinc-500 tabular-nums">{row.wins}–{row.losses}</span>
                  <span className="text-zinc-300 tabular-nums w-14 text-right">{row.confWins}–{row.confLosses} conf</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Game list — compact rows */}
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Week {week}</span>
                </div>
                {weekGames.map((game, gi) => {
                  const isCompleted = game.status === 'completed'
                  const actual = actualWinnerId(game)
                  const pickedId = picks[game.id] ?? null
                  const displayWinnerId = actual ?? pickedId
                  const awayAbbr = game.away_team?.abbreviation ?? game.away_team?.name.slice(0, 5) ?? '?'
                  const homeAbbr = game.home_team?.abbreviation ?? game.home_team?.name.slice(0, 5) ?? '?'
                  const isSaving = savingGame === game.id
                  const isLastInWeek = gi === weekGames.length - 1
                  const isLastWeek = wi === weeks.length - 1

                  return (
                    <div
                      key={game.id}
                      className={`flex items-center gap-3 px-4 py-3 ${!isLastInWeek || !isLastWeek ? 'border-b border-zinc-100' : ''} hover:bg-zinc-50/60 transition-colors`}
                    >
                      {/* Date + badges stacked */}
                      <div className="shrink-0 w-16 text-right space-y-0.5">
                        <div className="text-xs text-zinc-400">
                          {game.game_date ? formatShortDate(game.game_date) : `Wk ${week}`}
                        </div>
                        <div className="flex justify-end gap-1">
                          {game.conference_game && <span className="text-[9px] font-bold text-zinc-300 uppercase">CONF</span>}
                          {isCompleted && <span className="text-[9px] font-bold text-zinc-400 uppercase">Final</span>}
                        </div>
                      </div>

                      {/* Matchup */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamChip
                          team={game.away_team}
                          isWinner={displayWinnerId === game.away_team?.id}
                          isLoser={displayWinnerId !== null && displayWinnerId !== game.away_team?.id}
                          isCurrentTeam={game.away_team?.id === teamId}
                        />
                        <span className="text-xs text-zinc-300 shrink-0">
                          {game.neutral_site ? 'vs' : '@'}
                        </span>
                        <TeamChip
                          team={game.home_team}
                          isWinner={displayWinnerId === game.home_team?.id}
                          isLoser={displayWinnerId !== null && displayWinnerId !== game.home_team?.id}
                          isCurrentTeam={game.home_team?.id === teamId}
                        />
                      </div>

                      {/* Pick area */}
                      <div className="shrink-0 flex items-center justify-end w-32">
                        {isCompleted ? (
                          <span className="text-sm font-semibold text-zinc-500 tabular-nums">
                            {game.away_team_points}–{game.home_team_points}
                          </span>
                        ) : isSaving ? (
                          <span className="text-xs text-zinc-300">Saving…</span>
                        ) : pickedId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#65a30d]">
                              {pickedId === game.away_team?.id ? awayAbbr : homeAbbr}
                            </span>
                            <span className="text-xs text-[#65a30d] font-black">✓</span>
                            <button
                              onClick={() => {
                                const newPicks = { ...picks }
                                delete newPicks[game.id]
                                setPicks(newPicks)
                              }}
                              className="text-xs text-zinc-300 hover:text-zinc-500 ml-1 leading-none"
                              title="Clear pick"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => game.away_team && handlePick(game.id, game.away_team.id)}
                              className="px-3 py-1 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:border-[#84cc16] hover:bg-[#84cc16]/10 hover:text-[#3f6212] transition-all"
                            >
                              {awayAbbr}
                            </button>
                            <button
                              onClick={() => game.home_team && handlePick(game.id, game.home_team.id)}
                              className="px-3 py-1 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:border-[#84cc16] hover:bg-[#84cc16]/10 hover:text-[#3f6212] transition-all"
                            >
                              {homeAbbr}
                            </button>
                          </div>
                        )}
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
