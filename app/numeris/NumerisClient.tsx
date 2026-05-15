'use client'

import dynamic from 'next/dynamic'
import type { Puzzle } from '@/components/games/numeris/useNumeris'

const NumerisBoard = dynamic<{ puzzle: Puzzle; puzzleId: string | null }>(
  () => import('@/components/games/numeris/NumerisBoard'),
  { ssr: false }
)

export default function NumerisClient({ puzzle, puzzleId }: { puzzle: Puzzle; puzzleId: string | null }) {
  return <NumerisBoard puzzle={puzzle} puzzleId={puzzleId} />
}
