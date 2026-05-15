'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStreak } from '@/lib/streaks'

export default function Home() {
  const { user, profile, loading, signOut } = useAuth()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!user) return
    getUserStreak(user.id, 'numeris').then(setStreak)
  }, [user])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-serif text-5xl mb-2">Compound Games</h1>
      <p className="text-xs uppercase tracking-widest text-[#ccc] mb-12">Daily Puzzles</p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/numeris"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl">Numeris</span>
            {streak > 0 && <span className="text-sm text-[#aaa]">{streak}🔥</span>}
          </div>
          <span className="text-sm text-[#aaa]">Daily Number Puzzle</span>
        </Link>
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
              <button
                onClick={signOut}
                className="hover:text-[#1a1a1a] transition-colors"
              >
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
