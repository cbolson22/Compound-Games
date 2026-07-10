'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Season, MedalLeaderboardEntry } from '@/lib/seasons'

const GAMES = ['numeris', 'lumis', 'verba', 'aquarum', 'compondus', 'loopa'] as const
type Game = typeof GAMES[number]

const GAME_LABELS: Record<Game, string> = {
  numeris: 'Numeris',
  lumis: 'Lumis',
  verba: 'Verba',
  aquarum: 'Aquarum',
  compondus: 'Compondus',
  loopa: 'Loopa',
}

const MEDAL_BG = ['#fffbeb', '#f8fafc', '#fef3e8']
const MEDAL_BORDER = ['#d97706', '#94a3b8', '#b45309']
const MEDAL_EMOJI = ['🥇', '🥈', '🥉']

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function daysUntil(endDate: string, today: string): number {
  const end = new Date(endDate + 'T12:00:00')
  const now = new Date(today + 'T12:00:00')
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000))
}

// Olympic-style: ties share a rank, 1-indexed.
function rankEntries(entries: MedalLeaderboardEntry[]): number[] {
  const ranks: number[] = []
  let prevKey = ''
  let prevRank = 0
  for (let i = 0; i < entries.length; i++) {
    const key = `${entries[i].gold}-${entries[i].silver}-${entries[i].bronze}`
    if (key !== prevKey) {
      prevRank = i + 1
      prevKey = key
    }
    ranks.push(prevRank)
  }
  return ranks
}

function MedalBoard({
  entries,
  userId,
}: {
  entries: MedalLeaderboardEntry[]
  userId?: string
}) {
  if (!entries.length) {
    return <p className="text-sm text-[#aaa]">No medals yet.</p>
  }

  const ranks = rankEntries(entries)

  return (
    <div className="w-full flex flex-col gap-2">
      {entries.map((entry, i) => {
        const rank = ranks[i]
        const medalIdx = rank <= 3 ? rank - 1 : -1
        const isMe = entry.user_id === userId

        return (
          <div
            key={entry.user_id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: medalIdx >= 0 ? MEDAL_BG[medalIdx] : '#fff',
              borderColor: isMe ? '#3b82f6' : medalIdx >= 0 ? MEDAL_BORDER[medalIdx] : '#f0f0f0',
              borderWidth: isMe ? '2px' : '1.5px',
              borderStyle: 'solid',
            }}
          >
            <span className="text-sm w-6 shrink-0 text-center">
              {rank <= 3 ? MEDAL_EMOJI[rank - 1] : rank}
            </span>
            <span className="flex-1 text-sm font-medium">{entry.username}</span>
            <span className="text-sm text-[#aaa]">
              {entry.gold}🥇 {entry.silver}🥈 {entry.bronze}🥉
            </span>
          </div>
        )
      })}
      <p className="text-[0.65rem] text-[#ccc] text-center tracking-wide pt-1">Top 5 · ties included</p>
    </div>
  )
}

type Props = {
  seasons: Season[]
  boardsBySeason: Record<string, Record<string, MedalLeaderboardEntry[]>>
  currentSeasonId: string | null
  today: string
}

export default function SeasonsClient({
  seasons,
  boardsBySeason,
  currentSeasonId,
  today,
}: Props) {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string>(currentSeasonId ?? seasons[seasons.length - 1]?.id ?? '')
  const [tab, setTab] = useState<Game>('numeris')

  const selected = seasons.find(s => s.id === selectedId)
  const boards = boardsBySeason[selectedId] ?? {}
  const isCurrentSeason = selected?.id === currentSeasonId
  const daysLeft = selected && isCurrentSeason ? daysUntil(selected.end_date, today) : null

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6 mt-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="font-serif text-4xl">Seasons</h1>
        {selected && (
          <p className="text-xs uppercase tracking-widest text-[#ccc]">
            {isCurrentSeason && daysLeft !== null
              ? `${selected.name} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
              : `${fmtDate(selected.start_date)} – ${fmtDate(selected.end_date)}`}
          </p>
        )}
      </div>

      {/* Season selector */}
      {seasons.length > 1 && (
        <div className="flex w-full bg-[#f5f5f5] p-1 rounded-xl gap-1">
          {seasons.map(s => {
            const isCurrent = s.id === currentSeasonId
            const days = isCurrent ? daysUntil(s.end_date, today) : null
            const sublabel = isCurrent
              ? `${days} day${days !== 1 ? 's' : ''} left`
              : `${fmtDate(s.start_date)} – ${fmtDate(s.end_date)}`

            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex-1 py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                  selectedId === s.id
                    ? 'bg-white text-[#1a1a1a] shadow-sm'
                    : 'text-[#999] hover:text-[#555]'
                }`}
              >
                <span className="text-xs font-medium">{s.name}</span>
                <span className="text-[0.6rem] text-[#bbb] leading-none">{sublabel}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Game tabs */}
      <div className="flex w-full bg-[#f5f5f5] p-1 rounded-xl gap-1">
        {GAMES.map(g => (
          <button
            key={g}
            onClick={() => setTab(g)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === g ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#999] hover:text-[#555]'
            }`}
          >
            {GAME_LABELS[g]}
          </button>
        ))}
      </div>

      <MedalBoard entries={boards[tab] ?? []} userId={user?.id} />
    </div>
  )
}
