import type { Metadata } from 'next'
import Link from 'next/link'
import NumerisClient from './NumerisClient'

export const metadata: Metadata = {
  title: 'Numeris — Compound Games',
}

export default function NumerisPage() {
  return (
    <>
      <nav className="px-5 pt-4">
        <Link
          href="/"
          className="text-sm text-[#bbb] hover:text-[#1a1a1a] transition-colors"
        >
          ← Home
        </Link>
      </nav>
      <NumerisClient />
    </>
  )
}
