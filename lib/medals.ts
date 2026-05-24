import { supabase } from './supabase'

const GAMES = ['numeris', 'lumis', 'verba', 'aquarum'] as const
type Game = typeof GAMES[number]
type MedalType = 'gold' | 'silver' | 'bronze'

export type MedalCounts = { gold: number; silver: number; bronze: number }
export type AllMedalCounts = Partial<Record<Game, MedalCounts>>

export async function awardMedalsForDate(date: string, db = supabase): Promise<void> {
  for (const game of GAMES) {
    const { data: puzzle } = await db
      .from('daily_puzzles')
      .select('id')
      .eq('game', game)
      .eq('puzzle_date', date)
      .single()

    if (!puzzle) continue

    const { data: scores } = await db
      .from('scores')
      .select('user_id, time_seconds, score')
      .eq('puzzle_id', puzzle.id)

    if (!scores || scores.length === 0) continue

    const sorted = [...scores].sort((a, b) =>
      game === 'verba'
        ? (b.score ?? 0) - (a.score ?? 0)
        : a.time_seconds - b.time_seconds
    )

    // Group into tiers of identical primary metric value
    const tiers: typeof sorted[] = []
    for (const s of sorted) {
      const metric = game === 'verba' ? s.score : s.time_seconds
      const last = tiers[tiers.length - 1]
      const lastMetric = last
        ? (game === 'verba' ? last[0].score : last[0].time_seconds)
        : undefined
      if (last && metric === lastMetric) {
        last.push(s)
      } else {
        tiers.push([s])
      }
    }

    // Olympic-style: rank 1→gold, 2→silver, 3→bronze; ties share a rank and consume positions
    const medalTypes: MedalType[] = ['gold', 'silver', 'bronze']
    const medals: { user_id: string; game: string; puzzle_date: string; medal_type: MedalType }[] = []
    let rank = 1
    for (const tier of tiers) {
      if (rank > 3) break
      const medalType = medalTypes[rank - 1]
      for (const s of tier) {
        medals.push({ user_id: s.user_id, game, puzzle_date: date, medal_type: medalType })
      }
      rank += tier.length
    }

    await db.from('medals').delete().eq('game', game).eq('puzzle_date', date)
    if (medals.length > 0) {
      await db.from('medals').insert(medals)
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
