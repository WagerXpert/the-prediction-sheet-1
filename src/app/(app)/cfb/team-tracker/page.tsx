import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllFBSConferencesWithTeams } from '@/lib/data/team-tracker'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Team Season Tracker — CFB' }

export default async function TeamTrackerLandingPage() {
  const conferences = await getAllFBSConferencesWithTeams()

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Team Season Tracker</span>
      </div>

      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">
          {CURRENT_SEASON} CFB Season
        </p>
        <h1 className="text-4xl font-black">Team Season Tracker</h1>
        <p className="text-zinc-500 mt-1 max-w-xl">
          Pick a team and predict their results week by week. Track how your picks hold
          up as real games are played — no leaderboard, just your personal record.
        </p>
      </div>

      <div className="space-y-10">
        {conferences.map(conf => (
          <div key={conf.id}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
              {conf.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {conf.teams.map(team => (
                <Link
                  key={team.id}
                  href={`/cfb/team-tracker/${team.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-sm bg-white transition-all"
                >
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-7 h-7 object-contain shrink-0" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full shrink-0"
                      style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }}
                    />
                  )}
                  <span className="text-sm font-semibold truncate">{team.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
