import type { Metadata } from 'next'
import Link from 'next/link'
import { getSeasonLeaderboard, getWeeklyLeaderboard } from '@/lib/data/leaderboard'
import { getCfbAvailableWeeks } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Leaderboard' }

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { view, week: weekParam } = await searchParams
  const isWeekly = view === 'weekly'
  const week = typeof weekParam === 'string' ? parseInt(weekParam, 10) || 1 : 1

  const [seasonEntries, weeklyEntries, availableWeeks] = await Promise.all([
    isWeekly ? Promise.resolve([]) : getSeasonLeaderboard(),
    isWeekly ? getWeeklyLeaderboard(week) : Promise.resolve([]),
    getCfbAvailableWeeks(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-sm font-semibold text-[#65a30d] mb-4">
          {CURRENT_SEASON} CFB Season
        </div>
        <h1 className="text-3xl font-black">Leaderboard</h1>
        <p className="text-zinc-500 mt-1">Rankings update as games are graded.</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/leaderboard"
          className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            !isWeekly
              ? 'bg-black text-white border-black'
              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
          }`}
        >
          Season
        </Link>
        <Link
          href={`/leaderboard?view=weekly&week=${week || availableWeeks[0] || 1}`}
          className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            isWeekly
              ? 'bg-black text-white border-black'
              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
          }`}
        >
          Weekly Picks
        </Link>
      </div>

      {/* Weekly week selector */}
      {isWeekly && availableWeeks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableWeeks.map((w) => (
            <Link
              key={w}
              href={`/leaderboard?view=weekly&week=${w}`}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                w === week
                  ? 'bg-[#84cc16] text-black border-[#84cc16]'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              Week {w}
            </Link>
          ))}
        </div>
      )}

      {/* Season leaderboard */}
      {!isWeekly && (
        <SeasonTable entries={seasonEntries} />
      )}

      {/* Weekly leaderboard */}
      {isWeekly && (
        availableWeeks.length === 0 ? (
          <EmptyState message="No schedule loaded yet. Check back after the schedule sync." />
        ) : (
          <WeeklyTable entries={weeklyEntries} week={week} />
        )
      )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-sm font-bold text-zinc-400 w-6 text-center">{rank}</span>
}

function SeasonTable({
  entries,
}: {
  entries: Awaited<ReturnType<typeof getSeasonLeaderboard>>
}) {
  if (entries.length === 0) {
    return <EmptyState message="No predictions submitted yet. Be the first to make your picks!" />
  }

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            <th className="text-left px-5 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Player</th>
            <th className="text-center px-4 py-3">Picks</th>
            <th className="text-center px-4 py-3">Records</th>
            <th className="text-center px-4 py-3">Standings</th>
            <th className="text-center px-5 py-3">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className="bg-white hover:bg-zinc-50/60 transition-colors"
            >
              <td className="px-5 py-3.5">
                <RankBadge rank={entry.rank} />
              </td>
              <td className="px-4 py-3.5">
                <span className="font-semibold">{entry.displayName}</span>
                {entry.username && (
                  <span className="ml-2 text-xs text-zinc-400">@{entry.username}</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-center text-zinc-600">{entry.gamePoints}</td>
              <td className="px-4 py-3.5 text-center text-zinc-600">{entry.recordPoints}</td>
              <td className="px-4 py-3.5 text-center text-zinc-600">{entry.standingsPoints}</td>
              <td className="px-5 py-3.5 text-center">
                <span className="font-black text-base">{entry.totalPoints}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeeklyTable({
  entries,
  week,
}: {
  entries: Awaited<ReturnType<typeof getWeeklyLeaderboard>>
  week: number
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        message={`No picks submitted for Week ${week} yet, or games haven't been graded.`}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Week {week} — Game Picks</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            <th className="text-left px-5 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Player</th>
            <th className="text-center px-4 py-3">Correct</th>
            <th className="text-center px-4 py-3">Picked</th>
            <th className="text-center px-5 py-3">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className="bg-white hover:bg-zinc-50/60 transition-colors"
            >
              <td className="px-5 py-3.5">
                <RankBadge rank={entry.rank} />
              </td>
              <td className="px-4 py-3.5">
                <span className="font-semibold">{entry.displayName}</span>
                {entry.username && (
                  <span className="ml-2 text-xs text-zinc-400">@{entry.username}</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-center text-zinc-600">
                {entry.correct}/{entry.total}
              </td>
              <td className="px-4 py-3.5 text-center text-zinc-400 text-xs">
                {entry.total} games
              </td>
              <td className="px-5 py-3.5 text-center">
                <span className="font-black text-base">{entry.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
      <p className="text-zinc-500 font-medium">{message}</p>
    </div>
  )
}
