import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'The Prediction Sheet — CFB Game Picks, Schedule Predictions & CFP Playoff Bracket',
  description:
    'Predict college football game winners week by week, track your team\'s full schedule, and fill out a 12-team CFP playoff bracket. The #1 CFB prediction platform. Free to play. Powered by WagerXpert.',
  alternates: { canonical: '/' },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'The Prediction Sheet',
      url: 'https://thepredictionsheet.com',
      description:
        'College football prediction platform offering week-by-week CFB game picks, full team schedule predictions, and 12-team CFP playoff bracket forecasting.',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript. Runs in any modern browser.',
      author: { '@type': 'Organization', name: 'WagerXpert' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free to play' },
      featureList: [
        'Week-by-week CFB game winner picks',
        'Full team season schedule predictions',
        '12-team CFP playoff bracket builder',
        'Season pick accuracy tracking',
        'Conference standings projection',
        'Simulated CFP field generator',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I predict college football games on The Prediction Sheet?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Choose Full Season Mode, select the conferences you want to follow, then pick a winner for every CFB game week by week. Your picks are saved automatically and graded as games are played.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the CFP playoff bracket prediction work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In CFP Bracket Mode you either run a simulation that auto-generates a realistic 12-team College Football Playoff field, or manually select and seed your own 12 teams. You then pick the winner of every first-round, quarterfinal, semifinal, and championship game to complete your bracket.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the 12-team CFP playoff format?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The CFP 12-team format awards automatic bids to each Power Four conference champion plus the highest-ranked Group of Five champion. Seeds 1–4 receive first-round byes. Seeds 5–12 play first-round games, advancing through quarterfinals and semifinals to reach the national championship.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I track predictions for a single team\'s schedule?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Team Season Tracker lets you follow any FBS team, predict each of their games, and see a running accuracy record as real results come in. Your projected win-loss record updates automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is the leaderboard ranking calculated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The leaderboard ranks players who pick every CFB game through Full Season Mode. Points are earned for each correctly predicted game winner across the regular season and playoff bracket.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is The Prediction Sheet free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The Prediction Sheet is completely free. Create an account and start making your college football picks immediately.',
          },
        },
      ],
    },
    {
      '@type': 'Organization',
      name: 'WagerXpert',
      url: 'https://thepredictionsheet.com',
      description: 'Sports prediction and analytics platform. Creator of The Prediction Sheet CFB picks app.',
    },
  ],
}

