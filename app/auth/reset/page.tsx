'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'px-4 py-3 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#aaa] transition-colors'

export default function ResetPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.replace('/'), 2000)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <p className="text-sm text-[#1d9e75]">Password updated! Redirecting…</p>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <p className="text-sm text-[#aaa]">Verifying your reset link…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="font-serif text-3xl mb-10 hover:opacity-60 transition-opacity">
        Compound Games
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="new password"
          required
          minLength={6}
          className={inputClass}
        />
        {error && <p className="text-xs text-[#e24b4a]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Set new password'}
        </button>
      </form>
    </main>
  )
}
