'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          If <span className="font-semibold text-black">{email}</span> has an account,
          you&apos;ll receive a password reset link shortly.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 text-sm font-semibold text-black hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email address</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3.5 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16] focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-[#84cc16] text-black font-bold rounded-xl text-sm hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending…' : 'Send Reset Link'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="font-semibold text-black hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
