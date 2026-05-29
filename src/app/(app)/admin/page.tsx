import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import SyncPanel from './SyncPanel'

export const metadata: Metadata = { title: 'Admin — Sync' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { data: logs } = await supabase
    .from('sync_log')
    .select('*')
    .eq('sport_id', 'cfb')
    .order('synced_at', { ascending: false })
    .limit(20)

  const { data: teamCount } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('sport_id', 'cfb')

  const { data: gameCount } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-200 text-sm font-semibold text-red-700 mb-4">
          Admin Only
        </div>
        <h1 className="text-3xl font-black">Data Sync</h1>
        <p className="text-zinc-500 mt-1">Sync CFB data from CollegeFootballData.com for the {CURRENT_SEASON} season.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="FBS Teams" value={(teamCount as any)?.count ?? 0} />
        <StatCard label={`${CURRENT_SEASON} Games`} value={(gameCount as any)?.count ?? 0} />
        <StatCard label="Sync Runs" value={logs?.length ?? 0} suffix="recent" />
      </div>

      <SyncPanel />

      {/* Sync log */}
      <div className="mt-10">
        <h2 className="text-lg font-black mb-4">Recent Sync Log</h2>
        {!logs?.length ? (
          <p className="text-zinc-400 text-sm">No syncs run yet.</p>
        ) : (
          <div className="rounded-2xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Records</th>
                  <th className="text-right px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map(log => (
                  <tr key={log.id} className="bg-white">
                    <td className="px-4 py-3 font-mono text-xs">{log.sync_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{log.records_affected ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(log.synced_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="p-5 rounded-2xl border border-zinc-200 bg-white">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-black mt-1">
        {value.toLocaleString()}
        {suffix && <span className="text-sm font-normal text-zinc-400 ml-1">{suffix}</span>}
      </p>
    </div>
  )
}
