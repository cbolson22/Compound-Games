'use client'

import dynamic from 'next/dynamic'
import type { LoopaPuzzle } from '@/lib/puzzles/loopa'

const LoopaBoard = dynamic<{ puzzle: LoopaPuzzle; puzzleId: string | null }>(
  () => import('@/components/games/loopa/LoopaBoard'),
  { ssr: false },
)

export default function LoopaClient({
  puzzle,
  puzzleId,
}: {
  puzzle: LoopaPuzzle
  puzzleId: string | null
}) {
  return <LoopaBoard puzzle={puzzle} puzzleId={puzzleId} />
}
