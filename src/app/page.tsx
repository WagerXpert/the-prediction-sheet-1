import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { FAQAccordion } from './FAQAccordion'

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

        {/* ── Nav ── */}
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
              <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
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

        {/* ── Hero ── */}
        <section className="px-6 pt-16 pb-14 max-w-5xl mx-auto w-full" aria-labelledby="hero-heading">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#84cc16]/40 bg-[#84cc16]/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-[#65a30d]">
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

          <p className="text-zinc-500 text-lg max-w-lg mb-8 leading-relaxed">
            Four prediction modes. 900+ games. Free to play.<br className="hidden sm:block" />
            Find out exactly how sharp your CFB picks really are.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link
              href="/signup"
              className="px-8 py-4 bg-[#84cc16] text-black font-black text-sm tracking-wide uppercase rounded-xl hover:bg-[#a3e635] transition-colors text-center"
            >
              Create Your Free Sheet
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border border-zinc-200 text-zinc-700 font-bold text-sm tracking-wide uppercase rounded-xl hover:border-zinc-400 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Prediction modes">
            {['Full Season Game Picks', 'Team Schedule Tracker', 'CFP Playoff Bracket', 'Weekly Pick\'em'].map(m => (
              <span key={m} className="px-3 py-1 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-400">
                {m}
              </span>
            ))}
          </div>
        </section>

        {/* ── Lime accent ── */}
        <div className="bg-[#84cc16] h-1 w-full" aria-hidden="true" />

        {/* ── Stats ── */}
        <div className="bg-zinc-50 px-6 py-6 border-b border-zinc-100">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { stat: '900+', label: 'CFB Games to Pick' },
              { stat: '10',   label: 'FBS Conferences' },
              { stat: '138',  label: 'FBS Teams' },
              { stat: '12',   label: 'CFP Playoff Teams' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <p className="text-2xl font-black text-[#84cc16]">{stat}</p>
                <p className="text-xs font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4 Modes ── */}
        <section className="px-6 py-16 max-w-5xl mx-auto w-full" aria-labelledby="modes-heading">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">
            Four Prediction Modes
          </p>
          <h2 id="modes-heading" className="text-3xl font-black uppercase mb-10">
            Every Way to Predict CFB
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* 01 — Full Season */}
            <article className="rounded-2xl bg-black text-white p-6 flex flex-col" aria-labelledby="mode-fullseason">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-black text-[#84cc16]">01</span>
                <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-[10px] font-bold text-[#84cc16] uppercase tracking-wide">
                  Featured
                </span>
              </div>
              <h3 id="mode-fullseason" className="text-lg font-black uppercase mb-2">Full Season Mode</h3>
              <p className="text-zinc-400 text-sm leading-relaxed flex-1 mb-5">
                Pick every game for your selected conferences. Conference standings, championships,
                and your CFP bracket all build automatically from your picks.
              </p>
              <Link
                href="/signup"
                className="w-full text-center px-5 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#a3e635] transition-colors"
              >
                Start Full Season →
              </Link>
            </article>

            {/* 02 — Weekly Pick'em */}
            <article className="rounded-2xl bg-black text-white p-6 flex flex-col" aria-labelledby="mode-pickem">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-black text-[#84cc16]">02</span>
                <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/10 border border-[#84cc16]/30 text-[10px] font-bold text-[#84cc16] uppercase tracking-wide">
                  New
                </span>
              </div>
              <h3 id="mode-pickem" className="text-lg font-black uppercase mb-2">Weekly Pick'em</h3>
              <p className="text-zinc-400 text-sm leading-relaxed flex-1 mb-5">
                Pick the winner of every CFB game each week. No season commitment required —
                jump in any week, climb the leaderboard, and see how you stack up.
              </p>
              <Link
                href="/signup"
                className="w-full text-center px-5 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#a3e635] transition-colors"
              >
                Start Picking →
              </Link>
            </article>

            {/* 03 — Team Tracker */}
            <article className="rounded-2xl border border-zinc-200 p-6 flex flex-col" aria-labelledby="mode-tracker">
              <span className="text-3xl font-black text-[#84cc16] mb-4">03</span>
              <h3 id="mode-tracker" className="text-lg font-black uppercase mb-2">Team Season Tracker</h3>
              <p className="text-zinc-500 text-sm leading-relaxed flex-1 mb-5">
                Lock in on any FBS team. Predict every game on their schedule and see your
                accuracy update in real time as results come in.
              </p>
              <Link
                href="/signup"
                className="w-full text-center px-5 py-2.5 border border-zinc-200 text-black font-bold text-sm rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Track a Team →
              </Link>
            </article>

            {/* 04 — CFP Bracket */}
            <article className="rounded-2xl border border-zinc-200 p-6 flex flex-col" aria-labelledby="mode-cfp">
              <span className="text-3xl font-black text-[#84cc16] mb-4">04</span>
              <h3 id="mode-cfp" className="text-lg font-black uppercase mb-2">CFP Playoff Bracket</h3>
              <p className="text-zinc-500 text-sm leading-relaxed flex-1 mb-5">
                Build the full 12-team College Football Playoff bracket. Run a simulation or
                pick teams manually, then call every game through the championship.
              </p>
              <Link
                href="/signup"
                className="w-full text-center px-5 py-2.5 border border-zinc-200 text-black font-bold text-sm rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Build My Bracket →
              </Link>
            </article>

          </div>
        </section>

        {/* ── How it works ── */}
        <div className="bg-zinc-50 border-y border-zinc-100">
          <div className="px-6 py-14 max-w-5xl mx-auto">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">Simple to Start</p>
            <h2 className="text-3xl font-black uppercase mb-10">How it Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { n: '1', title: 'Create a Free Account', desc: 'Sign up in 30 seconds. No credit card.' },
                { n: '2', title: 'Choose Your Mode',       desc: 'Full Season, Team Tracker, or CFP Bracket — or all three.' },
                { n: '3', title: 'Make Your Picks',        desc: 'Select game winners week by week. Picks save automatically.' },
                { n: '4', title: 'Track Your Accuracy',    desc: 'Your correct pick % updates in real time as games are played.' },
              ].map(({ n, title, desc }) => (
                <div key={n}>
                  <div className="w-9 h-9 rounded-full bg-[#84cc16] text-black flex items-center justify-center font-black text-sm mb-3">
                    {n}
                  </div>
                  <h3 className="font-black text-sm uppercase mb-1.5">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <section className="px-6 py-14 max-w-3xl mx-auto w-full" aria-labelledby="faq-heading">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">Got Questions?</p>
          <h2 id="faq-heading" className="text-3xl font-black uppercase mb-10">Common Questions</h2>
          <FAQAccordion />
        </section>

        {/* ── WagerXpert callout ── */}
        <section className="px-6 pb-10 max-w-5xl mx-auto w-full" aria-label="WagerXpert">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-7 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
                From the creators of The Prediction Sheet
              </p>
              <h2 className="text-xl font-black uppercase mb-1.5">
                WagerXpert — All The Thrill, None Of The Pressure
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
                Love making picks? Take your skills to WagerXpert — weekly parlay competitions
                across NFL, NBA, NCAAF, and more. Build parlays using real odds, compete on
                leaderboards, and play with friends. No cash on the line, no house edge.
              </p>
            </div>
            <a
              href="https://wagerxpert.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-6 py-3 bg-black text-white font-black text-sm tracking-wide uppercase rounded-xl hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              Try WagerXpert →
            </a>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mt-auto bg-zinc-950 text-white px-6 pt-10 pb-8">
          <div className="max-w-5xl mx-auto">
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
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-5 text-sm text-zinc-400">
                <Link href="/signup"      className="hover:text-white transition-colors">Get Started</Link>
                <Link href="/login"       className="hover:text-white transition-colors">Sign In</Link>
                <Link href="/cfb"         className="hover:text-white transition-colors">CFB Hub</Link>
                <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
                <a
                  href="https://wagerxpert.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#84cc16] transition-colors"
                >
                  WagerXpert ↗
                </a>
              </nav>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                © {new Date().getFullYear()} The Prediction Sheet · Powered by WagerXpert · All rights reserved.
              </p>
              <p className="text-xs text-zinc-600">
                CFB game picks · Schedule predictions · CFP bracket builder
              </p>
            </div>
          </div>
        </footer>

      </main>
    </>
  )
}
