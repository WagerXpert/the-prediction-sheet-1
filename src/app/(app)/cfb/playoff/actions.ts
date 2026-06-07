'use server'

import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import {
  createOrRegenerateSimBracket,
  createManualBracket,
  savePlayoffPick,
  clearPlayoffPicks,
  updatePlayoffSeedings,
  resetPlayoffBracket,
  type CFPSeed,
} from '@/lib/data/playoff'

export async function generateSimBracketAction(): Promise<{ id: string; seedings: CFPSeed[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const bracket = await createOrRegenerateSimBracket(user.id, CURRENT_SEASON)
  return { id: bracket.id, seedings: bracket.seedings }
}

export async function createManualBracketAction(teamIds: string[]): Promise<{ id: string; seedings: CFPSeed[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (teamIds.length !== 12) throw new Error('Exactly 12 teams required')

  const bracket = await createManualBracket(user.id, teamIds, CURRENT_SEASON)
  return { id: bracket.id, seedings: bracket.seedings }
}

export async function savePlayoffPickAction(
  bracketId: string,
  round: number,
  gameIndex: number,
  winnerTeamId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await savePlayoffPick(bracketId, round, gameIndex, winnerTeamId)
}

export async function clearPlayoffPicksAction(bracketId: string, keys: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await clearPlayoffPicks(bracketId, keys)
}

export async function updatePlayoffSeedingsAction(bracketId: string, seedings: CFPSeed[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await updatePlayoffSeedings(bracketId, seedings)
}

export async function resetPlayoffBracketAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await resetPlayoffBracket(user.id, CURRENT_SEASON)
}
