'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const REMEMBER_POLICY_KEY = 'tps_remember_policy'
const NO_REMEMBER_SESSION_KEY = 'tps_no_remember'

interface LoginFormProps {
  redirectTo?: string
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_POLICY_KEY, 'persistent')
          sessionStorage.removeItem(NO_REMEMBER_SESSION_KEY)
        } else {
          localStorage.setItem(REMEMBER_POLICY_KEY, 'session')
          sessionStorage.setItem(NO_REMEMBER_SESSION_KEY, '1')
        }
        router.push(redirectTo || '/dashboard')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
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

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-zinc-700">Password</label>
          <a
            href="/forgot-password"
            className="text-xs font-semibold text-zinc-400 hover:text-black transition-colors"
          >
            Forgot password?
          </a>
        </div>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16] focus:border-transparent"
        />
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              rememberMe ? 'bg-[#84cc16] border-[#84cc16]' : 'bg-white border-zinc-300'
            }`}
          >
            {rememberMe && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <polyline points="1 3.5 3.5 6 8 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-zinc-600">Remember me</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-[#84cc16] text-black font-bold rounded-xl text-sm hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
      >
        {isPending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
