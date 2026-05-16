import { useState, useEffect, useMemo, useCallback } from 'react'
import { isWord, getWordSet } from '@/lib/wordlist'
import { scoreWord } from '@/lib/scoring'
import type { VerbaPuzzle } from '@/lib/puzzles/verba'

export const MAX_COL_HEIGHT = 6
export const GAME_DURATION = 60

export type BankTile = { id: number; letter: string }
export type DetectedWord = {
  word: string
  direction: 'h' | 'v'
  startCol: number
  startRow: number  // row 0 = bottom of grid
  score: number
}

// grid[colIdx] = letters from bottom (index 0) to top
export type Grid = string[][]

export function useVerba(puzzle: VerbaPuzzle) {
  const [grid, setGrid] = useState<Grid>(() => Array.from({ length: puzzle.columns }, () => []))
  const [bank, setBank] = useState<BankTile[]>(() =>
    puzzle.letters.map((letter, i) => ({ id: i, letter }))
  )
  const [history, setHistory] = useState<{ tileId: number; colIdx: number }[]>([])
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [wordSet, setWordSet] = useState<Set<string> | null>(null)

  // Load word set once
  useEffect(() => {
    getWordSet().then(setWordSet)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (gameOver) return
    if (timeLeft <= 0) { setGameOver(true); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, gameOver])

  const detectedWords = useMemo((): DetectedWord[] => {
    if (!wordSet) return []
    const found: DetectedWord[] = []
    const maxHeight = Math.max(...grid.map(col => col.length), 0)

    // Horizontal: scan each row level across all columns
    for (let r = 0; r < maxHeight; r++) {
      let runStart = -1
      let run = ''

      const flush = () => {
        if (run.length < 2) { run = ''; runStart = -1; return }
        for (let s = 0; s < run.length; s++) {
          for (let e = s + 2; e <= run.length; e++) {
            const w = run.slice(s, e)
            if (isWord(w, wordSet!)) {
              found.push({ word: w, direction: 'h', startCol: runStart + s, startRow: r, score: scoreWord(w) })
            }
          }
        }
        run = ''; runStart = -1
      }

      for (let c = 0; c < puzzle.columns; c++) {
        const letter = grid[c][r]
        if (letter) {
          if (run === '') runStart = c
          run += letter
        } else {
          flush()
        }
      }
      flush()
    }

    // Vertical: scan each column bottom-to-top
    for (let c = 0; c < puzzle.columns; c++) {
      const col = grid[c]
      if (col.length < 2) continue
      const run = col.join('')
      for (let s = 0; s < run.length; s++) {
        for (let e = s + 2; e <= run.length; e++) {
          const w = run.slice(s, e)
          if (isWord(w, wordSet!)) {
            found.push({ word: w, direction: 'v', startCol: c, startRow: s, score: scoreWord(w) })
          }
        }
      }
    }

    // Deduplicate by position + word
    const seen = new Set<string>()
    return found.filter(w => {
      const key = `${w.direction}-${w.startCol}-${w.startRow}-${w.word}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [grid, wordSet, puzzle.columns])

  const totalScore = useMemo(
    () => detectedWords.reduce((sum, w) => sum + w.score, 0),
    [detectedWords]
  )

  // Set of highlighted cell keys for quick lookup
  const highlightedCells = useMemo(() => {
    const cells = new Set<string>()
    for (const w of detectedWords) {
      if (w.direction === 'h') {
        for (let i = 0; i < w.word.length; i++) {
          cells.add(`${w.startCol + i},${w.startRow}`)
        }
      } else {
        for (let i = 0; i < w.word.length; i++) {
          cells.add(`${w.startCol},${w.startRow + i}`)
        }
      }
    }
    return cells
  }, [detectedWords])

  const canPlace = useCallback((colIdx: number): boolean => {
    return !gameOver && grid[colIdx].length < MAX_COL_HEIGHT
  }, [gameOver, grid])

  const placeTile = useCallback((tileId: number, colIdx: number) => {
    if (!canPlace(colIdx)) return
    const tile = bank.find(t => t.id === tileId)
    if (!tile) return
    setGrid(prev => prev.map((col, i) => i === colIdx ? [...col, tile.letter] : col))
    setBank(prev => prev.filter(t => t.id !== tileId))
    setHistory(prev => [...prev, { tileId, colIdx }])
  }, [bank, canPlace])

  const removeTopTile = useCallback((colIdx: number) => {
    if (gameOver) return
    const col = grid[colIdx]
    if (col.length === 0) return
    // Find which tile is on top of this column (most recently placed in this col)
    const lastHistoryIdx = [...history].reverse().findIndex(h => h.colIdx === colIdx)
    if (lastHistoryIdx === -1) return
    const historyIdx = history.length - 1 - lastHistoryIdx
    const { tileId } = history[historyIdx]
    const letter = col[col.length - 1]
    setGrid(prev => prev.map((c, i) => i === colIdx ? c.slice(0, -1) : c))
    setBank(prev => [...prev, { id: tileId, letter }])
    setHistory(prev => prev.filter((_, i) => i !== historyIdx))
  }, [gameOver, grid, history])

  const undo = useCallback(() => {
    if (gameOver || history.length === 0) return
    const last = history[history.length - 1]
    const col = grid[last.colIdx]
    const letter = col[col.length - 1]
    setGrid(prev => prev.map((c, i) => i === last.colIdx ? c.slice(0, -1) : c))
    setBank(prev => [...prev, { id: last.tileId, letter }])
    setHistory(prev => prev.slice(0, -1))
  }, [gameOver, grid, history])

  const restoreGrid = useCallback((restored: Grid) => {
    setGrid(restored)
  }, [])

  return {
    grid, bank, timeLeft, gameOver, wordSet,
    detectedWords, totalScore, highlightedCells,
    canPlace, placeTile, removeTopTile, undo, restoreGrid,
  }
}
