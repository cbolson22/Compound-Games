import type { Metadata } from 'next'
import Link from 'next/link'
import NumerisClient from './NumerisClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import type { Puzzle } from '@/components/games/numeris/useNumeris'

const FALLBACK_PUZZLE: Puzzle = {
  target: 100,
  tiles: ['(', '2', '+', '8', ')', '^', '2'],
  slots: 7,
}

async function getTodaysPuzzle(): Promise<{ puzzle: Puzzle; puzzleId: string | null }> {
  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('id, puzzle_data')
    .eq('game', 'numeris')
    .eq('puzzle_date', today)
    .single()
  return {
    puzzle: (data?.puzzle_data as Puzzle) ?? FALLBACK_PUZZLE,
    puzzleId: data?.id ?? null,
  }
}

export const metadata: Metadata = {
  title: 'Numeris — Compound Games',
}

export default async function NumerisPage() {
  const { puzzle, puzzleId } = await getTodaysPuzzle()
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
      <NumerisClient puzzle={puzzle} puzzleId={puzzleId} />
    </>
  )
}
