import type { Metadata } from 'next'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'CFB Hub' }

export default function CFBHubPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">
          {CURRENT_SEASON} CFB Season
        </p>
        <h1 className="text-4xl font-black">CFB Hub</h1>
        <p className="text-zinc-500 mt-1">Choose a prediction mode to get started.</p>
      </div>

      {/* Mode 1: Full Season Mode — featured */}
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
            Pick every game for your selected conferences. Automatically generates conference standings,
            crowns conference champions, and builds your full CFP playoff bracket — all from your picks.
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

      {/* Modes 2 & 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Mode 2: Team Season Tracker */}
        <Link
          href="/cfb/team-tracker"
          className="flex flex-col gap-4 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all group"
        >
          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">Team Mode</p>
            <h2 className="text-xl font-black">Team Season Tracker</h2>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              Follow any FBS team all season. Predict their game results week by week, then see exactly
              how your picks hold up as real games are played.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Any FBS Team', 'Pick by Pick', 'Track Accuracy'].map(tag => (
              <span key={tag} className="text-[11px] font-medium px-2 py-1 rounded-full bg-zinc-100 text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors">
            Pick a team →
          </span>
        </Link>

        {/* Mode 3: Playoff Mode */}
        <Link
          href="/cfb/playoff"
          className="flex flex-col gap-4 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all group"
        >
          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">Playoff Mode</p>
            <h2 className="text-xl font-black">CFP Bracket</h2>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              Jump straight to the 12-team College Football Playoff. Run a simulation to auto-fill the
              field, or hand-pick the teams yourself — then predict the bracket round by round.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Sim or Manual', '12-Team Field', 'Pick the Champion'].map(tag => (
              <span key={tag} className="text-[11px] font-medium px-2 py-1 rounded-full bg-zinc-100 text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors">
            Build bracket →
          </span>
        </Link>

      </div>
    </div>
  )
}
