import Link from 'next/link'

export default function BackLink({
  href = '/cfb/full-season',
  label = 'Full Season Mode',
}: {
  href?: string
  label?: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-zinc-500 hover:text-black transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  )
}
