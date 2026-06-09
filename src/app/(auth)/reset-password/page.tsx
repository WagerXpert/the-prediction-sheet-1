import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Set New Password' }

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-black mb-1">Set a new password</h1>
      <p className="text-sm text-zinc-500 mb-6">Choose a strong password for your account.</p>
      <ResetPasswordForm />
    </>
  )
}
