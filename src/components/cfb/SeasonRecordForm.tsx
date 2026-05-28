'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CfbConference } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

const REGULAR_SEASON_GAMES = 12

interface Props {
  userId: string
  conferences: CfbConference[]
  existing: { team_id: string; predicted_wins: number; predicted_losses: number }[]
}

type WinsMap = Record<string, number | ''>

export default function SeasonRecordForm({ userId, conferences, existing }: Props) {
  const [wins, setWins] = useState<WinsMap>(() => {
    const map: WinsMap = {}
    for (const p of existing) {
      map[p.team_id] = p.predicted_wins
    }
    return map
  })

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const totalTeams = conferences.reduce((sum, c) => sum + c.teams.length, 0)
  const filledCount = Object.values(wins).filter((v) => v !== '').length

  function handleWinsChange(teamId: string, raw: string) {
    if (raw === '') {
      setWins((prev) => ({ ...prev, [teamId]: '' }))
      return
    }
    const n = Math.min(REGULAR_SEASON_GAMES, Math.max(0, parseInt(raw, 10)))
    setWins((prev) => ({ ...prev, [teamId]: isNaN(n) ? '' : n }))
  }

  function handleSave() {
    startTransition(async () => {
      setSaveStatus('saving')
      const supabase = createClient()

      const { data: predSet, error: psError } = await supabase
        .from('prediction_sets')
        .upsert(
          { user_id: userId, sport_id: 'cfb', season: CURRENT_SEASON },
          { onConflict: 'user_id,sport_id,season' }
        )
        .select('id')
        .single()

      if (psError || !predSet) {
        setSaveStatus('error')
        return
      }

      const records = Object.entries(wins)
        .filter(([, v]) => v !== '')
        .map(([teamId, w]) => ({
          prediction_set_id: predSet.id,
          user_id: userId,
          team_id: teamId,
          predicted_wins: w as number,
          predicted_losses: REGULAR_SEASON_GAMES - (w as number),
        }))

      if (records.length === 0) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }

      const { error } = await supabase
        .from('predictions_record')
        .upsert(records, { onConflict: 'prediction_set_id,team_id' })

      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  return (
    <div>
      {/* Sticky save bar */}
      <div className="sticky top-[73px] z-30 mb-8 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl shadow-sm">
        <p className="text-sm text-zinc-500">
          <span className="font-semibold text-black">{filledCount}</span> of {totalTeams} teams predicted
        </p>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-sm font-semibold text-green-600">Saved!</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm font-semibold text-red-600">Error — try again</span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || filledCount === 0}
            className="px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save Predictions'}
          </button>
        </div>
      </div>

      {/* Conference sections */}
      <div className="space-y-10">
        {conferences.map((conf) => (
          <section key={conf.id}>
            <h2 className="text-base font-black uppercase tracking-wide text-zinc-400 mb-3 px-1">
              {conf.name}
            </h2>

            <div className="rounded-2xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Team</th>
                    <th className="text-center px-4 py-3 w-28">Wins</th>
                    <th className="text-center px-4 py-3 w-28">Losses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {conf.teams.map((team) => {
                    const w = wins[team.id]
                    const losses =
                      w !== '' && w !== undefined
                        ? REGULAR_SEASON_GAMES - (w as number)
                        : null

                    return (
                      <tr key={team.id} className="bg-white hover:bg-zinc-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-semibold">{team.name}</span>
                          {team.mascot && (
                            <span className="ml-2 text-zinc-400 text-xs">{team.mascot}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={REGULAR_SEASON_GAMES}
                            value={w ?? ''}
                            onChange={(e) => handleWinsChange(team.id, e.target.value)}
                            placeholder="—"
                            className="w-16 text-center px-2 py-1.5 rounded-lg border border-zinc-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#84cc16] focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-semibold ${losses !== null ? 'text-zinc-700' : 'text-zinc-200'}`}
                          >
                            {losses !== null ? losses : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom save */}
      <div className="mt-10 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending || filledCount === 0}
          className="px-8 py-3 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save All Predictions'}
        </button>
      </div>
    </div>
  )
}
