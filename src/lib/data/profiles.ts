import { createClient } from '@/lib/supabase/server'

export interface ProfileSummary {
  id: string
  displayName: string
  username: string | null
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    displayName: data.display_name ?? 'Anonymous',
    username: data.username ?? null,
  }
}
