import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllSeasons, getMedalLeaderboards, type Season, type MedalLeaderboardEntry } from '@/lib/seasons'
import { getTodaysCT } from '@/lib/dates'
import SeasonsClient from './SeasonsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Seasons — Compound Games',
}

export default async function SeasonsPage() {
  const today = getTodaysCT()
  const allSeasons = await getAllSeasons() // descending by season_number

  const boardsBySeason: Record<string, Record<string, MedalLeaderboardEntry[]>> = {}
  await Promise.all(
    allSeasons.map(async (season: Season) => {
      boardsBySeason[season.id] = await getMedalLeaderboards(season.start_date, season.end_date)
    }),
  )

  const currentSeasonId =
    allSeasons.find((s: Season) => s.start_date <= today && s.end_date >= today)?.id ??
    allSeasons[0]?.id ??
    null

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <nav className="px-5 pt-5 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all"
        >
          ← Home
        </Link>
      </nav>

      <SeasonsClient
        seasons={[...allSeasons].reverse()} // ascending so Season 1 is first
        boardsBySeason={boardsBySeason}
        currentSeasonId={currentSeasonId}
        today={today}
      />
    </main>
  )
}
