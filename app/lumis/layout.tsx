import AuthGuard from '@/components/auth/AuthGuard'

export default function LumisLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
