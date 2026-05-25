'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useCompondus, type CompondusSavedState } from './useCompondus'
import type { CompondusPuzzle } from '@/lib/puzzles/compondus'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import styles from './compondus.module.css'

function AnchorRow({ word, position }: { word: string; position: 'start' | 'end' }) {
  return (
    <div className={`${styles.anchorRow} ${position === 'end' ? styles.anchorRowEnd : ''}`}>
      <div className={styles.boxes}>
        {word.split('').map((letter, i) => (
          <div key={i} className={`${styles.box} ${styles.boxAnchor}`}>{letter}</div>
        ))}
      </div>
    </div>
  )
}

function HiddenRow({
  word, isSolved, isActive, isShaking, revealedCount, typedLetters,
}: {
  word: string
  isSolved: boolean
  isActive: boolean
  isShaking: boolean
  revealedCount: number
  typedLetters: string[]
}) {
  const rowClass = [
    styles.hiddenRow,
    isActive ? styles.hiddenRowActive : '',
    isSolved ? styles.hiddenRowSolved : '',
    isShaking ? styles.shake : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      <div className={styles.boxes}>
        {word.split('').map((letter, i) => {
          const isRevealed = isSolved || i < revealedCount
          const typedIdx = i - revealedCount
          const isTyped = !isSolved && !isRevealed && typedIdx >= 0 && typedIdx < typedLetters.length
          const displayLetter = isRevealed ? letter : isTyped ? typedLetters[typedIdx] : ''

          let boxClass = styles.box
          if (isSolved)        boxClass += ` ${styles.boxSolved}`
          else if (isRevealed) boxClass += ` ${styles.boxRevealed}`
          else if (isTyped)    boxClass += ` ${styles.boxTyped}`
          else if (isActive)   boxClass += ` ${styles.boxEmpty}`
          else                 boxClass += ` ${styles.boxLocked}`

          return (
            <div key={i} className={boxClass}>{displayLetter}</div>
          )
        })}
      </div>
    </div>
  )
}

export default function CompondusBoard({ puzzle, puzzleId }: { puzzle: CompondusPuzzle; puzzleId: string | null }) {
  const { user } = useAuth()
  const scoreSubmitted = useRef(false)
  const startTimeRef = useRef(Date.now())

  const [existingScore, setExistingScore] = useState<number | null>(null)
  const [loadingScore, setLoadingScore] = useState(!!puzzleId)
  const [typedLetters, setTypedLetters] = useState<string[]>([])

  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const storageKey = puzzleId ? `compondus-${puzzleId}` : null

  const [savedState] = useState<CompondusSavedState | undefined>(() => {
    if (!storageKey) return undefined
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
  })

  const {
    hidden, wrongCount, currentSlot, solvedMask, revealedCounts,
    submit, solved, shakeSlot,
  } = useCompondus(puzzle, savedState)

  // Check for existing score
  useEffect(() => {
    if (!user || !puzzleId) { setLoadingScore(false); return }
    supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzleId)
      .single()
      .then(({ data }) => {
        if (data?.score != null) setExistingScore(data.score)
        setLoadingScore(false)
      })
  }, [user, puzzleId])

  // Clear typed letters and refocus when slot or wrong count changes
  useEffect(() => {
    setTypedLetters([])
    if (hiddenInputRef.current) hiddenInputRef.current.value = ''
    if (!solved && existingScore === null && !loadingScore) {
      setTimeout(() => hiddenInputRef.current?.focus(), 50)
    }
  }, [currentSlot, wrongCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus on load
  useEffect(() => {
    if (!loadingScore && existingScore === null && !solved) {
      setTimeout(() => hiddenInputRef.current?.focus(), 100)
    }
  }, [loadingScore]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    submit(typedLetters)
    // typedLetters cleared by the currentSlot/wrongCount effect above
  }, [submit, typedLetters])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (solved || existingScore !== null) return
    const target = hidden[currentSlot]
    const maxLen = target.length - (revealedCounts[currentSlot] ?? 0)
    const filtered = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, maxLen)
    setTypedLetters(filtered.split('').filter(Boolean))
    if (e.target.value !== filtered) e.target.value = filtered
  }, [solved, existingScore, hidden, currentSlot, revealedCounts])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Submit score when all words solved
  useEffect(() => {
    if (!solved || !user || !puzzleId || scoreSubmitted.current || loadingScore || existingScore !== null) return
    scoreSubmitted.current = true
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    ;(async () => {
      await supabase.from('scores').insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        score: wrongCount,
        time_seconds: timeTaken,
      })
    })()
  }, [solved, user, puzzleId, wrongCount, loadingScore, existingScore])

  // Persist in-progress state
  useEffect(() => {
    if (!storageKey || existingScore !== null || solved) return
    localStorage.setItem(storageKey, JSON.stringify({ wrongCount, currentSlot, solvedMask, revealedCounts }))
  }, [storageKey, wrongCount, currentSlot, solvedMask, revealedCounts, solved, existingScore])

  useEffect(() => {
    if ((solved || existingScore !== null) && storageKey) localStorage.removeItem(storageKey)
  }, [solved, existingScore, storageKey])

  const played = solved || existingScore !== null
  const displayScore = existingScore ?? wrongCount
  const displaySolvedMask = played ? Array(hidden.length).fill(true) : solvedMask
  const displayRevealedCounts = played ? hidden.map(w => w.length) : revealedCounts

  return (
    <div className={styles.board}>
      {/* Hidden input captures keyboard on both desktop and mobile */}
      <input
        ref={hiddenInputRef}
        className={styles.hiddenInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-hidden="true"
        tabIndex={played ? -1 : 0}
      />

      <div className={styles.title}>Compondus</div>
      <div className={styles.sub}>Compound Word Chain</div>

      <div className={styles.statsRow}>
        {displayScore > 0
          ? <span className={styles.wrongBadge}>{displayScore} wrong guess{displayScore !== 1 ? 'es' : ''}</span>
          : <span className={styles.perfectBadge}>{played ? 'No wrong guesses' : 'Perfect so far'}</span>
        }
      </div>

      <div className={styles.ladder} onClick={() => !played ? hiddenInputRef.current?.focus() : undefined}>
        <AnchorRow word={puzzle.chain[0]} position="start" />

        {hidden.map((word, i) => (
          <React.Fragment key={i}>
            <div className={styles.connector}>↓</div>
            <HiddenRow
              word={word}
              isSolved={displaySolvedMask[i]}
              isActive={!played && i === currentSlot}
              isShaking={shakeSlot === i}
              revealedCount={displayRevealedCounts[i]}
              typedLetters={!played && i === currentSlot ? typedLetters : []}
            />
          </React.Fragment>
        ))}

        <div className={styles.connector}>↓</div>
        <AnchorRow word={puzzle.chain[puzzle.chain.length - 1]} position="end" />
      </div>

      {!played && (
        <p className={styles.hint}>Type a word · press Enter to submit</p>
      )}
    </div>
  )
}
