import AuthGuard from '@/components/auth/AuthGuard'

export default function NumerisLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
