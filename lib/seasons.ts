import { supabase } from './supabase'
import { getTodaysCT, dayAfter, nDaysAfter } from './dates'

export type Season = {
  id: string
  season_number: number
  name: string
  start_date: string
  end_date: string
}

export type MedalLeaderboardEntry = {
  user_id: string
  username: string
  gold: number
  silver: number
  bronze: number
}

const GAMES = ['numeris', 'lumis', 'verba', 'aquarum', 'compondus', 'loopa'] as const

function sortAndTop5(entries: MedalLeaderboardEntry[]): MedalLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold
    if (b.silver !== a.silver) return b.silver - a.silver
    return b.bronze - a.bronze
  })
  if (sorted.length <= 5) return sorted
  const fifth = sorted[4]
  return sorted.filter(
    e =>
      e.gold > fifth.gold ||
      (e.gold === fifth.gold && e.silver > fifth.silver) ||
      (e.gold === fifth.gold && e.silver === fifth.silver && e.bronze >= fifth.bronze),
  )
}

export async function getCurrentSeason(db = supabase): Promise<Season | null> {
  const today = getTodaysCT()
  const { data } = await db
    .from('seasons')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1)
  return (data?.[0] as Season | undefined) ?? null
}

export async function getAllSeasons(db = supabase): Promise<Season[]> {
  const { data } = await db
    .from('seasons')
    .select('*')
    .order('season_number', { ascending: false })
  return (data ?? []) as Season[]
}

// Fetches all medal rows (optionally filtered by date range) and aggregates into
// per-game top-5 leaderboards. One query covers all games at once.
export async function getMedalLeaderboards(
  startDate: string | null,
  endDate: string | null,
  db = supabase,
): Promise<Record<string, MedalLeaderboardEntry[]>> {
  type MedalRow = {
    user_id: string
    game: string
    medal_type: string
    profiles: { username: string } | null
  }

  let query = db.from('medals').select('user_id, game, medal_type, profiles(username)')
  if (startDate) query = query.gte('puzzle_date', startDate)
  if (endDate) query = query.lte('puzzle_date', endDate)

  const { data } = await query
  if (!data) return {}

  const byGame: Record<string, Record<string, MedalLeaderboardEntry>> = {}

  for (const row of data as unknown as MedalRow[]) {
    if (!byGame[row.game]) byGame[row.game] = {}
    const byUser = byGame[row.game]
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = {
        user_id: row.user_id,
        username: row.profiles?.username ?? 'Unknown',
        gold: 0,
        silver: 0,
        bronze: 0,
      }
    }
    byUser[row.user_id][row.medal_type as 'gold' | 'silver' | 'bronze']++
  }

  const result: Record<string, MedalLeaderboardEntry[]> = {}
  for (const game of GAMES) {
    result[game] = byGame[game] ? sortAndTop5(Object.values(byGame[game])) : []
  }
  return result
}

export async function awardSeasonTrophies(seasonId: string, db = supabase): Promise<void> {
  const { data: season } = await db.from('seasons').select('*').eq('id', seasonId).single()
  if (!season) return

  const leaderboards = await getMedalLeaderboards(season.start_date, season.end_date, db)

  const trophies: { user_id: string; game: string; season_id: string; trophy_type: string }[] = []

  for (const game of GAMES) {
    const entries = leaderboards[game] ?? []
    if (!entries.length) continue

    let rank = 1
    let prevKey = ''
    let prevRank = 1

    for (const entry of entries) {
      const key = `${entry.gold}-${entry.silver}-${entry.bronze}`
      if (key !== prevKey) {
        prevRank = rank
        prevKey = key
      }
      if (prevRank <= 3) {
        const trophyType = prevRank === 1 ? 'gold' : prevRank === 2 ? 'silver' : 'bronze'
        trophies.push({ user_id: entry.user_id, game, season_id: seasonId, trophy_type: trophyType })
      }
      rank++
    }
  }

  await db.from('season_trophies').delete().eq('season_id', seasonId)
  if (trophies.length > 0) {
    await db.from('season_trophies').insert(trophies)
  }
}

// Creates season N+1 (start = currentSeason.end + 1 day, length = 6 weeks).
// No-ops if N+1 already exists.
export async function createNextSeason(currentSeason: Season, db = supabase): Promise<void> {
  const nextNumber = currentSeason.season_number + 1
  const { data: existing } = await db
    .from('seasons')
    .select('id')
    .eq('season_number', nextNumber)
    .limit(1)
  if (existing?.length) return

  const nextStart = dayAfter(currentSeason.end_date)
  const nextEnd = nDaysAfter(41, nextStart) // 42 days = 6 weeks

  await db.from('seasons').insert({
    season_number: nextNumber,
    name: `Season ${nextNumber}`,
    start_date: nextStart,
    end_date: nextEnd,
  })
}
