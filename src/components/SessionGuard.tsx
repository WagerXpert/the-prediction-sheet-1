'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REMEMBER_POLICY_KEY = 'tps_remember_policy'
const NO_REMEMBER_SESSION_KEY = 'tps_no_remember'

// Signs out users who chose "don't remember me" when they reopen the browser.
// Logic: on mount, if the policy says "session" but the sessionStorage marker is gone
// (browser was restarted), check if the user is still authenticated and sign them out.
export default function SessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const policy = localStorage.getItem(REMEMBER_POLICY_KEY)
    const activeMarker = sessionStorage.getItem(NO_REMEMBER_SESSION_KEY)

    if (policy === 'session' && !activeMarker) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.auth.signOut().then(() => {
            localStorage.removeItem(REMEMBER_POLICY_KEY)
            router.replace('/login')
          })
        } else {
          localStorage.removeItem(REMEMBER_POLICY_KEY)
        }
      })
    }
  }, [router])

  return null
}
