'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { saveCFPBracketCustom, saveConfChampPick, computeAndSaveBracketSeedings, getCFPBracket, resetCFPSession } from '@/lib/data/cfp'
import type { CFPSeed, CFPRankedTeam } from '@/lib/data/cfp'

// ── Conf champ picks ──────────────────────────────────────────────

export async function saveConfChampPickAction(gameId: string, winnerTeamId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await saveConfChampPick(gameId, winnerTeamId)
}

// ── Generate rankings + seedings after conf champs ────────────────

export async function generateBracketSeedingsAction(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await computeAndSaveBracketSeedings(sessionId)
  revalidatePath('/cfb/full-season/cfp')
}

// ── Reset entire CFP session (clear bracket + conf champs) ─────────

export async function resetBracketAction(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await resetCFPSession(sessionId)
  revalidatePath('/cfb/full-season/cfp')
}

// ── Bracket game picks ────────────────────────────────────────────

export async function saveCFPPickAction(bracketId: string, round: number, gameIndex: number, winnerTeamId: string): Promise<void> {
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

// ── Customize bracket seedings ────────────────────────────────────

export async function saveCustomBracketAction(bracketId: string, seedings: CFPSeed[], rankings: CFPRankedTeam[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await saveCFPBracketCustom(bracketId, seedings, rankings)
  revalidatePath('/cfb/full-season/cfp')
}

// ── Re-generate from latest predictions (preserves conf champ picks) ─
// Returns new seedings + rankings so the client can update local state immediately

export async function regenerateBracketAction(
  sessionId: string
): Promise<{ seedings: CFPSeed[]; cfp_rankings: CFPRankedTeam[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Clear bracket game picks — teams shift positions after recompute
  const bracket = await getCFPBracket(sessionId)
  if (bracket) {
    await supabase.from('cfp_picks').delete().eq('bracket_id', bracket.id)
  }

  // Fresh random seed → genuinely different simulation each time
  const newSimSeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  const newBracket = await computeAndSaveBracketSeedings(sessionId, undefined, newSimSeed)
  revalidatePath('/cfb/full-season/cfp')

  return { seedings: newBracket.seedings, cfp_rankings: newBracket.cfp_rankings }
}