export default function LandingPage() {
  return (
    <>
      <Script id="structured-data" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>

      <main className="min-h-screen bg-white text-black flex flex-col">

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <header>
          <nav className="flex items-center justify-between px-6 py-4 bg-black" aria-label="Main navigation">
            <div className="flex items-center gap-3">
              <img
                src="/WagerXpert guy Logo transparent.png"
                alt="WagerXpert"
                className="h-10 w-auto object-contain shrink-0"
              />

              <div>
                <span className="text-lg font-black tracking-tight text-white leading-none block">
                  THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
                </span>
                <span className="text-[9px] font-semibold tracking-widest uppercase text-zinc-500 leading-none">
                  Powered by WagerXpert
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-bold px-4 py-2 bg-[#84cc16] text-black rounded-lg hover:bg-[#a3e635] transition-colors"
              >
                Get Started — Free
              </Link>
            </div>
          </nav>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section
          className="bg-black text-white px-6 pt-16 pb-20 flex flex-col items-start max-w-6xl mx-auto w-full"
          aria-labelledby="hero-heading"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#84cc16]/40 bg-[#84cc16]/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-[#84cc16]">
              2026 CFB Season — Predictions Open
            </span>
          </div>

          <h1
            id="hero-heading"
            className="text-5xl sm:text-7xl font-black leading-none tracking-tight mb-5 uppercase"
          >
            Predict Every<br />
            College Football<br />
            <span className="text-[#84cc16]">Game.</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-2xl mb-4 leading-relaxed">
            The Prediction Sheet is the most complete CFB prediction platform available —
            pick game winners week by week, forecast your team's full schedule, and
            build your 12-team CFP playoff bracket before the season ends.
          </p>
          <p className="text-zinc-500 text-sm max-w-xl mb-10 leading-relaxed">
            Track your accuracy against real results. Compete on the leaderboard against
            other pickers. Three distinct prediction modes. All free.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-[#84cc16] text-black font-black text-sm tracking-wide uppercase rounded-xl hover:bg-[#a3e635] transition-colors"
            >
              Create Your Free Sheet
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm tracking-wide uppercase rounded-xl hover:border-[#84cc16] hover:text-[#84cc16] transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mode chips */}
          <div className="flex flex-wrap gap-2" aria-label="Prediction modes">
            {[
              'Full Season Game Picks',
              'Team Schedule Tracker',
              'CFP Playoff Bracket',
            ].map(m => (
              <span
                key={m}
                className="px-3 py-1 rounded-full border border-zinc-700 text-xs font-semibold text-zinc-400"
              >
                {m}
              </span>
            ))}
          </div>
        </section>

        {/* ── Lime divider ─────────────────────────────────────────── */}
        <div className="bg-[#84cc16] h-1.5 w-full" aria-hidden="true" />

        {/* ── Quick stats bar ──────────────────────────────────────── */}
        <div className="bg-zinc-950 text-white px-6 py-5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { stat: '900+', label: 'CFB Games to Pick' },
              { stat: '10', label: 'FBS Conferences' },
              { stat: '134', label: 'FBS Teams' },
              { stat: '11', label: 'CFP Bracket Games' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <p className="text-2xl font-black text-[#84cc16]">{stat}</p>
                <p className="text-xs font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3 Modes ──────────────────────────────────────────────── */}
        <section
          className="px-6 py-20 max-w-6xl mx-auto w-full"
          aria-labelledby="modes-heading"
        >
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-3">
              Three Prediction Modes
            </p>
            <h2 id="modes-heading" className="text-4xl font-black uppercase leading-tight">
              Every Way to<br />Predict CFB
            </h2>
            <p className="text-zinc-500 text-base mt-3 max-w-2xl leading-relaxed">
              Whether you want to pick every college football game played this season, track a single
              team's wins and losses, or build your complete CFP bracket — there's a mode for it.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Mode 01 — Full Season */}
            <article
              className="rounded-2xl bg-black text-white p-7 flex flex-col"
              aria-labelledby="mode-fullseason"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-4xl font-black text-[#84cc16] leading-none">01</span>
                <span className="px-2 py-1 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-[10px] font-bold text-[#84cc16] uppercase tracking-wide">Featured</span>
              </div>
              <h3 id="mode-fullseason" className="text-xl font-black uppercase mb-3">
                Full Season Mode
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4 flex-1">
                Select the conferences you want to follow, then predict the winner of
                every single CFB game week by week throughout the entire regular season.
                Your picks automatically feed into projected conference standings,
                conference championships, and your CFP bracket seedings.
              </p>
              <ul className="space-y-2 mb-6" aria-label="Full Season Mode features">
                {[
                  'Pick every game across selected conferences',
                  'Live projected conference standings',
                  'Picks carry into conf. championship predictions',
                  'Leaderboard ranking based on weekly accuracy',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="text-[#84cc16] font-bold mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-auto w-full text-center px-5 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#a3e635] transition-colors"
              >
                Start Full Season →
              </Link>
            </article>

            {/* Mode 02 — Team Tracker */}
            <article
              className="rounded-2xl border-2 border-zinc-200 p-7 flex flex-col"
              aria-labelledby="mode-tracker"
            >
              <span className="text-4xl font-black text-[#84cc16] leading-none mb-5">02</span>
              <h3 id="mode-tracker" className="text-xl font-black uppercase mb-3">
                Team Season Tracker
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4 flex-1">
                Lock in on any FBS team and predict the outcome of every game on their
                schedule — win or loss, week by week. As real results come in, your
                prediction accuracy is tracked automatically so you can see how well you
                called the season.
              </p>
              <ul className="space-y-2 mb-6" aria-label="Team Season Tracker features">
                {[
                  'Follow any of 134 FBS teams',
                  'Predict each game on the team schedule',
                  'Real-time correct / incorrect accuracy stats',
                  'Running projected season record',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className="text-[#84cc16] font-bold mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-auto w-full text-center px-5 py-2.5 border-2 border-black text-black font-bold text-sm rounded-xl hover:bg-black hover:text-white transition-colors"
              >
                Track a Team →
              </Link>
            </article>

            {/* Mode 03 — CFP Bracket */}
            <article
              className="rounded-2xl border-2 border-zinc-200 p-7 flex flex-col"
              aria-labelledby="mode-cfp"
            >
              <span className="text-4xl font-black text-[#84cc16] leading-none mb-5">03</span>
              <h3 id="mode-cfp" className="text-xl font-black uppercase mb-3">
                CFP Playoff Bracket
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4 flex-1">
                Build and predict the full 12-team College Football Playoff bracket.
                Run a simulation that auto-generates a realistic CFP field based on
                the current season, or hand-pick and seed your own 12 teams. Then call
                every game from the first round through the national championship.
              </p>
              <ul className="space-y-2 mb-6" aria-label="CFP Bracket Mode features">
                {[
                  '12-team CFP format with first-round byes',
                  'Auto-sim or manual team selection',
                  'Pick all 11 games in the bracket',
                  'P4 conf. champions auto-seeded correctly',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className="text-[#84cc16] font-bold mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-auto w-full text-center px-5 py-2.5 border-2 border-black text-black font-bold text-sm rounded-xl hover:bg-black hover:text-white transition-colors"
              >
                Build My Bracket →
              </Link>
            </article>

          </div>
        </section>

        {/* ── Lime divider ─────────────────────────────────────────── */}
        <div className="bg-[#84cc16] h-px w-full" aria-hidden="true" />

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="px-6 py-20 bg-zinc-950 text-white" aria-labelledby="how-heading">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-3">
              Simple to Start
            </p>
            <h2 id="how-heading" className="text-3xl font-black uppercase mb-12">
              How it Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  n: '1',
                  title: 'Create a Free Account',
                  desc: 'Sign up in under 30 seconds. No credit card. No commitment. Just your college football predictions.',
                },
                {
                  n: '2',
                  title: 'Choose Your Mode',
                  desc: 'Pick Full Season, Team Tracker, or CFP Bracket — or run all three simultaneously to cover every angle.',
                },
                {
                  n: '3',
                  title: 'Make Your Picks',
                  desc: 'Select game winners week by week. Your predictions are saved automatically as you go.',
                },
                {
                  n: '4',
                  title: 'Track Your Accuracy',
                  desc: 'Watch your correct pick percentage update in real time as games are played throughout the season.',
                },
              ].map(({ n, title, desc }) => (
                <div key={n}>
                  <div className="w-10 h-10 rounded-full bg-[#84cc16] text-black flex items-center justify-center font-black text-base mb-4">
                    {n}
                  </div>
                  <h3 className="font-black text-base uppercase mb-2">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEO-rich keyword section ─────────────────────────────── */}
        <section className="px-6 py-20 max-w-6xl mx-auto w-full" aria-labelledby="about-heading">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 id="about-heading" className="text-3xl font-black uppercase mb-5">
                The Complete CFB<br />Prediction Platform
              </h2>
              <div className="space-y-4 text-sm text-zinc-500 leading-relaxed">
                <p>
                  The Prediction Sheet is built for college football fans who want more than just
                  weekly game picks. Our platform covers the full spectrum of CFB predictions —
                  from individual game winners all the way to the College Football Playoff bracket
                  and national championship.
                </p>
                <p>
                  In <strong className="text-zinc-700">Full Season Mode</strong>, you select which
                  FBS conferences to follow and predict every game across those conferences week by
                  week. Your picks automatically flow into projected conference standings, helping
                  you see how your predictions stack up heading into conference championship weekend
                  and the CFP selection process.
                </p>
                <p>
                  The <strong className="text-zinc-700">Team Season Tracker</strong> is perfect
                  for die-hard fans of a specific program. Follow your team's full schedule,
                  predict wins and losses game by game, and track how accurate your calls were
                  as the season unfolds.
                </p>
                <p>
                  When the CFP field is set, switch to <strong className="text-zinc-700">CFP Bracket Mode</strong> —
                  generate a simulated 12-team playoff field or select teams manually, then predict
                  every game from the first-round matchups through the national championship.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="text-3xl font-black uppercase mb-5">
                Common Questions
              </h2>
              <div className="space-y-5">
                {[
                  {
                    q: 'Do I need to pick every game to use the leaderboard?',
                    a: 'Yes — the leaderboard ranks players who pick every CFB game through Full Season Mode. Partial pickers aren\'t ranked so the competition stays fair.',
                  },
                  {
                    q: 'How does the CFP simulation work?',
                    a: 'Our engine blends each team\'s preseason rating with actual performance as the season progresses, simulates remaining games, and generates a realistically seeded 12-team CFP field following the official selection rules.',
                  },
                  {
                    q: 'Can I track multiple teams in Team Tracker?',
                    a: 'Yes. You can start tracking as many FBS teams as you want. Each team has its own prediction log and accuracy record.',
                  },
                  {
                    q: 'When do picks lock?',
                    a: 'Picks are saved any time before the game is graded. Once a game\'s result is recorded, that game\'s pick is locked and your accuracy stat updates.',
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border-b border-zinc-100 pb-5">
                    <h3 className="font-bold text-sm text-black mb-1.5">{q}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────────────── */}
        <section className="px-6 pb-20 max-w-6xl mx-auto w-full" aria-labelledby="cta-heading">
          <div className="bg-black text-white rounded-2xl px-10 py-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#84cc16] mb-3">
                Free — No Credit Card — Start Today
              </p>
              <h2 id="cta-heading" className="text-3xl font-black uppercase leading-tight">
                Think you can predict<br />college football better<br />than everyone else?
              </h2>
              <p className="text-zinc-400 text-sm mt-3 max-w-md leading-relaxed">
                Make your CFB picks, build your CFP bracket, and find out exactly how accurate your predictions are when the dust settles in January.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <Link
                href="/signup"
                className="px-8 py-4 bg-[#84cc16] text-black font-black text-sm tracking-wide uppercase rounded-xl hover:bg-[#a3e635] transition-colors whitespace-nowrap text-center"
              >
                Create Your Free Sheet
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border border-zinc-700 text-white font-bold text-sm tracking-wide uppercase rounded-xl hover:border-zinc-400 transition-colors whitespace-nowrap text-center"
              >
                Already Have an Account
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="mt-auto bg-zinc-950 text-white px-6 pt-12 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <img
                  src="/WagerXpert guy Logo transparent.png"
                  alt="WagerXpert"
                  className="h-10 w-auto object-contain shrink-0"
                />
                <div>
                  <p className="text-base font-black tracking-tight text-white leading-none">
                    THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
                  </p>
                  <p className="text-[9px] font-semibold tracking-widest uppercase text-zinc-500 mt-0.5">
                    Powered by WagerXpert
                  </p>
                </div>
              </div>

              <nav aria-label="Footer navigation" className="flex gap-6 text-sm text-zinc-400">
                <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
                <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
                <Link href="/cfb" className="hover:text-white transition-colors">CFB Hub</Link>
                <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
              </nav>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                © {new Date().getFullYear()} The Prediction Sheet · Powered by WagerXpert · All rights reserved.
              </p>
              <p className="text-xs text-zinc-600">
                College football game picks · CFB schedule predictions · CFP bracket builder
              </p>
            </div>
          </div>
        </footer>

      </main>
    </>
  )
}
