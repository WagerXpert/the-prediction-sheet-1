'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { regenerateCFPBracket, saveCFPBracketCustom } from '@/lib/data/cfp'
import type { CFPSeed, CFPRankedTeam } from '@/lib/data/cfp'

export async function regenerateBracketAction(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await regenerateCFPBracket(sessionId)
  revalidatePath('/cfb/full-season/cfp')
}

export async function saveCustomBracketAction(
  bracketId: string,
  seedings: CFPSeed[],
  rankings: CFPRankedTeam[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await saveCFPBracketCustom(bracketId, seedings, rankings)
  revalidatePath('/cfb/full-season/cfp')
}

export async function saveCFPPickAction(
  bracketId: string,
  round: number,
  gameIndex: number,
  winnerTeamId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('cfp_picks')
    .upsert(
      { bracket_id: bracketId, round, game_index: gameIndex, winner_team_id: winnerTeamId, updated_at: new Date().toISOString() },
      { onConflict: 'bracket_id,round,game_index' }
    )
}

export async function clearCFPPicksAction(bracketId: string, keys: string[]): Promise<void> {
  // keys are "round-gameIndex" strings
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (const key of keys) {
    const [round, gameIndex] = key.split('-').map(Number)
    await supabase
      .from('cfp_picks')
      .delete()
      .eq('bracket_id', bracketId)
      .eq('round', round)
      .eq('game_index', gameIndex)
  }
}
