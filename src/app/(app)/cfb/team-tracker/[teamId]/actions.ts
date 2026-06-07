'use server'

import { createClient } from '@/lib/supabase/server'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export async function saveTeamTrackerPickAction(
  teamId: string,
  gameId: string,
  winnerTeamId: string,
  season = CURRENT_SEASON
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('team_tracker_picks')
    .upsert(
      {
        user_id: user.id,
        team_id: teamId,
        game_id: gameId,
        winner_team_id: winnerTeamId,
        season,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' }
    )
}
