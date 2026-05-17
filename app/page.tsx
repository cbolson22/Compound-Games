'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStreak } from '@/lib/streaks'
import { supabase } from '@/lib/supabase'
import { getTodaysCT } from '@/lib/dates'

async function fetchPlayedGames(userId: string): Promise<Set<string>> {
  const { data: puzzles } = await supabase
    .from('daily_puzzles')
    .select('id, game')
    .eq('puzzle_date', getTodaysCT())
    .in('game', ['numeris', 'lumis', 'verba'])
  if (!puzzles?.length) return new Set()

  const { data: scores } = await supabase
    .from('scores')
    .select('puzzle_id')
    .eq('user_id', userId)
    .in('puzzle_id', puzzles.map(p => p.id))
  if (!scores?.length) return new Set()

  const scored = new Set(scores.map(s => s.puzzle_id))
  return new Set(puzzles.filter(p => scored.has(p.id)).map(p => p.game))
}

function StatusBadge({ played }: { played: boolean }) {
  if (played) {
    return (
      <span className="text-xs font-medium text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">
        ✓ Done
      </span>
    )
  }
  return (
    <span className="text-xs font-medium text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">
      Play today
    </span>
  )
}

export default function Home() {
  const { user, profile, loading, signOut } = useAuth()
  const [numerisStreak, setNumerisStreak] = useState(0)
  const [lumisStreak, setLumisStreak]     = useState(0)
  const [verbaStreak, setVerbaStreak]     = useState(0)
  const [playedGames, setPlayedGames]     = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!user) return
    getUserStreak(user.id, 'numeris').then(setNumerisStreak)
    getUserStreak(user.id, 'lumis').then(setLumisStreak)
    getUserStreak(user.id, 'verba').then(setVerbaStreak)
    fetchPlayedGames(user.id).then(setPlayedGames)
  }, [user])

  const games = [
    { href: '/numeris', name: 'Numeris', desc: 'Daily Number Puzzle', streak: numerisStreak, key: 'numeris' },
    { href: '/lumis',   name: 'Lumis',   desc: 'Daily Memory Puzzle',  streak: lumisStreak,  key: 'lumis'   },
    { href: '/verba',   name: 'Verba',   desc: 'Daily Word Game',      streak: verbaStreak,  key: 'verba'   },
  ]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-serif text-5xl mb-2">Compound Games</h1>
      <p className="text-xs uppercase tracking-widest text-[#ccc] mb-12">Daily Puzzles</p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {games.map(g => (
          <Link
            key={g.key}
            href={g.href}
            className="flex items-start justify-between gap-2 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
          >
            <div className="flex flex-col gap-1">
              <span className="font-serif text-2xl">{g.name}</span>
              <span className="text-sm text-[#aaa]">{g.desc}</span>
            </div>
            {playedGames !== null && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge played={playedGames.has(g.key)} />
                {g.streak > 0 && <span className="text-sm text-[#aaa]">{g.streak}🔥</span>}
              </div>
            )}
          </Link>
        ))}

        <Link
          href="/leaderboard"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
        >
          <span className="font-serif text-2xl">Leaderboard</span>
          <span className="text-sm text-[#aaa]">Today&apos;s Rankings</span>
        </Link>
      </div>

      <div className="mt-12 text-sm text-[#aaa]">
        {!loading && (
          user ? (
            <div className="flex items-center gap-4">
              <span>{profile?.username ?? user.email}</span>
              <button onClick={signOut} className="hover:text-[#1a1a1a] transition-colors">
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/auth" className="hover:text-[#1a1a1a] transition-colors">
              Sign in
            </Link>
          )
        )}
      </div>
    </main>
  )
}
