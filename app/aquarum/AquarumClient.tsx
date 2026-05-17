'use client'

import dynamic from 'next/dynamic'
import type { AquarumPuzzle } from '@/components/games/aquarum/useAquarum'

const AquarumBoard = dynamic<{ puzzle: AquarumPuzzle; puzzleId: string | null }>(
  () => import('@/components/games/aquarum/AquarumBoard'),
  { ssr: false }
)

export default function AquarumClient({ puzzle, puzzleId }: { puzzle: AquarumPuzzle; puzzleId: string | null }) {
  return <AquarumBoard puzzle={puzzle} puzzleId={puzzleId} />
}
