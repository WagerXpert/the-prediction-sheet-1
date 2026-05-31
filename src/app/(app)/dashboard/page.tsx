import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getUserScoreSummary } from '@/lib/data/scores'
import { getSeasonLeaderboard } from '@/lib/data/leaderboard'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, scoreSummary, leaderboard] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    getUserScoreSummary(user.id),
    getSeasonLeaderboard(),
  ])

  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Predictor'
  const myRank = leaderboard.find((e) => e.userId === user.id)?.rank ?? null

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Welcome back, {name} 👋</h1>
        <p className="text-zinc-500 mt-1">Your {CURRENT_SEASON} CFB Prediction Sheet</p>
      </div>

      {/* Score card */}
      <div className="mb-8 p-6 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-black">Your Score</h2>
          {myRank !== null && (
            <span className="px-3 py-1 rounded-full bg-black text-white text-sm font-bold">
              #{myRank} overall
            </span>
          )}
        </div>

        {!scoreSummary.hasAnyPredictions ? (
          <p className="text-zinc-400 text-sm">
            No predictions submitted yet — make your picks below to appear on the leaderboard.
          </p>
        ) : (
          <>
            <p className="text-4xl font-black mb-4">
              {scoreSummary.totalPoints}{' '}
              <span className="text-lg font-semibold text-zinc-400">pts</span>
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-100">
              <ScoreBreakdown
                label="Game Picks"
                points={scoreSummary.gamePoints}
                detail={
                  scoreSummary.gameGraded > 0
                    ? `${scoreSummary.gameCorrect}/${scoreSummary.gameGraded} correct`
                    : 'Not yet graded'
                }
              />
              <ScoreBreakdown
                label="Season Records"
                points={scoreSummary.recordPoints}
                detail={
                  scoreSummary.recordGraded > 0
                    ? `${scoreSummary.recordCorrect}/${scoreSummary.recordGraded} correct`
                    : 'Not yet graded'
                }
              />
              <ScoreBreakdown
                label="Standings"
                points={scoreSummary.standingsPoints}
                detail="End of season"
              />
            </div>
          </>
        )}
      </div>

      {/* Pre-season banner */}
      <div className="mb-8 flex items-start gap-3 p-4 rounded-2xl bg-[#84cc16]/10 border border-[#84cc16]/30">
        <span className="text-2xl mt-0.5">🏈</span>
        <div>
          <p className="font-semibold text-sm">Pre-Season Mode Active</p>
          <p className="text-sm text-zinc-600 mt-0.5">
            All predictions are open now. Lock in your season records, conference standings, and
            game picks before the {CURRENT_SEASON} season kicks off.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <PredictionCard
          emoji="📊"
          title="Season Records"
          desc={`Forecast each team's final win-loss record for ${CURRENT_SEASON}.`}
          href="/cfb/season-records"
          open
          cta="Make Predictions"
        />
        <PredictionCard
          emoji="🏆"
          title="Conference Standings"
          desc="Rank every team in their conference from top to bottom."
          href="/cfb/standings"
          open
          cta="Make Predictions"
        />
        <PredictionCard
          emoji="🎯"
          title="Game Picks"
          desc="Pick the winner for every game, week by week."
          href="/cfb/game-picks"
          open
          cta="Make Predictions"
        />
      </div>
    </div>
  )
}

function ScoreBreakdown({
  label,
  points,
  detail,
}: {
  label: string
  points: number
  detail: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black">{points}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{detail}</p>
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
