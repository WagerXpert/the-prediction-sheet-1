import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'

export const metadata: Metadata = { title: 'Your Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/profile')

  const [{ data: profile }, { data: teams }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, username, bio, favorite_team_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('teams')
      .select('id, name, abbreviation')
      .eq('sport_id', 'cfb')
      .order('name'),
  ])

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Your Profile</h1>
        <p className="text-zinc-500 mt-1">Customize how you appear on the leaderboard.</p>
      </div>

      <ProfileForm
        userId={user.id}
        email={user.email ?? ''}
        initial={{
          displayName: profile?.display_name ?? '',
          username: profile?.username ?? '',
          bio: profile?.bio ?? '',
          favoriteTeamId: profile?.favorite_team_id ?? null,
        }}
        teams={teams ?? []}
      />
    </div>
  )
}
