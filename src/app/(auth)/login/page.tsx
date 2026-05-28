import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Sign In' }

interface PageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirectTo, error } = await searchParams

  return (
    <>
      <h1 className="text-2xl font-black mb-1">Welcome back</h1>
      <p className="text-sm text-zinc-500 mb-6">Sign in to your Prediction Sheet account</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <LoginForm redirectTo={redirectTo} />

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-black hover:underline">
          Sign up free
        </Link>
      </p>
    </>
  )
}
