import type { Metadata } from 'next'
import Link from 'next/link'
import AquarumClient from './AquarumClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import { generateAquarum } from '@/lib/puzzles/aquarum'
import type { AquarumPuzzle } from '@/components/games/aquarum/useAquarum'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aquarum — Compound Games',
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
    puzzle: (data?.puzzle_data as AquarumPuzzle) ?? generateAquarum(),
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
