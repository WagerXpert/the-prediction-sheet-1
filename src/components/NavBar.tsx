import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SignOutButton from './SignOutButton'

export default async function NavBar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name ?? user.email?.split('@')[0] ?? null
  }

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
      <Link href={user ? '/dashboard' : '/'} className="text-xl font-black tracking-tight">
        THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-5">
          <Link
            href="/cfb"
            className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
          >
            CFB Hub
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
          >
            Dashboard
          </Link>
          <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
            {displayName && (
              <span className="text-sm font-medium text-zinc-700">{displayName}</span>
            )}
            <SignOutButton />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold px-4 py-2 bg-[#84cc16] text-black rounded-lg hover:bg-[#65a30d] transition-colors"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  )
}
