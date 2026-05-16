import AuthGuard from '@/components/auth/AuthGuard'

export default function VerbaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
