import AuthGuard from '@/components/auth/AuthGuard'

export default function AquarumLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
