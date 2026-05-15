'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function UsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!USERNAME_RE.test(username)) {
      setError('3–20 characters, letters, numbers, and underscores only')
      return
    }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: session.user.id, username })

    if (insertError) {
      setError(insertError.code === '23505' ? 'Username already taken' : 'Something went wrong')
      setLoading(false)
      return
    }

    router.replace('/')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-serif text-3xl mb-2">Choose a username</h1>
      <p className="text-sm text-[#aaa] mb-8">This is how you&apos;ll appear on the leaderboard</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          placeholder="your_username"
          required
          className="px-4 py-3 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#aaa] transition-colors"
        />
        {error && <p className="text-xs text-[#e24b4a]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
