'use client'

import { useState, useTransition } from 'react'
import { runSyncTeams, runSyncSchedule, runSyncResults } from './actions'
import type { SyncResult } from '@/lib/cfbd/sync'

type Status = { ok: boolean; message: string } | null

export default function SyncPanel() {
  const [isPending, startTransition] = useTransition()
  const [weekInput, setWeekInput] = useState('')
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  function setStatus(key: string, result: SyncResult) {
    setStatuses(prev => ({
      ...prev,
      [key]: result.ok
        ? { ok: true, message: `${result.records} records · ${result.elapsed_ms}ms${result.detail ? ' · ' + result.detail : ''}` }
        : { ok: false, message: result.error },
    }))
  }

  function handleTeams() {
    startTransition(async () => {
      setStatuses(prev => ({ ...prev, teams: null }))
      const result = await runSyncTeams()
      setStatus('teams', result)
    })
  }

  function handleSchedule() {
    startTransition(async () => {
      setStatuses(prev => ({ ...prev, schedule: null }))
      const result = await runSyncSchedule()
      setStatus('schedule', result)
    })
  }

  function handleResults() {
    const week = weekInput ? parseInt(weekInput, 10) : undefined
    startTransition(async () => {
      setStatuses(prev => ({ ...prev, results: null }))
      const result = await runSyncResults(week)
      setStatus('results', result)
    })
  }

  return (
    <div className="space-y-4">
      <SyncRow
        title="Sync Teams & Conferences"
        desc="Pulls all FBS schools and their conference assignments from the CFBD API."
        statusKey="teams"
        statuses={statuses}
        isPending={isPending}
        onRun={handleTeams}
        badge="Step 1"
      />

      <SyncRow
        title="Sync Schedule"
        desc="Pulls the full regular season + postseason game schedule. Run after teams sync."
        statusKey="schedule"
        statuses={statuses}
        isPending={isPending}
        onRun={handleSchedule}
        badge="Step 2"
      />

      <div className="p-5 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Step 3 — Weekly</span>
              <h3 className="font-bold">Sync Results & Grade Predictions</h3>
            </div>
            <p className="text-sm text-zinc-500">
              Updates game scores and grades all user predictions. Leave week blank to sync the full season.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={1}
                max={20}
                value={weekInput}
                onChange={e => setWeekInput(e.target.value)}
                placeholder="Week (blank = all)"
                className="w-44 px-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
              />
              <button
                onClick={handleResults}
                disabled={isPending}
                className="px-4 py-1.5 bg-[#84cc16] text-black font-bold text-sm rounded-lg hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        </div>
        <StatusBadge status={statuses.results} />
      </div>
    </div>
  )
}

function SyncRow({
  title,
  desc,
  statusKey,
  statuses,
  isPending,
  onRun,
  badge,
}: {
  title: string
  desc: string
  statusKey: string
  statuses: Record<string, Status>
  isPending: boolean
  onRun: () => void
  badge: string
}) {
  return (
    <div className="p-5 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{badge}</span>
            <h3 className="font-bold">{title}</h3>
          </div>
          <p className="text-sm text-zinc-500">{desc}</p>
        </div>
        <button
          onClick={onRun}
          disabled={isPending}
          className="shrink-0 px-4 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Running…' : 'Run'}
        </button>
      </div>
      <StatusBadge status={statuses[statusKey]} />
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (!status) return null
  return (
    <p className={`mt-3 text-xs font-medium ${status.ok ? 'text-green-700' : 'text-red-600'}`}>
      {status.ok ? '✓' : '✗'} {status.message}
    </p>
  )
}
