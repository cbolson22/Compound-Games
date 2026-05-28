'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useVerba, MAX_COL_HEIGHT, GAME_DURATION, WORD_COLORS, type Grid, type VerbaSavedState } from './useVerba'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'
import { LETTER_VALUES } from '@/lib/scoring'
import { fmtTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStreak } from '@/lib/streaks'
import styles from './verba.module.css'


function DraggableTile({ tileId, letter, available, selected, onSelect }: {
  tileId: number
  letter: string
  available: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tile-${tileId}`,
    disabled: !available,
  })
  return (
    <div
      ref={setNodeRef}
      className={[
        styles.bankTile,
        !available ? styles.bankTileUsed : selected ? styles.bankTileSelected : '',
      ].filter(Boolean).join(' ')}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      onClick={available ? onSelect : undefined}
      {...listeners}
      {...attributes}
    >
      {letter}
      <span className={styles.tileValue}>{LETTER_VALUES[letter] ?? 1}</span>
    </div>
  )
}

function Column({ colIdx, letters, highlightedCells, canPlaceHere, onTap }: {
  colIdx: number
  letters: string[]
  highlightedCells: Map<string, number>
  canPlaceHere: boolean
  onTap: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${colIdx}` })

  return (
    <div
      ref={setNodeRef}
      className={[styles.column, isOver && canPlaceHere ? styles.columnOver : ''].filter(Boolean).join(' ')}
      onClick={onTap}
    >
      {Array.from({ length: MAX_COL_HEIGHT }, (_, visualRow) => {
        const dataRow = MAX_COL_HEIGHT - 1 - visualRow
        const letter = letters[dataRow]
        const wordIdx = letter ? highlightedCells.get(`${colIdx},${dataRow}`) : undefined
        const color = wordIdx !== undefined ? WORD_COLORS[wordIdx % WORD_COLORS.length] : null
        return (
          <div
            key={visualRow}
            className={[styles.cell, letter ? styles.cellFilled : ''].filter(Boolean).join(' ')}
            style={color ? {
              background: color.bg,
              borderColor: color.border,
              color: color.text,
              boxShadow: `0 0 10px ${color.glow}`,
            } : {}}
          >
            {letter}
            {letter && <span className={styles.tileValue}>{LETTER_VALUES[letter] ?? 1}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function VerbaBoard({ puzzle, puzzleId }: { puzzle: VerbaPuzzle; puzzleId: string | null }) {
  const { user } = useAuth()
  const scoreSubmitted = useRef(false)

  const [existingScore, setExistingScore] = useState<number | null>(null)
  const [loadingScore, setLoadingScore] = useState(!!puzzleId)
  const [streak, setStreak] = useState(0)

  const storageKey = puzzleId ? `verba-${puzzleId}` : null

  const [savedState] = useState<VerbaSavedState | undefined>(() => {
    if (!storageKey) return undefined
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
  })

  const {
    grid, bank, history, timeLeft, gameOver,
    detectedWords, totalScore, highlightedCells,
    canPlace, placeTile, removeTopTile, undo, restoreGrid,
  } = useVerba(puzzle, savedState)

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // All original tiles (for gray placeholder display)
  const allTiles = useMemo(
    () => puzzle.letters.map((letter, i) => ({ id: i, letter })),
    [puzzle]
  )
  const availableIds = useMemo(() => new Set(bank.map(t => t.id)), [bank])

  // Check for existing score and restore grid
  useEffect(() => {
    if (!user || !puzzleId) { return }
    supabase
      .from('scores')
      .select('score, solution')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzleId)
      .single()
      .then(({ data }) => {
        if (data?.score != null) {
          setExistingScore(data.score)
          if (data.solution) restoreGrid(data.solution as Grid)
          getUserStreak(user.id, 'verba').then(setStreak)
        }
        setLoadingScore(false)
      })
  }, [user, puzzleId, restoreGrid])

  // Save score when timer hits zero
  useEffect(() => {
    if (!gameOver || !user || !puzzleId || scoreSubmitted.current || loadingScore || existingScore !== null) return
    scoreSubmitted.current = true
    ;(async () => {
      await supabase.from('scores').insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        score: totalScore,
        time_seconds: GAME_DURATION,
        solution: grid,
      })
      const s = await getUserStreak(user.id, 'verba')
      setStreak(s)
    })()
  }, [gameOver, user, puzzleId, totalScore, grid, loadingScore, existingScore])

  // Persist in-progress state; clear when game ends or already completed
  useEffect(() => {
    if (!storageKey || existingScore !== null) return
    if (gameOver) { localStorage.removeItem(storageKey); return }
    localStorage.setItem(storageKey, JSON.stringify({ timeLeft, grid, history }))
  }, [storageKey, timeLeft, grid, history, gameOver, existingScore])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleColumnTap = useCallback((colIdx: number) => {
    if (gameOver || existingScore !== null) return
    if (selectedTileId !== null) {
      placeTile(selectedTileId, colIdx)
      setSelectedTileId(null)
    } else {
      removeTopTile(colIdx)
    }
  }, [gameOver, existingScore, selectedTileId, placeTile, removeTopTile])

  const handleTileSelect = useCallback((tileId: number) => {
    setSelectedTileId(prev => prev === tileId ? null : tileId)
  }, [])

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
    setSelectedTileId(null)
  }, [])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const overId = over.id as string
    if (!overId.startsWith('col-')) return
    const tileId = parseInt((active.id as string).slice(5))
    const colIdx = parseInt(overId.slice(4))
    placeTile(tileId, colIdx)
  }, [placeTile])

  const activeTileId = activeId ? parseInt(activeId.slice(5)) : null
  const activeLetter = activeTileId !== null ? (allTiles.find(t => t.id === activeTileId)?.letter ?? null) : null
  const isLow = timeLeft <= 10 && !gameOver
  const played = gameOver || existingScore !== null
  const displayScore = existingScore ?? totalScore

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        <div className={styles.title}>Verba</div>
        <div className={styles.sub}>Daily Word Game</div>

        {!played && (
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statLbl}>Time</div>
              <div className={[styles.timer, isLow ? styles.timerLow : ''].filter(Boolean).join(' ')}>
                {fmtTime(timeLeft)}
              </div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLbl}>Score</div>
              <div className={styles.scoreDisplay}>{totalScore}</div>
            </div>
          </div>
        )}

        <div className={styles.mainLayout}>
          <div className={styles.leftCol}>
            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${puzzle.columns}, 44px)` }}>
              {Array.from({ length: puzzle.columns }, (_, colIdx) => (
                <Column
                  key={colIdx}
                  colIdx={colIdx}
                  letters={grid[colIdx]}
                  highlightedCells={highlightedCells}
                  canPlaceHere={canPlace(colIdx)}
                  onTap={() => handleColumnTap(colIdx)}
                />
              ))}
            </div>
          </div>

          <div className={styles.rightCol}>
            {played && (
              <div className={styles.solvedBanner}>
                <div className={styles.solvedTxt}>{existingScore !== null ? 'Completed!' : "Time's Up!"}</div>
                <div className={styles.solvedPts}>{displayScore}</div>
                <div className={styles.solvedPtsLabel}>pts</div>
                {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
              </div>
            )}

            {!played && (
              <div className={styles.bankWrap}>
                <div className={styles.bankLbl}>Letters</div>
                <div className={styles.bank}>
                  {allTiles.map(tile => (
                    <DraggableTile
                      key={tile.id}
                      tileId={tile.id}
                      letter={tile.letter}
                      available={availableIds.has(tile.id)}
                      selected={selectedTileId === tile.id}
                      onSelect={() => handleTileSelect(tile.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {detectedWords.length > 0 && (
              <div className={styles.wordList}>
                <div className={styles.wordListLbl}>Words Found</div>
                <div className={styles.words}>
                  {detectedWords.map((w, i) => {
                    const color = WORD_COLORS[i % WORD_COLORS.length]
                    return (
                      <span
                        key={i}
                        className={styles.wordChip}
                        style={{ borderColor: color.border, background: color.bg, color: color.text }}
                      >
                        {w.word.toLowerCase()}&nbsp;<span className={styles.wordScore} style={{ color: color.border }}>+{w.score}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {!played && (
              <div className={styles.hint}>
                {selectedTileId !== null
                  ? `Tap a column to place ${allTiles.find(t => t.id === selectedTileId)?.letter ?? ''}`
                  : 'Tap a tile to select, or drag to a column'}
              </div>
            )}
          </div>
        </div>

        {!played && (
          <button className={styles.undoBtn} onClick={undo}>
            ↩ Undo
          </button>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLetter ? (
          <div className={styles.bankTile}>
            {activeLetter}
            <span className={styles.tileValue}>{LETTER_VALUES[activeLetter] ?? 1}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
