import { createClient } from '@/lib/supabase/server'

export interface CfbTeam {
  id: string
  name: string
  abbreviation: string | null
  mascot: string | null
}

export interface CfbConference {
  id: string
  name: string
  abbreviation: string
  teams: CfbTeam[]
}

export async function getCfbConferencesWithTeams(): Promise<CfbConference[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conferences')
    .select('id, name, abbreviation, teams(id, name, abbreviation, mascot)')
    .eq('sport_id', 'cfb')
    .order('name')

  if (!data) return []

  return data.map((conf) => ({
    id: conf.id,
    name: conf.name,
    abbreviation: conf.abbreviation,
    teams: ((conf.teams ?? []) as CfbTeam[]).sort((a, b) => a.name.localeCompare(b.name)),
  }))
}
