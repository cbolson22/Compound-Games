'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStreak } from '@/lib/streaks'
import { fmtTime } from '@/lib/format'
import { useAquarum, getOpenSides, type AquarumPuzzle, type PipeCell } from './useAquarum'
import styles from './aquarum.module.css'

// Arm rects for each direction in viewBox "0 0 44 44", arm width 12, center (22,22)
const ARM: Record<number, [number, number, number, number]> = {
  0: [16, 0,  12, 22], // N: x,y,w,h
  1: [22, 16, 22, 12], // E
  2: [16, 22, 12, 22], // S
  3: [0,  16, 22, 12], // W
}

const FILL_TRANSITION = { transition: 'fill 0.5s ease' }

function PipeSvg({ cell, rotation, color }: { cell: PipeCell; rotation: number; color: string }) {
  const openSides = getOpenSides(cell.type, rotation)
  return (
    <svg viewBox="0 0 44 44" width="100%" height="100%" style={{ display: 'block' }}>
      {openSides.map(d => {
        const [x, y, w, h] = ARM[d]
        return <rect key={d} x={x} y={y} width={w} height={h} rx={3} fill={color} style={FILL_TRANSITION} />
      })}
      <circle cx={22} cy={22} r={7} fill={color} style={FILL_TRANSITION} />
      {cell.isSource && <circle cx={22} cy={22} r={3} fill="#fff" />}
      {cell.isSink && <circle cx={22} cy={22} r={3} fill="none" stroke="#fff" strokeWidth={1.5} />}
    </svg>
  )
}

export default function AquarumBoard({
  puzzle,
  puzzleId,
}: {
  puzzle: AquarumPuzzle
  puzzleId: string | null
}) {
  const { user } = useAuth()
  const scoreSubmitted = useRef(false)
  const storageKey = puzzleId ? `aquarum-${puzzleId}` : null

  const [savedElapsed] = useState(() =>
    storageKey ? parseInt(localStorage.getItem(`${storageKey}-elapsed`) || '0', 10) : 0
  )

  const [savedRotations] = useState<number[][] | undefined>(() => {
    if (!storageKey) return undefined
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as number[][]
      if (
        !Array.isArray(parsed) ||
        parsed.length !== puzzle.size ||
        !Array.isArray(parsed[0]) ||
        parsed[0].length !== puzzle.size
      ) {
        localStorage.removeItem(storageKey)
        return undefined
      }
      return parsed
    } catch { return undefined }
  })

  const [existingScore, setExistingScore] = useState<number | null>(null)
  const [loadingScore, setLoadingScore] = useState(!!puzzleId)
  const [streak, setStreak] = useState(0)

  const paused = loadingScore || existingScore !== null

  const { rotations, elapsed, solved, rotateCell, reset, restoreRotations } = useAquarum(puzzle, {
    initialElapsed: savedElapsed,
    paused,
    savedRotations,
  })

  useEffect(() => {
    if (!user || !puzzleId) return
    supabase
      .from('scores')
      .select('time_seconds, solution')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingScore(data.time_seconds)
          if (data.solution) restoreRotations(data.solution as number[][])
          getUserStreak(user.id, 'aquarum').then(setStreak)
        }
        setLoadingScore(false)
      })
  }, [user, puzzleId, restoreRotations])

  useEffect(() => {
    if (!storageKey || loadingScore || existingScore !== null || solved) return
    localStorage.setItem(`${storageKey}-elapsed`, String(elapsed))
  }, [elapsed, storageKey, loadingScore, existingScore, solved])

  useEffect(() => {
    if (!storageKey || loadingScore || existingScore !== null || solved) return
    localStorage.setItem(storageKey, JSON.stringify(rotations))
  }, [rotations, storageKey, loadingScore, existingScore, solved])

  useEffect(() => {
    if (!solved || !user || !puzzleId || scoreSubmitted.current || loadingScore || existingScore !== null) return
    scoreSubmitted.current = true
    if (storageKey) {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(`${storageKey}-elapsed`)
    }
    ;(async () => {
      await supabase.from('scores').insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        time_seconds: elapsed,
        solution: rotations,
      })
      const s = await getUserStreak(user.id, 'aquarum')
      setStreak(s)
    })()
  }, [solved, user, puzzleId, elapsed, rotations, loadingScore, existingScore, storageKey])

  const displayTime = existingScore ?? elapsed
  const isDone = solved || existingScore !== null

  return (
    <div className={styles.board}>
      <div className={styles.title}>Aquarum</div>
      <div className={styles.sub}>Daily Pipe Puzzle</div>

      <div className={styles.timerWrap}>
        <div className={styles.timerLbl}>Time</div>
        <div className={[styles.timer, isDone ? styles.timerSolved : ''].filter(Boolean).join(' ')}>
          {fmtTime(displayTime)}
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.leftCol}>
          <div className={styles.grid}>
            {puzzle.grid.map((row, r) =>
              row.map((cell, c) => {
                const color =
                  cell.type === 'empty'
                    ? 'transparent'
                    : isDone || cell.fixed
                      ? puzzle.colors[cell.colorId]
                      : '#9ca3af'

                const canClick =
                  !cell.fixed && cell.type !== 'empty' && !solved && existingScore === null

                return (
                  <div
                    key={`${r},${c}`}
                    className={[
                      styles.cell,
                      cell.type !== 'empty' ? styles.pipedCell : '',
                      cell.fixed ? styles.fixedCell : '',
                      canClick ? styles.clickable : '',
                    ].filter(Boolean).join(' ')}
                    onClick={canClick ? () => rotateCell(r, c) : undefined}
                  >
                    {cell.type !== 'empty' && (
                      <PipeSvg cell={cell} rotation={rotations[r][c]} color={color} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className={[styles.rightCol, isDone ? styles.rightColSolved : ''].filter(Boolean).join(' ')}>
          {isDone && (
            <div className={styles.solvedBanner}>
              <div className={styles.solvedTxt}>Solved!</div>
              <div className={styles.solvedSub}>Completed in {fmtTime(displayTime)}</div>
              {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
            </div>
          )}
          {!isDone && (
            <div className={styles.hint}>
              Click the gray pipes to rotate them and connect each path.
            </div>
          )}
        </div>
      </div>

      {!isDone && (
        <button className={styles.resetBtn} onClick={reset}>Reset</button>
      )}
    </div>
  )
}
