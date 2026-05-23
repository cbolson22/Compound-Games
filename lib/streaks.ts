import { supabase } from './supabase'
import { getTodaysCT, dayBefore } from './dates'

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  const today = getTodaysCT()

  if (sorted[0] !== today && sorted[0] !== dayBefore(today)) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === dayBefore(sorted[i - 1])) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export async function getStreaksForUsers(userIds: string[], game: string): Promise<Record<string, number>> {
  if (userIds.length === 0) return {}

  const { data } = await supabase
    .from('scores')
    .select('user_id, daily_puzzles!inner(puzzle_date)')
    .in('user_id', userIds)
    .eq('daily_puzzles.game', game)

  if (!data) return {}

  const byUser: Record<string, string[]> = {}
  for (const row of data as unknown as { user_id: string; daily_puzzles: { puzzle_date: string } | null }[]) {
    const date = row.daily_puzzles?.puzzle_date
    if (!date) continue
    if (!byUser[row.user_id]) byUser[row.user_id] = []
    byUser[row.user_id].push(date)
  }

  const result: Record<string, number> = {}
  for (const [userId, dates] of Object.entries(byUser)) {
    result[userId] = computeStreak(dates)
  }
  return result
}

export async function getUserStreak(userId: string, game: string): Promise<number> {
  const streaks = await getStreaksForUsers([userId], game)
  return streaks[userId] ?? 0
}
