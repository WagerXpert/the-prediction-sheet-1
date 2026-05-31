'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Team {
  id: string
  name: string
  abbreviation: string | null
}

interface Props {
  userId: string
  email: string
  initial: {
    displayName: string
    username: string
    bio: string
    favoriteTeamId: string | null
  }
  teams: Team[]
}

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/

export default function ProfileForm({ userId, email, initial, teams }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [username, setUsername] = useState(initial.username)
  const [bio, setBio] = useState(initial.bio)
  const [favoriteTeamId, setFavoriteTeamId] = useState(initial.favoriteTeamId ?? '')

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const usernameValid = username === '' || USERNAME_RE.test(username)

  function handleSave() {
    if (!usernameValid) {
      setErrorMsg('Username must be 3–20 characters: letters, numbers, _ or -')
      return
    }
    setErrorMsg('')
    startTransition(async () => {
      setSaveStatus('saving')
      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          favorite_team_id: favoriteTeamId || null,
        })
        .eq('id', userId)

      if (error) {
        if (error.code === '23505') {
          setErrorMsg('That username is already taken.')
        } else {
          setErrorMsg(`Save failed: ${error.message}`)
        }
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <Field label="Display Name">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className={inputCls}
          />
        </Field>

        <Field label="Username" hint="Shown on the leaderboard as @handle">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              placeholder="yourhandle"
              className={`${inputCls} pl-8 ${!usernameValid ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
          </div>
          {!usernameValid && (
            <p className="text-xs text-red-500 mt-1">
              3–20 characters: letters, numbers, _ or -
            </p>
          )}
        </Field>

        <Field label="Bio" hint="Optional">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="CFB fan since 1987..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-xs text-zinc-400 mt-1 text-right">{bio.length}/160</p>
        </Field>

        <Field label="Favorite Team" hint="Optional">
          <select
            value={favoriteTeamId}
            onChange={(e) => setFavoriteTeamId(e.target.value)}
            className={inputCls}
          >
            <option value="">— No team selected —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.abbreviation ? ` (${t.abbreviation})` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            disabled
            className={`${inputCls} bg-zinc-50 text-zinc-400 cursor-not-allowed`}
          />
          <p className="text-xs text-zinc-400 mt-1">Email cannot be changed here.</p>
        </Field>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {errorMsg && <p className="text-sm font-semibold text-red-600">{errorMsg}</p>}
          {saveStatus === 'saved' && (
            <p className="text-sm font-semibold text-green-600">Profile saved!</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !usernameValid}
          className="px-6 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-zinc-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#84cc16] focus:border-transparent transition-shadow'
