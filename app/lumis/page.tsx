import type { Metadata } from 'next'
import Link from 'next/link'
import LumisClient from './LumisClient'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'
import type { LumisPuzzle } from '@/components/games/lumis/useLumis'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lumis — Compound Games',
}

const FALLBACK_PUZZLE: LumisPuzzle = {
  target: [
    [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
    [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],
    [2,0],[2,1],[2,4],[2,5],
    [3,4],[3,5],[3,6],
  ],
  pieces: [
    { id: 'sqA', shape: [[0,0],[0,1],[1,0],[1,1]] },
    { id: 'sqB', shape: [[0,0],[0,1],[1,0],[1,1]] },
    { id: 'h3',  shape: [[0,0],[0,1],[0,2]] },
    { id: 'v3',  shape: [[0,0],[1,0],[2,0]] },
    { id: 'l',   shape: [[0,0],[1,0],[2,0],[2,1]] },
    { id: 'h2',  shape: [[0,0],[0,1]] },
  ],
}

async function getTodaysPuzzle(): Promise<{ puzzle: LumisPuzzle; puzzleId: string | null }> {
  const today = getTodaysCT()
  const { data } = await supabase
    .from('daily_puzzles')
    .select('id, puzzle_data')
    .eq('game', 'lumis')
    .eq('puzzle_date', today)
    .single()
  return {
    puzzle: (data?.puzzle_data as LumisPuzzle) ?? FALLBACK_PUZZLE,
    puzzleId: data?.id ?? null,
  }
}

export default async function LumisPage() {
  const { puzzle, puzzleId } = await getTodaysPuzzle()
  return (
    <>
      <nav className="px-5 pt-4">
        <Link href="/" className="text-sm text-[#bbb] hover:text-[#1a1a1a] transition-colors">
          ← Home
        </Link>
      </nav>
      <LumisClient puzzle={puzzle} puzzleId={puzzleId} />
    </>
  )
}
