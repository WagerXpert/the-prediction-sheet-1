import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white text-black">
      {/* ── Top nav ──────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
        <span className="text-xl font-black tracking-tight">
          THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold px-4 py-2 bg-[#84cc16] text-black rounded-lg hover:bg-[#65a30d] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-sm font-semibold text-[#65a30d]">
          🏈 2026 CFB Season · Pre-Season Predictions Open
        </div>

        <h1 className="text-5xl sm:text-7xl font-black leading-none tracking-tight max-w-3xl">
          Make Your
          <br />
          <span className="text-[#84cc16]">Predictions.</span>
          <br />
          Prove Them Right.
        </h1>

        <p className="text-lg text-zinc-500 max-w-xl leading-relaxed">
          Pick game winners, predict season records, and rank conference standings. Track your
          accuracy all season. Compete with friends.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/signup"
            className="px-8 py-4 bg-[#84cc16] text-black font-bold rounded-xl text-base hover:bg-[#65a30d] transition-colors shadow-lg shadow-lime-200"
          >
            Start Your Free Sheet →
          </Link>
          <Link
            href="/cfb"
            className="px-8 py-4 border border-zinc-200 text-black font-semibold rounded-xl text-base hover:bg-zinc-50 transition-colors"
          >
            View CFB Hub
          </Link>
        </div>
      </section>

      {/* ── Feature cards ────────────────────────────────── */}
      <section className="px-6 pb-24 w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              emoji: '🎯',
              title: 'Pick Game Winners',
              desc: 'Select the winner for every game, week by week. Your picks lock at kickoff.',
            },
            {
              emoji: '📊',
              title: 'Predict Season Records',
              desc: "Forecast each team's final win-loss record before the season starts.",
            },
            {
              emoji: '🏆',
              title: 'Rank Conference Standings',
              desc: 'Drag and drop teams to predict how each conference will finish.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 p-6 rounded-2xl border border-zinc-200 bg-white hover:border-[#84cc16] hover:shadow-md transition-all"
            >
              <span className="text-3xl">{f.emoji}</span>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="px-6 mb-16 w-full max-w-5xl mx-auto">
        <div className="rounded-2xl bg-black text-white p-12 text-center">
          <h2 className="text-3xl font-black mb-3">Ready to prove you know football?</h2>
          <p className="text-zinc-400 mb-6">
            The 2026 CFB season starts in late August. Lock in your predictions now.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="mt-auto border-t border-zinc-200 px-6 py-6 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} The Prediction Sheet. College football predictions for fans.
      </footer>
    </main>
  )
}
