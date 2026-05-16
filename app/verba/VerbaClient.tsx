'use client'

import dynamic from 'next/dynamic'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'

const VerbaBoard = dynamic<{ puzzle: VerbaPuzzle; puzzleId: string | null }>(
  () => import('@/components/games/verba/VerbaBoard'),
  { ssr: false }
)

export default function VerbaClient({ puzzle, puzzleId }: { puzzle: VerbaPuzzle; puzzleId: string | null }) {
  return <VerbaBoard puzzle={puzzle} puzzleId={puzzleId} />
}
