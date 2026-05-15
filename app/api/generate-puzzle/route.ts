import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTomorrowCT } from '@/lib/dates'
import { generateNumeris } from '@/lib/puzzles/numeris'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const puzzleDate = getTomorrowCT()
  const puzzle = generateNumeris()

  const { error } = await supabase
    .from('daily_puzzles')
    .upsert(
      { game: 'numeris', puzzle_date: puzzleDate, puzzle_data: puzzle },
      { onConflict: 'game,puzzle_date' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ date: puzzleDate, puzzle })
}
