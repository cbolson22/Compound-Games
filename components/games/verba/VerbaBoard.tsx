'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useVerba, MAX_COL_HEIGHT, GAME_DURATION, type BankTile, type Grid } from './useVerba'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'
import { fmtTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStreak } from '@/lib/streaks'
import styles from './verba.module.css'

function DraggableTile({ tile, selected, onSelect }: {
  tile: BankTile
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `tile-${tile.id}` })
  return (
    <div
      ref={setNodeRef}
      className={[styles.bankTile, selected ? styles.bankTileSelected : ''].filter(Boolean).join(' ')}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      onClick={onSelect}
      {...listeners}
      {...attributes}
    >
      {tile.letter}
    </div>
  )
}

function Column({ colIdx, letters, highlightedCells, canPlaceHere, onTap }: {
  colIdx: number
  letters: string[]
  highlightedCells: Set<string>
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
        const isHighlighted = !!letter && highlightedCells.has(`${colIdx},${dataRow}`)
        return (
          <div
            key={visualRow}
            className={[
              styles.cell,
              letter ? styles.cellFilled : '',
              isHighlighted ? styles.cellWord : '',
            ].filter(Boolean).join(' ')}
          >
            {letter ?? ''}
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

  const {
    grid, bank, timeLeft, gameOver,
    detectedWords, totalScore, highlightedCells,
    canPlace, placeTile, removeTopTile, undo, restoreGrid,
  } = useVerba(puzzle)

  const [selectedTileId, setSelectedTileId] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Check for existing score and restore grid
  useEffect(() => {
    if (!user || !puzzleId) { setLoadingScore(false); return }
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

  const activeTile = activeId ? bank.find(t => t.id === parseInt(activeId.slice(5))) ?? null : null
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

        {!played && (
          <div className={styles.hint}>
            {selectedTileId !== null
              ? `Tap a column to place ${bank.find(t => t.id === selectedTileId)?.letter ?? ''}`
              : 'Tap a tile to select, or drag to a column'}
          </div>
        )}

        {!played && bank.length > 0 && (
          <div className={styles.bankWrap}>
            <div className={styles.bankLbl}>Letters</div>
            <div className={styles.bank}>
              {bank.map(tile => (
                <DraggableTile
                  key={tile.id}
                  tile={tile}
                  selected={selectedTileId === tile.id}
                  onSelect={() => handleTileSelect(tile.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!played && (
          <button className={styles.undoBtn} onClick={undo}>
            ↩ Undo
          </button>
        )}

        {detectedWords.length > 0 && (
          <div className={styles.wordList}>
            <div className={styles.wordListLbl}>Words Found</div>
            <div className={styles.words}>
              {detectedWords.map((w, i) => (
                <span key={i} className={styles.wordChip}>
                  {w.word.toLowerCase()}&nbsp;<span className={styles.wordScore}>+{w.score}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {played && (
          <div className={styles.solvedBanner}>
            <div className={styles.solvedTxt}>{existingScore !== null ? 'Completed!' : "Time's Up!"}</div>
            <div className={styles.solvedPts}>{displayScore} pts</div>
            {streak > 0 && <div className={styles.solvedSub}>{streak}🔥</div>}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTile ? <div className={styles.bankTile}>{activeTile.letter}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}
