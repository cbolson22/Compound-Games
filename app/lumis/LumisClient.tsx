'use client'

import dynamic from 'next/dynamic'
import type { LumisPuzzle } from '@/components/games/lumis/useLumis'

const LumisBoard = dynamic<{ puzzle: LumisPuzzle; puzzleId: string | null }>(
  () => import('@/components/games/lumis/LumisBoard'),
  { ssr: false }
)

export default function LumisClient({ puzzle, puzzleId }: { puzzle: LumisPuzzle; puzzleId: string | null }) {
  return <LumisBoard puzzle={puzzle} puzzleId={puzzleId} />
}
