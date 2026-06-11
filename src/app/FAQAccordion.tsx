'use client'
import { useState } from 'react'

const faqs = [
  {
    q: 'Is it free?',
    a: 'Yes — completely free. Create an account and start picking immediately. No credit card, no trial, no paywall.',
  },
  {
    q: 'How does the CFP simulation work?',
    a: 'Our engine blends preseason ratings with actual results to simulate remaining games and generate a realistic 12-team field. Seeds are assigned by simulated conference standings and CFP ranking logic.',
  },
  {
    q: 'Can I track multiple teams?',
    a: 'Yes. Start tracking as many FBS teams as you want — each gets its own schedule and accuracy log.',
  },
  {
    q: 'When do picks lock?',
    a: 'Picks save any time before a game is graded. Once a result is recorded, that pick locks and your accuracy updates.',
  },
  {
    q: 'Do I need to pick every game to rank on the leaderboard?',
    a: "Full Season leaderboard requires picks through Full Season Mode. CFB Pick'em leaderboard is week-by-week — just pick any open week.",
  },
  {
    q: 'What is the 12-team CFP format?',
    a: 'P4 conference champions plus the top G5 team earn automatic bids. Seeds 1–4 get first-round byes; seeds 5–12 play in. The bracket runs through quarterfinals, semifinals, and the national championship.',
  },
  {
    q: 'How is my prediction accuracy calculated?',
    a: 'Your accuracy is the percentage of graded games where your predicted winner matched the real result. It updates automatically after every game.',
  },
  {
    q: 'Can I change my picks after submitting?',
    a: 'Yes — you can update any pick up until the game result is recorded. Once a game is graded, that pick is locked.',
  },
]

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-zinc-100">
      {faqs.map(({ q, a }, i) => (
        <div key={q}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between py-5 text-left gap-4 group"
            aria-expanded={open === i}
          >
            <span className="font-bold text-sm text-black group-hover:text-[#65a30d] transition-colors">
              {q}
            </span>
            <span
              className={`shrink-0 w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center transition-all duration-300 ${
                open === i ? 'bg-[#84cc16] border-[#84cc16] rotate-45' : 'bg-white'
              }`}
            >
              <svg
                className="w-3 h-3 text-black"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="6" y1="1" x2="6" y2="11" />
                <line x1="1" y1="6" x2="11" y2="6" />
              </svg>
            </span>
          </button>
          <div
            style={{ gridTemplateRows: open === i ? '1fr' : '0fr' }}
            className="grid transition-all duration-300 ease-in-out"
          >
            <div className="overflow-hidden">
              <p className="pb-5 text-sm text-zinc-500 leading-relaxed pr-10">{a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
