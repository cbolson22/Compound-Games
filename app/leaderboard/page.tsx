import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStreaksForUsers } from "@/lib/streaks";
import { fmtTime } from "@/lib/format";
import { getTodaysCT } from "@/lib/dates";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Leaderboard — Compound Games",
};

type ScoreRow = { user_id: string; time_seconds: number; profiles: { username: string } | null };

async function getScores(game: string): Promise<ScoreRow[]> {
  const today = getTodaysCT();

  const { data: puzzle } = await supabase
    .from("daily_puzzles")
    .select("id")
    .eq("game", game)
    .eq("puzzle_date", today)
    .single();

  if (!puzzle) return [];

  const { data } = await supabase
    .from("scores")
    .select("user_id, time_seconds, profiles(username)")
    .eq("puzzle_id", puzzle.id)
    .order("time_seconds", { ascending: true });

  return (data ?? []) as unknown as ScoreRow[];
}

function ScoreList({ scores, streaks }: { scores: ScoreRow[]; streaks: Record<string, number> }) {
  if (scores.length === 0) return <p className="text-sm text-[#aaa]">No solves yet today.</p>;
  return (
    <div className="w-full max-w-sm flex flex-col gap-2">
      {scores.map((score, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border border-[#f0f0f0] rounded-xl">
          <span className="text-sm text-[#aaa] w-5 shrink-0">{i + 1}</span>
          <span className="flex-1 text-sm">{score.profiles?.username ?? "—"}</span>
          {(streaks[score.user_id] ?? 0) > 0 && (
            <span className="text-sm text-[#aaa]">{streaks[score.user_id]}🔥</span>
          )}
          <span className="font-mono text-sm">{fmtTime(score.time_seconds)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function LeaderboardPage() {
  const [numerisScores, lumisScores] = await Promise.all([
    getScores('numeris'),
    getScores('lumis'),
  ]);

  const allUserIds = [...new Set([...numerisScores, ...lumisScores].map(s => s.user_id))];
  const [numerisStreaks, lumisStreaks] = await Promise.all([
    getStreaksForUsers(allUserIds, 'numeris'),
    getStreaksForUsers(allUserIds, 'lumis'),
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <nav className="w-full max-w-sm mb-8">
        <Link href="/" className="text-sm text-[#bbb] hover:text-[#1a1a1a] transition-colors">
          ← Home
        </Link>
      </nav>

      <div className="w-full max-w-sm flex flex-col gap-10">
        <section className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="font-serif text-3xl mb-1">Numeris</h2>
            <p className="text-xs uppercase tracking-widest text-[#ccc]">Today&apos;s Leaderboard</p>
          </div>
          <ScoreList scores={numerisScores} streaks={numerisStreaks} />
        </section>

        <section className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="font-serif text-3xl mb-1">Lumis</h2>
            <p className="text-xs uppercase tracking-widest text-[#ccc]">Today&apos;s Leaderboard</p>
          </div>
          <ScoreList scores={lumisScores} streaks={lumisStreaks} />
        </section>
      </div>
    </main>
  );
}
