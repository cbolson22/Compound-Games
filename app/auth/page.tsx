'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'

type Mode = 'signin' | 'signup' | 'forgot'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

const inputClass =
  'px-4 py-3 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#aaa] transition-colors'

export default function AuthPage() {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m: Mode) {
    setEmail(''); setPassword(''); setUsername(''); setError(''); setMode(m)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      setLoading(false)
      if (resetError) { setError(resetError.message); return }
      setError('__sent__')
      return
    }

    if (mode === 'signup') {
      if (!USERNAME_RE.test(username)) {
        setError('3–20 characters, letters, numbers, and underscores only')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, username })
        if (profileError) {
          setError(profileError.code === '23505' ? 'Username already taken' : 'Something went wrong')
          setLoading(false)
          return
        }
        await refreshProfile(data.user.id)
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError('Invalid email or password'); setLoading(false); return }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles').select('id').eq('id', data.user.id).single()
        if (!profile) { router.replace('/auth/username'); return }
      }
    }

    router.replace('/')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="font-serif text-3xl mb-10 hover:opacity-60 transition-opacity">
        Compound Games
      </Link>

      {mode === 'forgot' && error === '__sent__' ? (
        <p className="text-sm text-[#1d9e75] text-center max-w-xs">
          Check your email for a reset link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
          {mode === 'signup' && (
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="username"
              required
              className={inputClass}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email"
            required
            className={inputClass}
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              required
              minLength={6}
              className={inputClass}
            />
          )}
          {error && error !== '__sent__' && <p className="text-xs text-[#e24b4a]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-[#aaa]">
        {mode === 'signin' ? (
          <span className="flex flex-col items-center gap-2">
            <span>No account?{' '}
              <button onClick={() => switchMode('signup')} className="text-[#1a1a1a] hover:underline">
                Sign up
              </button>
            </span>
            <button onClick={() => switchMode('forgot')} className="hover:underline">
              Forgot password?
            </button>
          </span>
        ) : (
          <>
            <button onClick={() => switchMode('signin')} className="text-[#1a1a1a] hover:underline">
              Back to sign in
            </button>
          </>
        )}
      </p>
    </main>
  )
}
