import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Reset Password' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-black mb-1">Forgot your password?</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </>
  )
}
