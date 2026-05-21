import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStreaksForUsers } from "@/lib/streaks";
import { getTodaysCT } from "@/lib/dates";
import LeaderboardTabs from "./LeaderboardTabs";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Leaderboard — Compound Games",
};

type TimeScoreRow  = { user_id: string; time_seconds: number; completed_at: string; profiles: { username: string } | null };
type PointScoreRow = { user_id: string; score: number;        completed_at: string; profiles: { username: string } | null };

async function getPuzzleId(game: string): Promise<string | null> {
  const { data } = await supabase
    .from("daily_puzzles")
    .select("id")
    .eq("game", game)
    .eq("puzzle_date", getTodaysCT())
    .single();
  return data?.id ?? null;
}

async function getTimeScores(game: string): Promise<TimeScoreRow[]> {
  const puzzleId = await getPuzzleId(game);
  if (!puzzleId) return [];
  const { data } = await supabase
    .from("scores")
    .select("user_id, time_seconds, completed_at, profiles(username)")
    .eq("puzzle_id", puzzleId)
    .order("time_seconds", { ascending: true });
  return (data ?? []) as unknown as TimeScoreRow[];
}

async function getPointScores(game: string): Promise<PointScoreRow[]> {
  const puzzleId = await getPuzzleId(game);
  if (!puzzleId) return [];
  const { data } = await supabase
    .from("scores")
    .select("user_id, score, completed_at, profiles(username)")
    .eq("puzzle_id", puzzleId)
    .order("score", { ascending: false });
  return (data ?? []) as unknown as PointScoreRow[];
}

function applyTiebreaks<T extends { user_id: string; completed_at: string }>(
  scores: T[],
  streaks: Record<string, number>,
  primary: (a: T, b: T) => number
): T[] {
  return [...scores].sort((a, b) => {
    const p = primary(a, b)
    if (p !== 0) return p
    const streakDiff = (streaks[b.user_id] ?? 0) - (streaks[a.user_id] ?? 0)
    if (streakDiff !== 0) return streakDiff
    return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  })
}

export default async function LeaderboardPage() {
  const [numerisScores, lumisScores, verbaScores, aquarumScores] = await Promise.all([
    getTimeScores('numeris'),
    getTimeScores('lumis'),
    getPointScores('verba'),
    getTimeScores('aquarum'),
  ]);

  const allUserIds = [...new Set([...numerisScores, ...lumisScores, ...verbaScores, ...aquarumScores].map(s => s.user_id))];
  const [numerisStreaks, lumisStreaks, verbaStreaks, aquarumStreaks] = await Promise.all([
    getStreaksForUsers(allUserIds, 'numeris'),
    getStreaksForUsers(allUserIds, 'lumis'),
    getStreaksForUsers(allUserIds, 'verba'),
    getStreaksForUsers(allUserIds, 'aquarum'),
  ]);

  const byTime = (a: TimeScoreRow, b: TimeScoreRow) => a.time_seconds - b.time_seconds
  const byScore = (a: PointScoreRow, b: PointScoreRow) => (b.score ?? 0) - (a.score ?? 0)

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <nav className="px-5 pt-5 w-full">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all">
          ← Home
        </Link>
      </nav>

      <div className="w-full max-w-sm flex flex-col items-center gap-2 mb-8">
        <h1 className="font-serif text-4xl">Leaderboard</h1>
        <p className="text-xs uppercase tracking-widest text-[#ccc]">Today&apos;s Rankings</p>
      </div>

      <LeaderboardTabs
        numerisScores={applyTiebreaks(numerisScores, numerisStreaks, byTime)}
        lumisScores={applyTiebreaks(lumisScores, lumisStreaks, byTime)}
        verbaScores={applyTiebreaks(verbaScores, verbaStreaks, byScore)}
        aquarumScores={applyTiebreaks(aquarumScores, aquarumStreaks, byTime)}
        numerisStreaks={numerisStreaks}
        lumisStreaks={lumisStreaks}
        verbaStreaks={verbaStreaks}
        aquarumStreaks={aquarumStreaks}
      />
    </main>
  );
}
