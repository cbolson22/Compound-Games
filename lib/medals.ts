import { supabase } from './supabase'

const GAMES = ['numeris', 'lumis', 'verba', 'aquarum'] as const
type Game = typeof GAMES[number]
type MedalType = 'gold' | 'silver' | 'bronze'

export type MedalCounts = { gold: number; silver: number; bronze: number }
export type AllMedalCounts = Partial<Record<Game, MedalCounts>>

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function computeStreakAtDate(allDates: string[], targetDate: string): number {
  const sorted = allDates
    .filter(d => d <= targetDate)
    .sort((a, b) => b.localeCompare(a))
  if (sorted.length === 0 || sorted[0] !== targetDate) return 0
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === dayBefore(sorted[i - 1])) streak++
    else break
  }
  return streak
}

export async function awardMedalsForDate(date: string): Promise<void> {
  for (const game of GAMES) {
    const { data: puzzle } = await supabase
      .from('daily_puzzles')
      .select('id')
      .eq('game', game)
      .eq('puzzle_date', date)
      .single()

    if (!puzzle) continue

    const { data: scores } = await supabase
      .from('scores')
      .select('user_id, time_seconds, score, completed_at')
      .eq('puzzle_id', puzzle.id)

    if (!scores || scores.length === 0) continue

    const userIds = scores.map(s => s.user_id)

    const { data: history } = await supabase
      .from('scores')
      .select('user_id, daily_puzzles!inner(puzzle_date)')
      .in('user_id', userIds)
      .eq('daily_puzzles.game', game)
      .lte('daily_puzzles.puzzle_date', date)

    const solvesByUser: Record<string, string[]> = {}
    for (const row of (history ?? []) as unknown as { user_id: string; daily_puzzles: { puzzle_date: string } }[]) {
      const pd = row.daily_puzzles?.puzzle_date
      if (!pd) continue
      if (!solvesByUser[row.user_id]) solvesByUser[row.user_id] = []
      solvesByUser[row.user_id].push(pd)
    }

    const streakAt: Record<string, number> = {}
    for (const uid of userIds) {
      streakAt[uid] = computeStreakAtDate(solvesByUser[uid] ?? [], date)
    }

    const sorted = [...scores].sort((a, b) => {
      const primary = game === 'verba'
        ? (b.score ?? 0) - (a.score ?? 0)
        : a.time_seconds - b.time_seconds
      if (primary !== 0) return primary
      const streakDiff = (streakAt[b.user_id] ?? 0) - (streakAt[a.user_id] ?? 0)
      if (streakDiff !== 0) return streakDiff
      return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
    })

    const medalTypes: MedalType[] = ['gold', 'silver', 'bronze']
    const medals = sorted.slice(0, 3).map((s, i) => ({
      user_id: s.user_id,
      game,
      puzzle_date: date,
      medal_type: medalTypes[i],
    }))

    await supabase.from('medals').delete().eq('game', game).eq('puzzle_date', date)
    if (medals.length > 0) {
      await supabase.from('medals').insert(medals)
    }
  }
}

export async function getMedalCounts(userId: string): Promise<AllMedalCounts> {
  const { data } = await supabase
    .from('medals')
    .select('game, medal_type')
    .eq('user_id', userId)

  if (!data) return {}

  const result: AllMedalCounts = {}
  for (const row of data as { game: Game; medal_type: MedalType }[]) {
    if (!result[row.game]) result[row.game] = { gold: 0, silver: 0, bronze: 0 }
    result[row.game]![row.medal_type]++
  }
  return result
}
