import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbConferencesWithTeams } from '@/lib/data/cfb'

export const metadata: Metadata = { title: 'Season Record Predictions' }

export default async function SeasonRecordsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/cfb/season-records')

  const conferences = await getCfbConferencesWithTeams()

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Season Records</span>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-black">Season Record Predictions</h1>
        <p className="text-zinc-500 mt-1">
          Select a conference, pick a team, then call a W or L for each game on their schedule.
        </p>
      </div>

      {conferences.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-600 font-semibold">No team data loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">
            An admin needs to run the Teams sync from the admin panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {conferences.map((conf) => (
            <Link
              key={conf.id}
              href={`/cfb/season-records/${conf.id}`}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all bg-white text-center"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-[#84cc16]/10 transition-colors">
                <span className="text-sm font-black text-zinc-600 group-hover:text-[#65a30d] transition-colors">
                  {conf.abbreviation}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{conf.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{conf.teams.length} teams</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
