import type { Metadata } from 'next'
import Link from 'next/link'
import AquarumClient from './AquarumClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import type { AquarumPuzzle, PipeCell, PipeType } from '@/components/games/aquarum/useAquarum'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aquarum — Compound Games',
}

function e(): PipeCell {
  return { type: 'empty', solvedRotation: 0, fixed: false, colorId: 0, isSource: false, isSink: false }
}

function p(type: PipeType, rot: number, colorId: number, fixed = false, isSource = false, isSink = false): PipeCell {
  return { type, solvedRotation: rot, fixed, colorId, isSource, isSink }
}

// Red path:  (0,0)→(0,1)→(0,2)→(1,2)→(2,2)→(2,1)→(2,0)
// Blue path: (4,4)→(4,5)→(4,6)→(5,6)→(6,6)→(6,5)→(6,4)
const FALLBACK_GRID: PipeCell[][] = [
  [p('cap',      1, 0, true, true,  false), p('straight', 1, 0), p('corner', 2, 0), e(), e(), e(), e()],
  [e(),                                     e(),                  p('straight', 0, 0), e(), e(), e(), e()],
  [p('cap',      1, 0, true, false, true),  p('straight', 1, 0), p('corner', 3, 0), e(), e(), e(), e()],
  [e(), e(), e(), e(), e(), e(), e()],
  [e(), e(), e(), e(), p('cap',      1, 1, true, true,  false), p('straight', 1, 1), p('corner', 2, 1)],
  [e(), e(), e(), e(), e(),                                      e(),                 p('straight', 0, 1)],
  [e(), e(), e(), e(), p('cap',      1, 1, true, false, true),  p('straight', 1, 1), p('corner', 3, 1)],
]

const FALLBACK_PUZZLE: AquarumPuzzle = {
  size: 7,
  grid: FALLBACK_GRID,
  colors: ['#ef4444', '#3b82f6'],
}

async function getTodaysPuzzle(): Promise<{ puzzle: AquarumPuzzle; puzzleId: string | null }> {
  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('id, puzzle_data')
    .eq('game', 'aquarum')
    .eq('puzzle_date', today)
    .single()
  return {
    puzzle: (data?.puzzle_data as AquarumPuzzle) ?? FALLBACK_PUZZLE,
    puzzleId: data?.id ?? null,
  }
}

export default async function AquarumPage() {
  const { puzzle, puzzleId } = await getTodaysPuzzle()
  return (
    <>
      <nav className="px-5 pt-4">
        <Link href="/" className="text-sm text-[#bbb] hover:text-[#1a1a1a] transition-colors">
          ← Home
        </Link>
      </nav>
      <AquarumClient puzzle={puzzle} puzzleId={puzzleId} />
    </>
  )
}
