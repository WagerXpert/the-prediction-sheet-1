import type { Metadata } from 'next'
import Link from 'next/link'
import { CURRENT_SEASON, MAJOR_CONFERENCES } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'CFB Hub' }

export default function CFBHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-sm font-semibold text-[#65a30d] mb-4">
          🏈 {CURRENT_SEASON} CFB Season
        </div>
        <h1 className="text-4xl font-black">CFB Hub</h1>
        <p className="text-zinc-500 mt-2">Your home for college football predictions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {[
          {
            emoji: '📊',
            title: 'Season Records',
            desc: `Predict each team's win-loss record for the ${CURRENT_SEASON} season.`,
            badge: 'Open now',
            available: true,
          },
          {
            emoji: '🏆',
            title: 'Conference Standings',
            desc: 'Rank every team in their conference from 1st to last.',
            badge: 'Open now',
            available: true,
          },
          {
            emoji: '🎯',
            title: 'Game Picks',
            desc: 'Pick the winner for every game, week by week.',
            badge: 'Opens Week 1',
            available: false,
          },
        ].map((item) => (
          <div
            key={item.title}
            className={`flex flex-col gap-3 p-6 rounded-2xl border transition-all ${
              item.available
                ? 'border-zinc-200 hover:border-[#84cc16] hover:shadow-md'
                : 'border-zinc-100 bg-zinc-50'
            }`}
          >
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                item.available ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {item.badge}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-black mb-4">Conferences</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {MAJOR_CONFERENCES.map((conf) => (
            <div
              key={conf}
              className="px-3 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-center hover:border-[#84cc16] hover:bg-zinc-50 transition-colors"
            >
              {conf}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-black text-white text-center">
        <h2 className="text-2xl font-black mb-2">Ready to lock in your picks?</h2>
        <p className="text-zinc-400 text-sm mb-5">
          The {CURRENT_SEASON} season kicks off in late August. Make your predictions now.
        </p>
        <Link
          href="/signup"
          className="inline-block px-6 py-3 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors"
        >
          Create Free Account
        </Link>
      </div>
    </div>
  )
}
