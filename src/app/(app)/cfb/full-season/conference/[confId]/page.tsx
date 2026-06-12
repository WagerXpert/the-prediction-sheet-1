import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession, getSessionDashboard } from '@/lib/data/full-season'
import { getLatestRankings } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conference Standings — Full Season Mode' }

export default async function FullSeasonConferencePage({
  params,
}: {
  params: Promise<{ confId: string }>
}) {
  const { confId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/full-season')

  const session = await getSession(user.id)
  if (!session) redirect('/cfb/full-season/setup')

  const [conferences, rankings] = await Promise.all([
    getSessionDashboard(session.id, CURRENT_SEASON),
    getLatestRankings(CURRENT_SEASON),
  ])

  const conf = conferences.find(c => c.id === confId)
  if (!conf) notFound()

  const sorted = [...conf.teams].sort((a, b) => {
    if (b.predicted_wins !== a.predicted_wins) return b.predicted_wins - a.predicted_wins
    if (a.predicted_losses !== b.predicted_losses) return a.predicted_losses - b.predicted_losses
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/full-season" className="hover:text-black transition-colors">Full Season Mode</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{conf.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {conf.logo_url ? (
          <img src={conf.logo_url} alt={conf.name} className="w-14 h-14 object-contain" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
            <span className="text-sm font-black text-zinc-500">{conf.abbreviation}</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black">{conf.name}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Projected standings based on your picks</p>
        </div>
      </div>

      {/* Standings table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center">
          <span className="w-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400"></span>
          <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Team</span>
          <span className="w-16 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-400">W–L</span>
          <span className="w-20 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-400">Picked</span>
        </div>

        {sorted.map((team, idx) => {
          const rank = rankings.get(team.id)
          const hasPicks = team.predicted_wins + team.predicted_losses > 0
          const isComplete = team.games_total > 0 && team.games_predicted === team.games_total

          return (
            <Link
              key={team.id}
              href={`/cfb/full-season/team/${team.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
            >
              <span className="w-5 text-sm font-black text-zinc-300 shrink-0">{idx + 1}</span>

              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-7 h-7 object-contain shrink-0" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full shrink-0"
                  style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }}
                />
              )}

              <span className="flex-1 font-bold text-sm truncate">
                {team.name}
                {rank && (
                  <span className="ml-1.5 text-[10px] font-black text-zinc-400">#{rank}</span>
                )}
              </span>

              <span className="w-16 text-right text-sm font-bold tabular-nums text-zinc-700">
                {hasPicks ? `${team.predicted_wins}–${team.predicted_losses}` : '—'}
              </span>

              <span className="w-20 text-right text-xs text-zinc-400 tabular-nums">
                {isComplete
                  ? <span className="text-[#65a30d] font-bold">✓ Done</span>
                  : `${team.games_predicted}/${team.games_total}`}
              </span>
            </Link>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-zinc-400 text-center">
        Records reflect your picks + any completed games. Click a team to make picks.
      </p>
    </div>
  )
}
