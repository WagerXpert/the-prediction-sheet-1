'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CfbConference } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

interface ExistingStanding {
  conference_id: string
  team_id: string
  predicted_rank: number
}

interface Props {
  userId: string
  conferences: CfbConference[]
  existingStandings: ExistingStanding[]
}

type RankingsMap = Record<string, string[]>
type StatusMap = Record<string, 'idle' | 'saving' | 'saved' | 'error'>

export default function StandingsForm({ userId, conferences, existingStandings }: Props) {
  const [selectedConfId, setSelectedConfId] = useState(conferences[0]?.id ?? '')

  const [rankings, setRankings] = useState<RankingsMap>(() => {
    const map: RankingsMap = {}
    for (const conf of conferences) {
      const saved = existingStandings
        .filter((s) => s.conference_id === conf.id)
        .sort((a, b) => a.predicted_rank - b.predicted_rank)

      map[conf.id] =
        saved.length === conf.teams.length
          ? saved.map((s) => s.team_id)
          : conf.teams.map((t) => t.id)
    }
    return map
  })

  const [statuses, setStatuses] = useState<StatusMap>({})
  const [isPending, startTransition] = useTransition()

  const selectedConf = conferences.find((c) => c.id === selectedConfId)
  const currentRanking = rankings[selectedConfId] ?? []

  const savedCount = conferences.filter(
    (c) =>
      existingStandings.filter((s) => s.conference_id === c.id).length === c.teams.length ||
      statuses[c.id] === 'saved'
  ).length

  function moveTeam(teamId: string, direction: 'up' | 'down') {
    setRankings((prev) => {
      const list = [...(prev[selectedConfId] ?? [])]
      const idx = list.indexOf(teamId)
      if (direction === 'up' && idx > 0) {
        ;[list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]
      } else if (direction === 'down' && idx < list.length - 1) {
        ;[list[idx], list[idx + 1]] = [list[idx + 1], list[idx]]
      }
      return { ...prev, [selectedConfId]: list }
    })
  }

  function handleSave() {
    startTransition(async () => {
      setStatuses((prev) => ({ ...prev, [selectedConfId]: 'saving' }))
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
        setStatuses((prev) => ({ ...prev, [selectedConfId]: 'error' }))
        return
      }

      // Delete then re-insert to avoid unique-rank conflicts
      await supabase
        .from('predictions_standings')
        .delete()
        .eq('prediction_set_id', predSet.id)
        .eq('conference_id', selectedConfId)

      const rows = currentRanking.map((teamId, idx) => ({
        prediction_set_id: predSet.id,
        user_id: userId,
        conference_id: selectedConfId,
        team_id: teamId,
        predicted_rank: idx + 1,
      }))

      const { error } = await supabase.from('predictions_standings').insert(rows)

      if (error) {
        setStatuses((prev) => ({ ...prev, [selectedConfId]: 'error' }))
      } else {
        setStatuses((prev) => ({ ...prev, [selectedConfId]: 'saved' }))
        setTimeout(() => {
          setStatuses((prev) => ({ ...prev, [selectedConfId]: 'idle' }))
        }, 3000)
      }
    })
  }

  const confStatus = statuses[selectedConfId] ?? 'idle'

  return (
    <div>
      {/* Progress */}
      <p className="text-sm text-zinc-500 mb-4">
        <span className="font-semibold text-black">{savedCount}</span> of {conferences.length}{' '}
        conferences saved
      </p>

      {/* Conference tab strip */}
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {conferences.map((conf) => {
            const isSaved =
              statuses[conf.id] === 'saved' ||
              existingStandings.filter((s) => s.conference_id === conf.id).length ===
                conf.teams.length
            return (
              <button
                key={conf.id}
                onClick={() => setSelectedConfId(conf.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  conf.id === selectedConfId
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {conf.abbreviation}
                {isSaved && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#84cc16] flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Rankings panel */}
      {selectedConf && (
        <div className="rounded-2xl border border-zinc-200 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
            <div>
              <h2 className="text-lg font-black">{selectedConf.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Use arrows to reorder teams</p>
            </div>
            <div className="flex items-center gap-3">
              {confStatus === 'saved' && (
                <span className="text-sm font-semibold text-green-600">Saved!</span>
              )}
              {confStatus === 'error' && (
                <span className="text-sm font-semibold text-red-600">Error — try again</span>
              )}
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Ranked list */}
          <ol className="divide-y divide-zinc-100">
            {currentRanking.map((teamId, idx) => {
              const team = selectedConf.teams.find((t) => t.id === teamId)
              if (!team) return null
              const isFirst = idx === 0
              const isLast = idx === currentRanking.length - 1

              return (
                <li
                  key={teamId}
                  className="flex items-center gap-4 px-6 py-3.5 bg-white hover:bg-zinc-50/50 transition-colors"
                >
                  <span className="text-2xl font-black text-zinc-200 w-8 text-center select-none tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{team.name}</p>
                    {team.mascot && (
                      <p className="text-xs text-zinc-400 truncate">{team.mascot}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveTeam(teamId, 'up')}
                      disabled={isFirst}
                      className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${team.name} up`}
                    >
                      <ChevronUp />
                    </button>
                    <button
                      onClick={() => moveTeam(teamId, 'down')}
                      disabled={isLast}
                      className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${team.name} down`}
                    >
                      <ChevronDown />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

function ChevronUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 10.5L8 5.5L13 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 5.5L8 10.5L13 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
