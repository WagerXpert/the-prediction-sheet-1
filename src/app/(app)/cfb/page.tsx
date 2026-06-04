import type { Metadata } from 'next'
import Link from 'next/link'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getCfbConferencesWithTeams } from '@/lib/data/cfb'

export const metadata: Metadata = { title: 'CFB Hub' }

export default async function CFBHubPage() {
  const conferences = await getCfbConferencesWithTeams()

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">
          {CURRENT_SEASON} CFB Season
        </p>
        <h1 className="text-4xl font-black">CFB Hub</h1>
        <p className="text-zinc-500 mt-1">Your home for college football predictions.</p>
      </div>

      {/* Full Season Mode — featured card */}
      <Link
        href="/cfb/full-season"
        className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 mb-5 rounded-2xl bg-black text-white hover:bg-zinc-900 transition-all group"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16]">
              Featured
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#84cc16] text-black">
              New
            </span>
          </div>
          <h3 className="text-2xl font-black">Full Season Mode</h3>
          <p className="text-zinc-400 text-sm mt-1 leading-relaxed max-w-lg">
            Select your conferences and predict the outcome of every game for every team.
            One pick updates every schedule, record, and standing automatically.
          </p>
        </div>
        <span className="text-[#84cc16] text-2xl font-black group-hover:translate-x-1 transition-transform shrink-0">
          →
        </span>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        {[
          {
            title: 'Season Records',
            desc: `Predict each team's win-loss record for the ${CURRENT_SEASON} season.`,
            badge: 'Open now',
            href: '/cfb/season-records',
          },
          {
            title: 'Conference Standings',
            desc: 'Rank every team in their conference from 1st to last.',
            badge: 'Open now',
            href: '/cfb/standings',
          },
          {
            title: 'Game Picks',
            desc: 'Pick the winner for every game, week by week.',
            badge: 'Open now',
            href: '/cfb/game-picks',
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex flex-col gap-3 p-6 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all"
          >
            <div className="flex-1">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit bg-green-100 text-green-700">
              {item.badge}
            </span>
          </Link>
        ))}
      </div>

      {conferences.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Conferences</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {conferences.map((conf) => (
              <Link
                key={conf.id}
                href={`/cfb/season-records/${conf.id}`}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-zinc-200 hover:border-[#84cc16] hover:bg-zinc-50 transition-colors text-center"
              >
                {conf.logo_url ? (
                  <img
                    src={conf.logo_url}
                    alt={conf.abbreviation}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <span className="text-xs font-black text-zinc-500">{conf.abbreviation}</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-700 leading-tight">
                  {conf.abbreviation}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="p-8 rounded-2xl bg-black text-white text-center">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-3">
          Season starts August 30
        </p>
        <h2 className="text-2xl font-black mb-2">Ready to lock in your picks?</h2>
        <p className="text-zinc-400 text-sm mb-5">
          Make your predictions now before the {CURRENT_SEASON} season kicks off.
        </p>
        <Link
          href="/signup"
          className="inline-block px-6 py-3 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#a3e635] transition-colors"
        >
          Create Free Account
        </Link>
      </div>
    </div>
  )
}
