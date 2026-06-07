import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Predictor'

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black">Welcome back, {name}</h1>
        <p className="text-zinc-500 mt-1">{CURRENT_SEASON} CFB Prediction Sheet</p>
      </div>

      {/* Featured: Full Season Mode */}
      <Link
        href="/cfb/full-season"
        className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-7 mb-5 rounded-2xl bg-black text-white hover:bg-zinc-900 transition-all group"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16]">Featured Mode</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#84cc16] text-black">Main</span>
          </div>
          <h2 className="text-2xl font-black">Full Season Mode</h2>
          <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed max-w-lg">
            Pick every game for your selected conferences. Generates conference standings,
            conference championships, and your full CFP playoff bracket — all from your picks.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['Game Picks', 'Conf Standings', 'Conf Championships', 'CFP Bracket'].map(tag => (
              <span key={tag} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/10 text-zinc-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span className="text-[#84cc16] text-2xl font-black group-hover:translate-x-1 transition-transform shrink-0">→</span>
      </Link>

      {/* Other two modes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          href="/cfb/team-tracker"
          className="flex flex-col gap-4 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all group"
        >
          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">Team Mode</p>
            <h2 className="text-xl font-black">Team Season Tracker</h2>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              Follow any FBS team all season. Predict their results week by week and track
              how accurate your picks are as games are played.
            </p>
          </div>
          <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors">
            Pick a team →
          </span>
        </Link>

        <Link
          href="/cfb/playoff"
          className="flex flex-col gap-4 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all group"
        >
          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">Playoff Mode</p>
            <h2 className="text-xl font-black">CFP Bracket</h2>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              Jump straight to the 12-team CFP bracket. Run a sim to auto-fill the field
              or hand-pick your teams, then predict round by round.
            </p>
          </div>
          <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors">
            Build bracket →
          </span>
        </Link>
      </div>
    </div>
  )
}
