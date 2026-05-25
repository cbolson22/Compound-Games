import AuthGuard from '@/components/auth/AuthGuard'

export default function CompondusLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
