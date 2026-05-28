import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Predictor'

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Welcome back, {name} 👋</h1>
        <p className="text-zinc-500 mt-1">Your {CURRENT_SEASON} CFB Prediction Sheet</p>
      </div>

      <div className="mb-8 flex items-start gap-3 p-4 rounded-2xl bg-[#84cc16]/10 border border-[#84cc16]/30">
        <span className="text-2xl mt-0.5">🏈</span>
        <div>
          <p className="font-semibold text-sm">Pre-Season Mode Active</p>
          <p className="text-sm text-zinc-600 mt-0.5">
            Season record &amp; conference standing predictions are open now. Game picks unlock at
            Week 1 kickoff in late August.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <PredictionCard
          emoji="📊"
          title="Season Records"
          desc={`Forecast each team's final win-loss record for ${CURRENT_SEASON}.`}
          href="/cfb"
          open
          cta="Make Predictions"
        />
        <PredictionCard
          emoji="🏆"
          title="Conference Standings"
          desc="Rank every team in their conference from top to bottom."
          href="/cfb"
          open
          cta="Make Predictions"
        />
        <PredictionCard
          emoji="🎯"
          title="Game Picks"
          desc="Pick the winner for every game, week by week."
          href="/cfb"
          open={false}
          cta="Opens Week 1"
        />
      </div>
    </div>
  )
}

function PredictionCard({
  emoji,
  title,
  desc,
  href,
  open,
  cta,
}: {
  emoji: string
  title: string
  desc: string
  href: string
  open: boolean
  cta: string
}) {
  return (
    <div
      className={`flex flex-col gap-3 p-6 rounded-2xl border transition-all ${
        open
          ? 'border-zinc-200 hover:border-[#84cc16] hover:shadow-md'
          : 'border-zinc-100 bg-zinc-50 opacity-70'
      }`}
    >
      <span className="text-3xl">{emoji}</span>
      <div className="flex-1">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{desc}</p>
      </div>
      {open ? (
        <Link
          href={href}
          className="inline-block px-4 py-2 bg-[#84cc16] text-black font-semibold text-sm rounded-lg hover:bg-[#65a30d] transition-colors text-center"
        >
          {cta}
        </Link>
      ) : (
        <span className="inline-block px-4 py-2 bg-zinc-200 text-zinc-500 font-semibold text-sm rounded-lg text-center">
          {cta}
        </span>
      )}
    </div>
  )
}
