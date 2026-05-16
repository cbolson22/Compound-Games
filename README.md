# Compound Games

Daily puzzle site for a friend group. Each game resets at midnight Central Time.

**Live:** https://compound-games.vercel.app

## Games

- **Numeris** — arrange digit/operator tiles to match a target number
- **Lumis** — memorize a lit pattern on a 7×7 grid, then place tetris-like pieces from memory

## Stack

- Next.js App Router, TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth)
- dnd-kit (drag and drop)
- Vercel (hosting + cron jobs)

## Local development

```bash
npm run dev
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CRON_SECRET=any-local-secret
```

## Manually trigger puzzle generation

```bash
# Generate tomorrow's puzzles (same as nightly cron)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle"

# Generate for a specific date
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle?date=2026-05-15"
```

## Database schema

```sql
create table profiles (
  id uuid primary key references auth.users,
  username text not null unique
);

create table daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('numeris', 'lumis')),
  puzzle_date date not null,
  puzzle_data jsonb not null,
  unique(game, puzzle_date)
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  puzzle_id uuid references daily_puzzles(id),
  time_seconds integer not null,
  solution jsonb,
  created_at timestamptz default now()
);
```

---

## Adding a new game

Use Numeris or Lumis as reference. Follow these steps in order.

### 1. Puzzle generator — `lib/puzzles/<game>.ts`

Export a `generate<Game>()` function returning a JSON-serializable puzzle object. This becomes `puzzle_data` in the database.

### 2. Game hook — `components/games/<game>/use<Game>.ts`

All game state and logic lives here — no UI. Accept `options?: { initialElapsed?: number; paused?: boolean }` so the board can restore timer state on reload. Derive `solved` via `useMemo` rather than setting it in a `useEffect` to avoid cascading render warnings.

### 3. Board component — `components/games/<game>/<Game>Board.tsx`

Mark `'use client'`. Responsibilities:
- Accept `puzzle` and `puzzleId` props
- On mount, check Supabase for an existing score; pause the timer while loading (`paused: loadingScore || existingScore !== null`)
- On solve, save to `scores` table (guard with `useRef` to prevent double-submit), save `solution` as the final game state so it can be restored on reload
- Persist in-progress timer to `localStorage` keyed by `puzzleId` (or today's CT date as fallback); remove on solve
- Restore board state from `solution` on reload via a `restore*` function exposed by the hook
- Show streak after solve via `getUserStreak(userId, '<game>')`

### 4. CSS module — `components/games/<game>/<game>.module.css`

Match the design language: DM Serif for title, DM Mono for timer, Outfit for buttons. Same border radius, color, and spacing conventions as Numeris/Lumis.

### 5. Client wrapper — `app/<game>/<Game>Client.tsx`

```tsx
'use client'
import dynamic from 'next/dynamic'
const Board = dynamic(() => import('@/components/games/<game>/<Game>Board'), { ssr: false })
export default function <Game>Client({ puzzle, puzzleId }: { puzzle: ...; puzzleId: string | null }) {
  return <Board puzzle={puzzle} puzzleId={puzzleId} />
}
```

The `dynamic` import must live in a `'use client'` file.

### 6. Page — `app/<game>/page.tsx`

Server component. Add `export const dynamic = 'force-dynamic'` (prevents static caching so scores always reflect live data). Fetch today's puzzle from `daily_puzzles` using `getTodaysCT()`. Include a hardcoded fallback puzzle for when no DB row exists yet.

### 7. Layout — `app/<game>/layout.tsx`

```tsx
import AuthGuard from '@/components/auth/AuthGuard'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
```

### 8. Cron job — `app/api/generate-puzzle/route.ts`

Import the generator and add it to the `puzzles` array so it generates nightly alongside the other games.

### 9. Database — update the check constraint

```sql
alter table daily_puzzles drop constraint daily_puzzles_game_check;
alter table daily_puzzles add constraint daily_puzzles_game_check
  check (game in ('numeris', 'lumis', '<newgame>'));
```

### 10. Home page — `app/page.tsx`

- Fetch streak: `getUserStreak(user.id, '<game>').then(set<Game>Streak)`
- Add a `<Link>` tile in the same style as Numeris and Lumis, showing the streak

### 11. Leaderboard — `app/leaderboard/page.tsx`

Add `getScores('<game>')` to the `Promise.all` call, fetch streaks for the new game, and add a `<ScoreList>` section.

### 12. Seed today's puzzle

After deploying, manually generate today's puzzle:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle?date=YYYY-MM-DD"
```
