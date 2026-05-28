import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-black tracking-tight">
        THE PREDICTION <span className="text-[#84cc16]">SHEET</span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
