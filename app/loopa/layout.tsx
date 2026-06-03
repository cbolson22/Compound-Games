import AuthGuard from '@/components/auth/AuthGuard'

export default function LoopaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
