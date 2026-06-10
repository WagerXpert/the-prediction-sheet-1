'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  text: string
  url: string
}

export default function ShareButton({ text, url }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function shareOnX() {
    const tweet = encodeURIComponent(`${text}\n\n${url}`)
    window.open(`https://x.com/intent/tweet?text=${tweet}`, '_blank', 'noopener')
    setOpen(false)
  }

  async function copyText() {
    await navigator.clipboard.writeText(`${text}\n\n${url}`)
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 1600)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Share picks"
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
          open
            ? 'bg-zinc-100 text-zinc-700'
            : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
        }`}
      >
        <ShareIcon />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden z-30 animate-fade-in">
          <button
            onClick={shareOnX}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
          >
            <XLogo />
            Share on X
          </button>
          <button
            onClick={copyText}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors text-left border-t border-zinc-100"
          >
            <CopyIcon copied={copied} />
            {copied ? 'Copied!' : 'Copy text'}
          </button>
        </div>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function XLogo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
