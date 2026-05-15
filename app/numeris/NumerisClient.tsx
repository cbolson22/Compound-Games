'use client'

import dynamic from 'next/dynamic'
import type { Puzzle } from '@/components/games/numeris/useNumeris'

const NumerisBoard = dynamic<{ puzzle: Puzzle }>(
  () => import('@/components/games/numeris/NumerisBoard'),
  { ssr: false }
)

export default function NumerisClient({ puzzle }: { puzzle: Puzzle }) {
  return <NumerisBoard puzzle={puzzle} />
}
