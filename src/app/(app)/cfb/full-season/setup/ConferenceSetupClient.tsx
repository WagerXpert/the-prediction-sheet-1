'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FSConferenceOption } from '@/lib/data/full-season'

interface Props {
  sessionId: string
  allConferences: FSConferenceOption[]
  selectedIds: string[]
}

export default function ConferenceSetupClient({ sessionId, allConferences, selectedIds: initial }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const router = useRouter()

  const powerConfs = allConferences.filter(c => c.tier === 'power')
  const g5Confs = allConferences.filter(c => c.tier === 'g5')
  const otherConfs = allConferences.filter(c => c.tier !== 'power' && c.tier !== 'g5')

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyPreset(ids: string[]) {
    setSelected(new Set(ids))
  }

  async function handleSave() {
    if (selected.size === 0) return
    setStatus('saving')

    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('full_season_conferences').delete().eq('session_id', sessionId)

      const rows = [...selected].map(conference_id => ({ session_id: sessionId, conference_id }))
      const { error } = await supabase.from('full_season_conferences').insert(rows)

      if (error) {
        setStatus('error')
      } else {
        router.push('/cfb/full-season')
      }
    })
  }

  const allPowerIds = powerConfs.map(c => c.id)
  const allG5Ids = g5Confs.map(c => c.id)
  const allFbsIds = allConferences.map(c => c.id)

  const isPowerPreset = allPowerIds.length > 0 && allPowerIds.every(id => selected.has(id)) && selected.size === allPowerIds.length
  const isG5Preset = allG5Ids.length > 0 && allG5Ids.every(id => selected.has(id)) && selected.size === allG5Ids.length
  const isAllPreset = allFbsIds.every(id => selected.has(id))

  return (
    <div className="space-y-8">
      {/* Preset buttons */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Quick Select</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All FBS', ids: allFbsIds, active: isAllPreset },
            { label: 'Power Conferences', ids: allPowerIds, active: isPowerPreset },
            { label: 'Group of Five', ids: allG5Ids, active: isG5Preset },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.ids)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                preset.active
                  ? 'bg-[#84cc16] border-[#84cc16] text-black'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 bg-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-400 hover:border-zinc-400 bg-white transition-all"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Conference groups */}
      {[
        { label: 'Power Conferences', confs: powerConfs },
        { label: 'Group of Five', confs: g5Confs },
        ...(otherConfs.length ? [{ label: 'Other', confs: otherConfs }] : []),
      ].map(group => (
        <div key={group.label}>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">{group.label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.confs.map(conf => {
              const isOn = selected.has(conf.id)
              return (
                <button
                  key={conf.id}
                  onClick={() => toggle(conf.id)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                    isOn
                      ? 'border-[#84cc16] bg-green-50 shadow-sm'
                      : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  {conf.logo_url ? (
                    <img src={conf.logo_url} alt={conf.abbreviation} className="w-9 h-9 object-contain shrink-0" />
                  ) : (
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-zinc-500">{conf.abbreviation}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{conf.name}</p>
                    <p className="text-xs text-zinc-400">{conf.team_count} teams</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isOn ? 'bg-[#84cc16] border-[#84cc16]' : 'border-zinc-300'
                  }`}>
                    {isOn && (
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Sticky action bar */}
      <div className="sticky bottom-6 z-30 flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl shadow-lg">
        <p className="text-sm text-zinc-500">
          <span className="font-black text-black text-base">{selected.size}</span>
          {' '}conference{selected.size !== 1 ? 's' : ''} selected
        </p>
        <div className="flex items-center gap-3">
          {status === 'error' && (
            <span className="text-sm text-red-600 font-semibold">Error — try again</span>
          )}
          <button
            onClick={handleSave}
            disabled={selected.size === 0 || isPending}
            className="px-6 py-2.5 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isPending ? 'Saving…' : 'Start Full Season Mode →'}
          </button>
        </div>
      </div>
    </div>
  )
}
