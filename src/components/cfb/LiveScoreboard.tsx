'use client'
import { useEffect, useState, useCallback } from 'react'
import type { EspnLiveGame } from '@/lib/espn/client'

type LiveGame = EspnLiveGame & { gameId: string | null }

type ApiResponse = { games: LiveGame[]; fetchedAt: string } | { error: string }

const POLL_INTERVAL_MS = 30_000

function StatusBadge({ game }: { game: LiveGame }) {
  if (game.status === 'completed') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 px-2 py-0.5 bg-zinc-100 rounded-full">
        Final
      </span>
    )
  }
  const label =
    game.status === 'halftime'
      ? 'Halftime'
      : game.period > 0
        ? `${game.period}${ordinal(game.period)} — ${game.clock}`
        : 'Live'
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#65a30d]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
      {label}
    </span>
  )
}

function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

function ScoreRow({
  teamName,
  score,
  isLeading,
}: {
  teamName: string
  score: number | null
  isLeading: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-sm font-semibold truncate ${isLeading ? 'text-black' : 'text-zinc-500'}`}>
        {teamName}
      </span>
      {score !== null && (
        <span className={`text-sm font-black tabular-nums ${isLeading ? 'text-black' : 'text-zinc-400'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

export function LiveScoreboard({ week }: { week?: number }) {
  const [games, setGames]       = useState<LiveGame[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const fetchScores = useCallback(async () => {
    const params = new URLSearchParams()
    if (week) params.set('week', String(week))
    const res = await fetch(`/api/espn/live?${params}`)
    const data: ApiResponse = await res.json()
    if ('error' in data) {
      setError(data.error)
    } else {
      setGames(data.games)
      setFetchedAt(data.fetchedAt)
      setError(null)
    }
    setLoading(false)
  }, [week])

  useEffect(() => {
    fetchScores()
    const id = setInterval(fetchScores, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchScores])

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 animate-pulse h-28" />
    )
  }

  if (error) {
    return null
  }

  const liveGames      = games.filter(g => g.status === 'in_progress' || g.status === 'halftime')
  const completedGames = games.filter(g => g.status === 'completed')
  const hasAny         = games.length > 0

  if (!hasAny) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-700">
            Live Scores
          </h2>
          {liveGames.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#65a30d]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
              {liveGames.length} Live
            </span>
          )}
        </div>
        {fetchedAt && (
          <span className="text-[10px] text-zinc-400">
            Updated {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Live games first */}
        {liveGames.map(game => {
          const homeLeading =
            game.homeScore !== null &&
            game.awayScore !== null &&
            game.homeScore >= game.awayScore
          return (
            <div
              key={game.espnId}
              className="rounded-xl border border-[#84cc16]/40 bg-[#84cc16]/5 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <StatusBadge game={game} />
              </div>
              <div className="space-y-1">
                <ScoreRow
                  teamName={game.awayTeamLocation}
                  score={game.awayScore}
                  isLeading={!homeLeading}
                />
                <ScoreRow
                  teamName={game.homeTeamLocation}
                  score={game.homeScore}
                  isLeading={homeLeading}
                />
              </div>
            </div>
          )
        })}

        {/* Final scores */}
        {completedGames.map(game => {
          const homeWon =
            game.homeScore !== null &&
            game.awayScore !== null &&
            game.homeScore > game.awayScore
          return (
            <div
              key={game.espnId}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <StatusBadge game={game} />
              </div>
              <div className="space-y-1">
                <ScoreRow
                  teamName={game.awayTeamLocation}
                  score={game.awayScore}
                  isLeading={!homeWon}
                />
                <ScoreRow
                  teamName={game.homeTeamLocation}
                  score={game.homeScore}
                  isLeading={homeWon}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
