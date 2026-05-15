import AuthGuard from '@/components/auth/AuthGuard'

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
