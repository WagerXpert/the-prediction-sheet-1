'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'tps_onboarding_v1'

const SLIDES = [
  {
    label: 'Full Season Mode',
    title: 'Pick every game,\nall season long.',
    desc: 'Choose your conferences and predict every matchup from Week 1 through bowl season. Your picks flow into standings and your CFP bracket.',
    href: '/cfb/full-season',
    icon: '🏈',
  },
  {
    label: 'Weekly Pick\'em',
    title: 'Who wins\nthis week?',
    desc: 'Pick winners across every FBS game each week. Earn points for correct picks and climb the leaderboard.',
    href: '/cfb/game-picks',
    icon: '📋',
  },
  {
    label: 'Team Season Tracker',
    title: 'Follow your\nfavorite team.',
    desc: 'Track any FBS team all season — predict each game week by week and watch your accuracy score build.',
    href: '/cfb/team-tracker',
    icon: '📊',
  },
  {
    label: 'CFP Bracket',
    title: 'Build your\n12-team bracket.',
    desc: 'Simulate the full FBS season to generate a playoff field, or pick your 12 teams manually — then call every game.',
    href: '/cfb/playoff',
    icon: '🏆',
  },
]

export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
  }, [])

  const dismiss = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setOpen(false)
      localStorage.setItem(STORAGE_KEY, '1')
    }, 250)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open) return null

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-250 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[360px] bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header row */}
        <div className="flex items-center justify-between px-6 pt-5">
          {/* Progress pills */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-7 bg-[#84cc16]'
                    : i < step
                    ? 'w-1.5 bg-zinc-200'
                    : 'w-1.5 bg-zinc-100'
                }`}
              />
            ))}
          </div>

          <button
            onClick={dismiss}
            className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 transition-colors py-1 px-1 -mr-1"
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div key={step} className="px-6 pt-7 pb-2 animate-fade-in">
          <span className="text-3xl leading-none">{slide.icon}</span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {slide.label}
          </p>
          <h2 className="mt-2 text-[1.6rem] font-black leading-tight whitespace-pre-line text-zinc-900">
            {slide.title}
          </h2>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
            {slide.desc}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors border border-zinc-200"
            >
              ←
            </button>
          )}

          {isLast ? (
            <Link
              href="/cfb"
              onClick={dismiss}
              className="flex-1 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl text-center hover:bg-[#65a30d] transition-colors"
            >
              Let's Go →
            </Link>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
