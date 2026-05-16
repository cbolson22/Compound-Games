<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Compound Games — project context for AI agents

Daily puzzle site for a friend group at https://compound-games.vercel.app. Each game resets at midnight Central Time (America/Chicago).

## Key conventions

- All date logic uses `getTodaysCT()` / `getTomorrowCT()` from `lib/dates.ts` — never use `new Date()` directly for puzzle dates
- Supabase client is at `lib/supabase.ts`. Always `await` or `.then()` Supabase calls — the lazy promise pattern means silent failures if you don't
- Scores are saved with a `useRef` guard (`scoreSubmitted`) to prevent double-submission
- Board components are loaded via `dynamic(..., { ssr: false })` inside a `'use client'` wrapper file — the dynamic call itself must be in a `'use client'` file
- All game and leaderboard pages need `export const dynamic = 'force-dynamic'` to prevent Next.js static caching
- `solved` state must be derived via `useMemo`, not set inside a `useEffect` (causes cascading render lint errors)
- In-progress timer is persisted in `localStorage` keyed by `puzzleId`; cleared on solve
- Auth is handled by `AuthProvider` (context) and `AuthGuard` (redirect wrapper)
- Streaks are computed from DB scores via `getUserStreak(userId, game)` — not stored separately
- CSS uses CSS Modules. Design language: DM Serif for titles, DM Mono for timer/mono values, Outfit for buttons

## Games

| Game | Route | Generator | Hook | Description |
|------|-------|-----------|------|-------------|
| Numeris | `/numeris` | `lib/puzzles/numeris.ts` | `components/games/numeris/useNumeris.ts` | Arrange tiles to match target number |
| Lumis | `/lumis` | `lib/puzzles/lumis.ts` | `components/games/lumis/useLumis.ts` | Place pieces from memory to match lit grid |

## Adding a new game — checklist

1. `lib/puzzles/<game>.ts` — generator function
2. `components/games/<game>/use<Game>.ts` — game hook (accept `initialElapsed`, `paused` options; derive `solved` via `useMemo`)
3. `components/games/<game>/<Game>Board.tsx` — board component (existing score check, score save with `useRef` guard, localStorage timer, solution restore)
4. `components/games/<game>/<game>.module.css` — styles matching existing design language
5. `app/<game>/<Game>Client.tsx` — `'use client'` dynamic import wrapper
6. `app/<game>/page.tsx` — server component with `force-dynamic`, fallback puzzle
7. `app/<game>/layout.tsx` — wraps with `AuthGuard`
8. `app/api/generate-puzzle/route.ts` — add generator to the puzzles array
9. Supabase SQL — update `game` check constraint to include new game name
10. `app/page.tsx` — add streak fetch + home tile Link
11. `app/leaderboard/page.tsx` — add `getScores` call + `ScoreList` section
12. Deploy → seed today's puzzle via curl with `?date=` param

See `README.md` for full details on each step.
