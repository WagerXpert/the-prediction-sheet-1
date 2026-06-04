'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  sessionId: string
}

export default function FullSeasonActions({ sessionId }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('full_season_sessions').delete().eq('id', sessionId)
      router.push('/cfb')
    })
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <Link
        href="/cfb/full-season/setup"
        className="text-sm font-semibold px-4 py-2 rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors"
      >
        Edit Conferences
      </Link>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          title="Delete full season save"
          className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50">
          <span className="text-xs font-medium text-red-600">Delete all picks?</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
