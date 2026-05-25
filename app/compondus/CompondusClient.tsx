'use client'

import dynamic from 'next/dynamic'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'

const CompondusBoard = dynamic<{ puzzle: CompondusPuzzle; puzzleId: string | null }>(
  () => import('@/components/games/compondus/CompondusBoard'),
  { ssr: false }
)

export default function CompondusClient({ puzzle, puzzleId }: { puzzle: CompondusPuzzle; puzzleId: string | null }) {
  return <CompondusBoard puzzle={puzzle} puzzleId={puzzleId} />
}
