import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 bg-black">
        <span className="text-xl font-black tracking-tight text-white">
          THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold px-4 py-2 bg-[#84cc16] text-black rounded-lg hover:bg-[#a3e635] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-black text-white px-6 pt-20 pb-24 flex flex-col items-start max-w-5xl mx-auto w-full">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-6">
          2026 CFB Season — Predictions Open
        </p>
        <h1 className="text-6xl sm:text-8xl font-black leading-none tracking-tight mb-6 uppercase">
          Make Your<br />
          <span className="text-[#84cc16]">Picks.</span><br />
          Back Them Up.
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mb-10 leading-relaxed">
          Predict game winners, season records, and conference standings.
          Compete against friends all season long.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="px-8 py-4 bg-[#84cc16] text-black font-black text-sm tracking-wide uppercase rounded-xl hover:bg-[#a3e635] transition-colors"
          >
            Create Your Free Sheet
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm tracking-wide uppercase rounded-xl hover:border-zinc-400 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Divider strip */}
      <div className="bg-[#84cc16] h-1.5 w-full" />

      {/* Feature list */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-12">
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <Feature
            number="01"
            title="Game Picks"
            desc="Pick the winner for every game, week by week. Your picks lock at kickoff. Points awarded for correct calls."
          />
          <Feature
            number="02"
            title="Season Records"
            desc="Go through each team's schedule and predict a win or loss for every game before the season starts."
          />
          <Feature
            number="03"
            title="Conference Standings"
            desc="Rank every team in their conference from first to last. Points based on how close your rankings land."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="bg-black text-white rounded-2xl px-10 py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-3">
              Season starts August 30
            </p>
            <h2 className="text-3xl font-black uppercase leading-tight">
              Think you know<br />college football?
            </h2>
          </div>
          <Link
            href="/signup"
            className="shrink-0 px-8 py-4 bg-[#84cc16] text-black font-black text-sm tracking-wide uppercase rounded-xl hover:bg-[#a3e635] transition-colors whitespace-nowrap"
          >
            Prove It Free
          </Link>
        </div>
      </section>

      <footer className="mt-auto border-t border-zinc-100 px-6 py-6 text-center text-xs text-zinc-400 uppercase tracking-widest">
        © {new Date().getFullYear()} The Prediction Sheet
      </footer>
    </main>
  )
}

function Feature({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div>
      <p className="text-4xl font-black text-[#84cc16] mb-3">{number}</p>
      <h3 className="text-lg font-black uppercase mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  )
}
