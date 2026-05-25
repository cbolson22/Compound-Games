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

type TimeScoreRow  = { user_id: string; time_seconds: number; profiles: { username: string } | null };
type PointScoreRow = { user_id: string; score: number;        profiles: { username: string } | null };
type LowScoreRow   = { user_id: string; score: number;        profiles: { username: string } | null };

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
    .select("user_id, time_seconds, profiles(username)")
    .eq("puzzle_id", puzzleId)
    .order("time_seconds", { ascending: true })
    .order("completed_at", { ascending: true });
  return (data ?? []) as unknown as TimeScoreRow[];
}

async function getPointScores(game: string): Promise<PointScoreRow[]> {
  const puzzleId = await getPuzzleId(game);
  if (!puzzleId) return [];
  const { data } = await supabase
    .from("scores")
    .select("user_id, score, profiles(username)")
    .eq("puzzle_id", puzzleId)
    .order("score", { ascending: false })
    .order("completed_at", { ascending: true });
  return (data ?? []) as unknown as PointScoreRow[];
}

async function getLowScores(game: string): Promise<LowScoreRow[]> {
  const puzzleId = await getPuzzleId(game);
  if (!puzzleId) return [];
  const { data } = await supabase
    .from("scores")
    .select("user_id, score, profiles(username)")
    .eq("puzzle_id", puzzleId)
    .order("score", { ascending: true })
    .order("completed_at", { ascending: true });
  return (data ?? []) as unknown as LowScoreRow[];
}

export default async function LeaderboardPage() {
  const [numerisScores, lumisScores, verbaScores, aquarumScores, compondusScores] = await Promise.all([
    getTimeScores('numeris'),
    getTimeScores('lumis'),
    getPointScores('verba'),
    getTimeScores('aquarum'),
    getLowScores('compondus'),
  ]);

  const allUserIds = [...new Set([...numerisScores, ...lumisScores, ...verbaScores, ...aquarumScores, ...compondusScores].map(s => s.user_id))];
  const [numerisStreaks, lumisStreaks, verbaStreaks, aquarumStreaks, compondusStreaks] = await Promise.all([
    getStreaksForUsers(allUserIds, 'numeris'),
    getStreaksForUsers(allUserIds, 'lumis'),
    getStreaksForUsers(allUserIds, 'verba'),
    getStreaksForUsers(allUserIds, 'aquarum'),
    getStreaksForUsers(allUserIds, 'compondus'),
  ]);

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
        numerisScores={numerisScores}
        lumisScores={lumisScores}
        verbaScores={verbaScores}
        aquarumScores={aquarumScores}
        compondusScores={compondusScores}
        numerisStreaks={numerisStreaks}
        lumisStreaks={lumisStreaks}
        verbaStreaks={verbaStreaks}
        aquarumStreaks={aquarumStreaks}
        compondusStreaks={compondusStreaks}
      />
    </main>
  );
}
