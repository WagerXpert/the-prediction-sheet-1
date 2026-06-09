'use client'

import { useState } from 'react'
import Link from 'next/link'
import SignOutButton from './SignOutButton'

interface MobileNavProps {
  displayName: string | null
  isAdmin: boolean
}

export default function MobileNav({ displayName, isAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="sm:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span
          className={`block w-5 h-0.5 bg-black origin-center transition-transform duration-200 ${
            open ? 'rotate-45 translate-y-[7px]' : ''
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-black transition-opacity duration-200 ${
            open ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-black origin-center transition-transform duration-200 ${
            open ? '-rotate-45 -translate-y-[7px]' : ''
          }`}
        />
      </button>

      {open && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-zinc-200 shadow-lg z-50 px-6 py-3 flex flex-col divide-y divide-zinc-100">
          <Link
            href="/cfb"
            onClick={close}
            className="py-3 text-sm font-semibold text-zinc-700 hover:text-black transition-colors"
          >
            CFB Hub
          </Link>
          <Link
            href="/leaderboard"
            onClick={close}
            className="py-3 text-sm font-semibold text-zinc-700 hover:text-black transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/dashboard"
            onClick={close}
            className="py-3 text-sm font-semibold text-zinc-700 hover:text-black transition-colors"
          >
            Dashboard
          </Link>
          {displayName && (
            <Link
              href="/profile"
              onClick={close}
              className="py-3 text-sm font-semibold text-zinc-700 hover:text-black transition-colors"
            >
              {displayName} — Profile
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={close}
              className="py-3 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
            >
              Admin
            </Link>
          )}
          <div className="py-3">
            <SignOutButton />
          </div>
        </div>
      )}
    </>
  )
}
