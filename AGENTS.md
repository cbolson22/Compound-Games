<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Compound Games — project context for AI agents

Daily puzzle site for a friend group at https://compound-games.vercel.app. Each game resets at midnight Central Time (America/Chicago). Four games: Numeris, Lumis, Verba, Aquarum.

## Stack

- Next.js 16 App Router, TypeScript
- Tailwind CSS v4 (CSS Modules for game-specific styles)
- Supabase (Postgres + Auth)
- dnd-kit (drag and drop in Numeris, Lumis, Verba)
- Recharts (analytics page)
- Vercel (hosting + nightly cron at 4am UTC / ~11pm CT)

## Key conventions

- All date logic uses `getTodaysCT()` / `getTomorrowCT()` / `getYesterdayCT()` / `dayBefore(dateStr)` from `lib/dates.ts` — never use `new Date()` directly for puzzle dates
- Supabase client is at `lib/supabase.ts`. Always `await` or `.then()` Supabase calls — the lazy promise pattern means silent failures if you don't
- Scores are saved with a `useRef` guard (`scoreSubmitted`) to prevent double-submission
- Board components are loaded via `dynamic(..., { ssr: false })` inside a `'use client'` wrapper file — the dynamic call itself must be in a `'use client'` file
- All game, leaderboard, and analytics pages need `export const dynamic = 'force-dynamic'` to prevent Next.js static caching
- `solved` state must be derived as a plain `const` or `useMemo`, never set inside a `useEffect` (causes cascading render lint errors)
- In-progress timer is persisted in `localStorage` keyed by `puzzleId`; cleared on solve
- Auth is handled by `AuthProvider` (context) and `AuthGuard` (redirect wrapper); new users hit `/auth/username` to pick a username before being admitted
- Streaks are computed from DB scores via `getUserStreak(userId, game)` in `lib/streaks.ts` — not stored separately
- Medals (gold/silver/bronze) are awarded nightly via `awardMedalsForDate(date)` in `lib/medals.ts`; tiebreak order is primary metric → streak DESC → completed_at ASC
- Math expression evaluation uses `safeEvalExpr()` from `lib/math.ts` — never use `Function()` or `eval()`
- CSS uses CSS Modules for game boards. Design language: DM Serif for titles, DM Mono for timer/mono values, Outfit for buttons

## Project structure

```
app/
  page.tsx                  # Home — game cards, streaks, medals, tutorial modals
  layout.tsx                # Root layout — AuthProvider, fonts, Vercel Analytics
  auth/
    page.tsx                # Sign in / sign up / forgot password
    username/page.tsx       # Username picker for new users
    reset/page.tsx          # Password reset
  [game]/
    layout.tsx              # AuthGuard wrapper
    page.tsx                # Server component — fetches today's puzzle from DB
    [Game]Client.tsx        # 'use client' dynamic import wrapper (ssr: false)
  leaderboard/
    page.tsx                # Today's rankings for all games with tiebreak sort
    LeaderboardTabs.tsx     # Client tab switcher
  analytics/
    page.tsx                # Daily unique player counts per game (no auth required)
    AnalyticsChart.tsx      # Recharts line chart with per-game toggle
  api/
    generate-puzzle/
      route.ts              # Cron endpoint — generates tomorrow's puzzles, awards yesterday's medals

components/
  auth/
    AuthProvider.tsx        # React context for user/profile/loading state
    AuthGuard.tsx           # Redirects to /auth if not signed in
  games/[game]/
    use[Game].ts            # Game logic hook — all state, no UI
    [Game]Board.tsx         # Interactive board — 'use client'
    [game].module.css       # Scoped styles

lib/
  supabase.ts               # Supabase client (anon key, safe for client bundles)
  dates.ts                  # getTodaysCT, getTomorrowCT, getYesterdayCT, dayBefore
  math.ts                   # safeEvalExpr — recursive descent evaluator (Numeris)
  medals.ts                 # awardMedalsForDate, getMedalCounts
  streaks.ts                # getUserStreak, getStreaksForUsers
  scoring.ts                # Shared scoring utilities
  format.ts                 # formatTime and other display helpers
  wordlist.ts               # Word dictionary for Verba
  puzzles/
    numeris.ts              # generateNumeris()
    lumis.ts                # generateLumis()
    verba.ts                # generateVerba()
    aquarum.ts              # generateAquarum()
```

## Games

| Game | Route | Generator | Hook | Primary metric |
|------|-------|-----------|------|----------------|
| Numeris | `/numeris` | `lib/puzzles/numeris.ts` | `components/games/numeris/useNumeris.ts` | `time_seconds` ASC |
| Lumis | `/lumis` | `lib/puzzles/lumis.ts` | `components/games/lumis/useLumis.ts` | `time_seconds` ASC |
| Verba | `/verba` | `lib/puzzles/verba.ts` | `components/games/verba/useVerba.ts` | `score` DESC |
| Aquarum | `/aquarum` | `lib/puzzles/aquarum.ts` | `components/games/aquarum/useAquarum.ts` | `time_seconds` ASC |

## Nightly cron flow

Vercel triggers `GET /api/generate-puzzle` at 4am UTC (~11pm CT):
1. Generates tomorrow's puzzle for all four games, inserts into `daily_puzzles`
2. Calls `awardMedalsForDate(getYesterdayCT())` to award gold/silver/bronze for the completed day

The endpoint is protected by `Authorization: Bearer <CRON_SECRET>`.

## Adding a new game — checklist

1. `lib/puzzles/<game>.ts` — export `generate<Game>()` returning a JSON-serializable puzzle object
2. `components/games/<game>/use<Game>.ts` — game hook (accept `initialElapsed`, `paused` options; derive `solved` as a plain const, not in useEffect)
3. `components/games/<game>/<Game>Board.tsx` — board component (existing score check, score save with `useRef` guard, localStorage timer, solution restore)
4. `components/games/<game>/<game>.module.css` — styles matching existing design language
5. `app/<game>/<Game>Client.tsx` — `'use client'` dynamic import wrapper with `ssr: false`
6. `app/<game>/page.tsx` — server component with `force-dynamic`, lazy fallback puzzle (`generate<Game>()` inside the fetch function, not at module level)
7. `app/<game>/layout.tsx` — wraps with `AuthGuard`
8. `app/api/generate-puzzle/route.ts` — add generator to the puzzles array; add game to `awardMedalsForDate` GAMES constant in `lib/medals.ts`
9. Supabase SQL — update `game` check constraint on `daily_puzzles` and `medals` tables to include new game name
10. `app/page.tsx` — add streak fetch, add to `games` array (with `href`, `name`, `desc`, `key`), add tutorial content to `TUTORIAL_CONTENT`
11. `app/leaderboard/page.tsx` — add score fetch and leaderboard section
12. `app/analytics/page.tsx` — add game to `GAMES` array and `DailyData` type; update `AnalyticsChart.tsx` `GAMES`, `GAME_LABELS`, `GAME_COLORS`
13. Deploy → seed today's puzzle via curl with `?date=` param
