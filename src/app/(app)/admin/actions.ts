'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { syncTeams, syncSchedule, syncResults } from '@/lib/cfbd/sync'
import { CURRENT_SEASON } from '@/lib/utils/constants'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')
}

export async function runSyncTeams() {
  await requireAdmin()
  return syncTeams(CURRENT_SEASON)
}

export async function runSyncSchedule() {
  await requireAdmin()
  return syncSchedule(CURRENT_SEASON)
}

export async function runSyncResults(week?: number) {
  await requireAdmin()
  return syncResults(CURRENT_SEASON, week)
}
