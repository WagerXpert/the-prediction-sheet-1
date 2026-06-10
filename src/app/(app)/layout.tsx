import NavBar from '@/components/NavBar'
import OnboardingModal from '@/components/OnboardingModal'
import SessionGuard from '@/components/SessionGuard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="flex-1">{children}</main>
      <OnboardingModal />
      <SessionGuard />
    </>
  )
}
