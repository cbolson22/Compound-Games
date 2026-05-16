import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTomorrowCT } from '@/lib/dates'
import { generateNumeris } from '@/lib/puzzles/numeris'
import { generateLumis } from '@/lib/puzzles/lumis'
import { generateVerba } from '@/lib/puzzles/verba'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const puzzleDate = url.searchParams.get('date') ?? getTomorrowCT()
  const gameFilter = url.searchParams.get('game')

  const all = [
    { game: 'numeris', puzzle_data: generateNumeris() },
    { game: 'lumis',   puzzle_data: generateLumis() },
    { game: 'verba',   puzzle_data: generateVerba() },
  ]
  const puzzles = gameFilter ? all.filter(p => p.game === gameFilter) : all

  const { error } = await supabase
    .from('daily_puzzles')
    .upsert(
      puzzles.map(p => ({ game: p.game, puzzle_date: puzzleDate, puzzle_data: p.puzzle_data })),
      { onConflict: 'game,puzzle_date' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ date: puzzleDate, puzzles })
}
