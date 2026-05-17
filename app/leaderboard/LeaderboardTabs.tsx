'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fmtTime } from '@/lib/format'

type TimeScoreRow  = { user_id: string; time_seconds: number; profiles: { username: string } | null }
type PointScoreRow = { user_id: string; score: number;        profiles: { username: string } | null }

export type LeaderboardData = {
  numerisScores:  TimeScoreRow[]
  lumisScores:    TimeScoreRow[]
  verbaScores:    PointScoreRow[]
  numerisStreaks: Record<string, number>
  lumisStreaks:   Record<string, number>
  verbaStreaks:   Record<string, number>
}

type Tab = 'numeris' | 'lumis' | 'verba'

const MEDAL_BG     = ['#fffbeb', '#f8fafc', '#fef3e8']
const MEDAL_BORDER = ['#d97706', '#94a3b8', '#b45309']
const MEDALS       = ['🥇', '🥈', '🥉']

function rowStyle(rank: number, isMe: boolean): React.CSSProperties {
  return {
    background:   rank < 3 ? MEDAL_BG[rank] : '#fff',
    borderColor:  isMe ? '#3b82f6' : rank < 3 ? MEDAL_BORDER[rank] : '#f0f0f0',
    borderWidth:  isMe ? '2px' : '1.5px',
    borderStyle:  'solid',
  }
}

function ScoreRow({ rank, username, streak, value, isMe }: {
  rank: number; username: string; streak: number; value: string; isMe: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={rowStyle(rank, isMe)}>
      <span className="text-sm w-6 shrink-0 text-center">
        {rank < 3 ? MEDALS[rank] : rank + 1}
      </span>
      <span className="flex-1 text-sm font-medium">{username}</span>
      {streak > 0 && <span className="text-sm text-[#aaa]">{streak}🔥</span>}
      <span className="font-mono text-sm">{value}</span>
    </div>
  )
}

function TimeList({ scores, streaks, userId }: { scores: TimeScoreRow[]; streaks: Record<string, number>; userId?: string }) {
  if (!scores.length) return <p className="text-sm text-[#aaa]">No solves yet today.</p>
  return (
    <div className="w-full flex flex-col gap-2">
      {scores.map((s, i) => (
        <ScoreRow
          key={i}
          rank={i}
          username={s.profiles?.username ?? '—'}
          streak={streaks[s.user_id] ?? 0}
          value={fmtTime(s.time_seconds)}
          isMe={s.user_id === userId}
        />
      ))}
    </div>
  )
}

function PointList({ scores, streaks, userId }: { scores: PointScoreRow[]; streaks: Record<string, number>; userId?: string }) {
  if (!scores.length) return <p className="text-sm text-[#aaa]">No plays yet today.</p>
  return (
    <div className="w-full flex flex-col gap-2">
      {scores.map((s, i) => (
        <ScoreRow
          key={i}
          rank={i}
          username={s.profiles?.username ?? '—'}
          streak={streaks[s.user_id] ?? 0}
          value={`${s.score} pts`}
          isMe={s.user_id === userId}
        />
      ))}
    </div>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'numeris', label: 'Numeris' },
  { id: 'lumis',   label: 'Lumis'   },
  { id: 'verba',   label: 'Verba'   },
]

export default function LeaderboardTabs({
  numerisScores, lumisScores, verbaScores,
  numerisStreaks, lumisStreaks, verbaStreaks,
}: LeaderboardData) {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('numeris')

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      <div className="flex w-full bg-[#f5f5f5] p-1 rounded-xl gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#999] hover:text-[#555]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'numeris' && <TimeList  scores={numerisScores} streaks={numerisStreaks} userId={user?.id} />}
      {tab === 'lumis'   && <TimeList  scores={lumisScores}   streaks={lumisStreaks}   userId={user?.id} />}
      {tab === 'verba'   && <PointList scores={verbaScores}   streaks={verbaStreaks}   userId={user?.id} />}
    </div>
  )
}
