import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeasonLeaderboard, getWeeklyLeaderboard } from '@/lib/data/leaderboard'
import { getCfbAvailableWeeks, getOpenWeek } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Leaderboard' }

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { view, week: weekParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  // Two views: 'season' (Full Season Mode) and 'pickem' (CFB Pick'em weekly)
  const isPickem = view === 'pickem'
  const isSeasonView = !isPickem

  const [availableWeeks, openWeek] = await Promise.all([
    getCfbAvailableWeeks(),
    getOpenWeek(),
  ])

  // Default to the most recently completed week for pick'em view
  const completedWeeks = openWeek !== null
    ? availableWeeks.filter(w => w < openWeek)
    : availableWeeks

  const defaultPickemWeek = completedWeeks.at(-1) ?? availableWeeks[0] ?? 1
  const week = typeof weekParam === 'string' ? parseInt(weekParam, 10) || defaultPickemWeek : defaultPickemWeek

  const [seasonEntries, weeklyEntries] = await Promise.all([
    isSeasonView ? getSeasonLeaderboard() : Promise.resolve([]),
    isPickem ? getWeeklyLeaderboard(week) : Promise.resolve([]),
  ])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-sm font-semibold text-[#65a30d] mb-4">
          {CURRENT_SEASON} CFB Season
        </div>
        <h1 className="text-3xl font-black">Leaderboard</h1>
        <p className="text-zinc-500 mt-1">
          Two competition tracks — choose a view below.
        </p>
      </div>

      {/* ── Top toggle ── */}
      <div className="flex gap-2 mb-8 p-1 bg-zinc-100 rounded-2xl w-fit">
        <Link
          href="/leaderboard"
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            isSeasonView
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Full Season
        </Link>
        <Link
          href={`/leaderboard?view=pickem&week=${week}`}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
            isPickem
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          CFB Pick&apos;em
        </Link>
      </div>

      {/* ── Full Season view ── */}
      {isSeasonView && (
        <>
          <div className="mb-6 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-500 leading-relaxed space-y-1.5">
            <p className="font-bold text-zinc-700 text-sm">Full Season Leaderboard</p>
            <p>Rankings are based on submitting game picks through Full Season Mode — conference game picks, records, and standings. You must have an active Full Season session to appear here.</p>
            <p><span className="font-semibold text-zinc-600">How you rank:</span> points are earned per correctly predicted game winner, season record call, and conference standings placement.</p>
          </div>
          <SeasonTable entries={seasonEntries} currentUserId={currentUserId} />
        </>
      )}

      {/* ── CFB Pick'em view ── */}
      {isPickem && (
        <>
          <div className="mb-6 rounded-xl bg-[#84cc16]/5 border border-[#84cc16]/30 px-4 py-3 text-xs leading-relaxed space-y-1.5">
            <p className="font-bold text-zinc-700 text-sm">CFB Pick&apos;em Leaderboard</p>
            <p className="text-zinc-500">Rankings are based on weekly game picks — pick the winner of every CFB game each week through the Pick&apos;em mode. One week is open at a time; picks lock at kickoff.</p>
            <p className="text-zinc-500"><span className="font-semibold text-zinc-600">How to qualify:</span> go to <Link href="/cfb/game-picks" className="font-bold text-[#65a30d] underline underline-offset-2">CFB Pick&apos;em</Link> in the CFB Hub and submit picks for any open week.</p>
          </div>

          {/* Week selector */}
          {availableWeeks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {availableWeeks.map((w) => {
                const isCompleted = openWeek === null || w < openWeek
                const isOpen = openWeek !== null && w === openWeek
                if (!isCompleted && !isOpen) return null
                return (
                  <Link
                    key={w}
                    href={`/leaderboard?view=pickem&week=${w}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                      w === week
                        ? 'bg-[#84cc16] text-black border-[#84cc16]'
                        : isOpen
                        ? 'bg-[#84cc16]/10 text-[#3f6212] border-[#84cc16]/40 hover:border-[#84cc16]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {w === 0 ? 'Week 0' : `Week ${w}`}
                    {isOpen && <span className="ml-1.5 text-[9px] font-bold text-[#65a30d]">LIVE</span>}
                  </Link>
                )
              })}
            </div>
          )}

          {availableWeeks.length === 0 ? (
            <EmptyState message="No schedule loaded yet. Check back after the schedule sync." />
          ) : (
            <WeeklyTable entries={weeklyEntries} week={week} currentUserId={currentUserId} />
          )}
        </>
      )}

    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-sm font-bold text-zinc-400 w-6 text-center inline-block">{rank}</span>
}

function YouBadge() {
  return (
    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-black bg-[#84cc16] text-black leading-none">
      YOU
    </span>
  )
}

function SeasonTable({
  entries,
  currentUserId,
}: {
  entries: Awaited<ReturnType<typeof getSeasonLeaderboard>>
  currentUserId: string | null
}) {
  if (entries.length === 0) {
    return <EmptyState message="No Full Season picks submitted yet. Be the first to make your picks!" />
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
          {entries.map((entry) => {
            const isMe = entry.userId === currentUserId
            return (
              <tr
                key={entry.userId}
                className={`transition-colors ${
                  isMe
                    ? 'bg-[#84cc16]/10 hover:bg-[#84cc16]/15'
                    : 'bg-white hover:bg-zinc-50/60'
                }`}
              >
                <td className="px-5 py-3.5">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-4 py-3.5">
                  <span className={`font-semibold ${isMe ? 'text-black' : ''}`}>
                    {entry.displayName}
                  </span>
                  {entry.username && (
                    <span className="ml-2 text-xs text-zinc-400">@{entry.username}</span>
                  )}
                  {isMe && <YouBadge />}
                </td>
                <td className="px-4 py-3.5 text-center text-zinc-600">{entry.gamePoints}</td>
                <td className="px-4 py-3.5 text-center text-zinc-600">{entry.recordPoints}</td>
                <td className="px-4 py-3.5 text-center text-zinc-600">{entry.standingsPoints}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className="font-black text-base">{entry.totalPoints}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WeeklyTable({
  entries,
  week,
  currentUserId,
}: {
  entries: Awaited<ReturnType<typeof getWeeklyLeaderboard>>
  week: number
  currentUserId: string | null
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        message={`No picks submitted for Week ${week} yet — or games haven't been graded. Make your picks at CFB Pick'em to appear here.`}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Week {week} — CFB Pick&apos;em Rankings
        </p>
        <p className="text-xs text-zinc-400">{entries.length} player{entries.length !== 1 ? 's' : ''}</p>
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
          {entries.map((entry) => {
            const isMe = entry.userId === currentUserId
            return (
              <tr
                key={entry.userId}
                className={`transition-colors ${
                  isMe
                    ? 'bg-[#84cc16]/10 hover:bg-[#84cc16]/15'
                    : 'bg-white hover:bg-zinc-50/60'
                }`}
              >
                <td className="px-5 py-3.5">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-4 py-3.5">
                  <span className={`font-semibold ${isMe ? 'text-black' : ''}`}>
                    {entry.displayName}
                  </span>
                  {entry.username && (
                    <span className="ml-2 text-xs text-zinc-400">@{entry.username}</span>
                  )}
                  {isMe && <YouBadge />}
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-zinc-700">
                  {entry.correct}/{entry.total}
                </td>
                <td className="px-4 py-3.5 text-center text-zinc-400 text-xs">
                  {entry.total} games
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="font-black text-base">{entry.points}</span>
                </td>
              </tr>
            )
          })}
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
