# Compound Games

Daily puzzle site for a friend group. Four games, each resetting at midnight Central Time.

**Live:** https://compound-games.vercel.app

## Games

- **Numeris** — arrange digit and operator tiles into slots to form a math equation that equals the target number
- **Lumis** — memorize a lit pattern on a grid, then recreate it by placing pieces from memory
- **Verba** — place letter tiles onto a grid to form words; letters fall to the bottom of each column; score is based on word length and letter rarity
- **Aquarum** — rotate pipe segments to connect each colored inlet to its matching colored outlet

## Stack

- Next.js 16 App Router, TypeScript
- Tailwind CSS v4 (CSS Modules for game-specific styles)
- Supabase (Postgres + Auth)
- dnd-kit (drag and drop)
- Recharts (analytics chart)
- Vercel (hosting + cron)

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
# Generate tomorrow's puzzles + award yesterday's medals (same as nightly cron)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle"

# Generate for a specific date
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle?date=2026-05-15"

# Backfill medals for all past dates
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle?backfill=true"
```

## Nightly cron

Vercel runs `/api/generate-puzzle` at 4am UTC (~11pm CT). It generates tomorrow's puzzles for all four games and awards gold/silver/bronze medals for yesterday. Medal tiebreak order: primary metric (time ASC for most games, score DESC for Verba) → streak DESC → completed_at ASC.

## Analytics

Visit `/analytics` to see daily unique player counts per game. No login required — access by URL only.

## Database schema

```sql
create table profiles (
  id uuid primary key references auth.users,
  username text not null unique
);

create table daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('numeris', 'lumis', 'verba', 'aquarum')),
  puzzle_date date not null,
  puzzle_data jsonb not null,
  unique(game, puzzle_date)
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  puzzle_id uuid references daily_puzzles(id),
  time_seconds integer,
  score integer,
  solution jsonb,
  completed_at timestamptz default now()
);

create table medals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  game text not null,
  puzzle_date date not null,
  medal_type text not null check (medal_type in ('gold', 'silver', 'bronze'))
);

create index on medals(user_id);
create index on medals(game, puzzle_date);
```

---

## Adding a new game

Use an existing game (Numeris or Aquarum recommended) as reference. Follow these steps in order.

### 1. Puzzle generator — `lib/puzzles/<game>.ts`

Export a `generate<Game>()` function returning a JSON-serializable puzzle object. This becomes `puzzle_data` in the database.

### 2. Game hook — `components/games/<game>/use<Game>.ts`

All game state and logic lives here — no UI. Accept `options?: { initialElapsed?: number; paused?: boolean }` so the board can restore timer state on reload. Derive `solved` as a plain `const` (not in `useEffect`) to avoid cascading render warnings.

### 3. Board component — `components/games/<game>/<Game>Board.tsx`

Mark `'use client'`. Responsibilities:
- Accept `puzzle` and `puzzleId` props
- On mount, check Supabase for an existing score; pause the timer while loading
- On solve, save to `scores` table (guard with `useRef` to prevent double-submit), save `solution` as final game state so it can be restored on reload
- Persist in-progress timer to `localStorage` keyed by `puzzleId`; remove on solve
- Restore board state from `solution` on reload
- Show streak after solve via `getUserStreak(userId, '<game>')`

### 4. CSS module — `components/games/<game>/<game>.module.css`

Match the design language: DM Serif for title, DM Mono for timer, Outfit for buttons.

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

Server component. Add `export const dynamic = 'force-dynamic'`. Fetch today's puzzle from `daily_puzzles` using `getTodaysCT()`. Call the generator lazily inside the fetch function (not at module level) as the fallback.

### 7. Layout — `app/<game>/layout.tsx`

```tsx
import AuthGuard from '@/components/auth/AuthGuard'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
```

### 8. Cron + medals — `app/api/generate-puzzle/route.ts` and `lib/medals.ts`

Add the generator to the `puzzles` array in the route. Add the game name to the `GAMES` constant in `lib/medals.ts` so medals are awarded nightly.

### 9. Database — update check constraints

```sql
alter table daily_puzzles drop constraint daily_puzzles_game_check;
alter table daily_puzzles add constraint daily_puzzles_game_check
  check (game in ('numeris', 'lumis', 'verba', 'aquarum', '<newgame>'));
```

### 10. Home page — `app/page.tsx`

- Add a streak `useState` and fetch it in the `useEffect`
- Add an entry to the `games` array (`href`, `name`, `desc`, `key`, `streak`)
- Add an entry to `TUTORIAL_CONTENT` with `title` and `body`
- Add a tutorial video at `public/<game>-tutorial.mov`

### 11. Leaderboard — `app/leaderboard/page.tsx`

Add a score fetch for the new game, include it in the `Promise.all`, fetch streaks, and add a leaderboard section.

### 12. Analytics — `app/analytics/page.tsx` and `AnalyticsChart.tsx`

Add the game to the `GAMES` array in `page.tsx` and to `DailyData`. In `AnalyticsChart.tsx`, add the game to `GAMES`, `GAME_LABELS`, and `GAME_COLORS`.

### 13. Seed today's puzzle

After deploying:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://compound-games.vercel.app/api/generate-puzzle?date=YYYY-MM-DD"
```
