import type { Metadata } from 'next'
import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Create Account' }

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-black mb-1">Create your account</h1>
      <p className="text-sm text-zinc-500 mb-6">Start making your 2026 CFB predictions for free</p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-black hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
