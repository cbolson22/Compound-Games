import type { AquarumPuzzle, PipeCell, PipeType } from '@/components/games/aquarum/useAquarum'

type Dir = 0 | 1 | 2 | 3
const DR = [-1, 0, 1, 0]
const DC = [0, 1, 0, -1]
const SIZE = 7

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function dirBetween(r1: number, c1: number, r2: number, c2: number): Dir {
  for (let d = 0; d < 4; d++) {
    if (r1 + DR[d] === r2 && c1 + DC[d] === c2) return d as Dir
  }
  throw new Error(`Not adjacent: (${r1},${c1})→(${r2},${c2})`)
}

function determinePipe(openDirs: Dir[]): { type: PipeType; rotation: number } {
  if (openDirs.length === 1) return { type: 'cap', rotation: openDirs[0] }
  const key = [...openDirs].sort((a, b) => a - b).join(',')
  const MAP: Record<string, { type: PipeType; rotation: number }> = {
    '0,2': { type: 'straight', rotation: 0 },
    '1,3': { type: 'straight', rotation: 1 },
    '0,1': { type: 'corner',   rotation: 0 },
    '1,2': { type: 'corner',   rotation: 1 },
    '2,3': { type: 'corner',   rotation: 2 },
    '0,3': { type: 'corner',   rotation: 3 },
  }
  return MAP[key] ?? { type: 'straight', rotation: 0 }
}

function findPath(occupied: boolean[][]): [number, number][] | null {
  let startR = 0, startC = 0, found = false
  for (let attempt = 0; attempt < 300; attempt++) {
    startR = randInt(0, SIZE - 1)
    startC = randInt(0, SIZE - 1)
    if (!occupied[startR][startC]) { found = true; break }
  }
  if (!found) return null

  const minLen = 6, maxLen = 12
  const path: [number, number][] = [[startR, startC]]
  const inPath = new Set([`${startR},${startC}`])

  function dfs(): boolean {
    if (path.length >= maxLen) return true
    const [r, c] = path[path.length - 1]
    for (const d of shuffle([0, 1, 2, 3] as Dir[])) {
      const nr = r + DR[d], nc = c + DC[d]
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue
      if (occupied[nr][nc] || inPath.has(`${nr},${nc}`)) continue
      path.push([nr, nc])
      inPath.add(`${nr},${nc}`)
      if (dfs()) return true
      path.pop()
      inPath.delete(`${nr},${nc}`)
    }
    return path.length >= minLen
  }

  return dfs() ? path : null
}

export function generateAquarum(): AquarumPuzzle {
  const COLORS = ['#ef4444', '#3b82f6']

  for (let attempt = 0; attempt < 1000; attempt++) {
    const occupied: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
    const grid: PipeCell[][] = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, (): PipeCell => ({
        type: 'empty', solvedRotation: 0, fixed: false,
        colorId: 0, isSource: false, isSink: false,
      }))
    )

    let ok = true
    for (let colorId = 0; colorId < COLORS.length; colorId++) {
      const path = findPath(occupied)
      if (!path) { ok = false; break }

      for (const [r, c] of path) occupied[r][c] = true

      for (let i = 0; i < path.length; i++) {
        const [r, c] = path[i]
        const openDirs: Dir[] = []
        if (i > 0)               openDirs.push(dirBetween(r, c, path[i - 1][0], path[i - 1][1]))
        if (i < path.length - 1) openDirs.push(dirBetween(r, c, path[i + 1][0], path[i + 1][1]))
        const { type, rotation: solvedRotation } = determinePipe(openDirs)
        const isSource = i === 0
        const isSink   = i === path.length - 1
        grid[r][c] = { type, solvedRotation, fixed: isSource || isSink, colorId, isSource, isSink }
      }
    }

    if (ok) return { size: SIZE, grid, colors: COLORS }
  }

  throw new Error('Failed to generate Aquarum puzzle')
}
