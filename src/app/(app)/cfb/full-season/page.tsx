import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, getSessionDashboard } from '@/lib/data/full-season'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import FullSeasonActions from './FullSeasonActions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Full Season Mode' }

export default async function FullSeasonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/full-season')

  const session = await getSession(user.id)
  if (!session) redirect('/cfb/full-season/setup')

  const conferences = await getSessionDashboard(session.id)
  if (conferences.length === 0) redirect('/cfb/full-season/setup')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Full Season Mode</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} Season
          </p>
          <h1 className="text-4xl font-black">Full Season Mode</h1>
          <p className="text-zinc-500 mt-1">
            Pick winners for every game. Your predicted records save automatically.
          </p>
        </div>
        <FullSeasonActions sessionId={session.id} />
      </div>

      {/* Conference sections */}
      <div className="space-y-10">
        {conferences.map(conf => {
          const done = conf.teams.filter(t => t.games_predicted > 0 && t.games_predicted === t.games_total).length
          const started = conf.teams.filter(t => t.games_predicted > 0).length

          return (
            <div key={conf.id}>
              {/* Conference header */}
              <div className="flex items-center gap-3 mb-4">
                {conf.logo_url ? (
                  <img src={conf.logo_url} alt={conf.abbreviation} className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <span className="text-xs font-black text-zinc-500">{conf.abbreviation}</span>
                  </div>
                )}
                <h2 className="text-xl font-black">{conf.name}</h2>
                <span className="text-sm text-zinc-400 font-medium">
                  {done}/{conf.teams.length} complete
                  {started > done && `, ${started - done} in progress`}
                </span>
              </div>

              {/* Team grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {conf.teams.map(team => {
                  const isComplete = team.games_total > 0 && team.games_predicted === team.games_total
                  const isStarted = team.games_predicted > 0
                  const hasPicks = team.predicted_wins + team.predicted_losses > 0

                  return (
                    <Link
                      key={team.id}
                      href={`/cfb/full-season/team/${team.id}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${
                        isComplete
                          ? 'border-[#84cc16] bg-green-50 hover:bg-green-100'
                          : isStarted
                            ? 'border-[#84cc16]/40 bg-zinc-50 hover:border-[#84cc16]'
                            : 'border-zinc-200 bg-white hover:border-zinc-400'
                      }`}
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-7 h-7 object-contain shrink-0" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate leading-tight">{team.name}</p>
                        {hasPicks ? (
                          <p className={`text-xs font-semibold mt-0.5 ${isComplete ? 'text-[#65a30d]' : 'text-zinc-500'}`}>
                            {team.predicted_wins}–{team.predicted_losses}
                            {!isComplete && (
                              <span className="font-normal text-zinc-400"> ({team.games_total - team.games_predicted} left)</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-300 mt-0.5">
                            {team.games_total > 0 ? `${team.games_total} games` : 'No schedule'}
                          </p>
                        )}
                      </div>

                      {isComplete && (
                        <span className="text-[#84cc16] shrink-0 font-bold text-base">✓</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
