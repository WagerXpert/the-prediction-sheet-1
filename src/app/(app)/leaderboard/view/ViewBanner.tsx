import Link from 'next/link'

export default function ViewBanner({
  displayName,
  backHref = '/leaderboard',
}: {
  displayName: string
  backHref?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
      <p className="text-sm font-semibold text-amber-800">
        Viewing {displayName}&apos;s picks — read only
      </p>
      <Link href={backHref} className="text-xs font-bold text-amber-700 hover:underline shrink-0">
        ← Back to Leaderboard
      </Link>
    </div>
  )
}
