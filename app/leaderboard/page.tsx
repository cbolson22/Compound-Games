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

async function getTodaysScores(): Promise<ScoreRow[]> {
  const today = getTodaysCT();

  const { data: puzzle } = await supabase
    .from("daily_puzzles")
    .select("id")
    .eq("game", "numeris")
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

export default async function LeaderboardPage() {
  const scores = await getTodaysScores();
  const streaks = await getStreaksForUsers(scores.map(s => s.user_id), 'numeris');

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <nav className="w-full max-w-sm mb-8">
        <Link
          href="/"
          className="text-sm text-[#bbb] hover:text-[#1a1a1a] transition-colors"
        >
          ← Home
        </Link>
      </nav>

      <h1 className="font-serif text-3xl mb-1">Numeris</h1>
      <p className="text-xs uppercase tracking-widest text-[#ccc] mb-8">
        Today&apos;s Leaderboard
      </p>

      {scores.length === 0 ? (
        <p className="text-sm text-[#aaa]">No solves yet today.</p>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {scores.map((score, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border border-[#f0f0f0] rounded-xl"
            >
              <span className="text-sm text-[#aaa] w-5 shrink-0">{i + 1}</span>
              <span className="flex-1 text-sm">
                {score.profiles?.username ?? "—"}
              </span>
              {(streaks[score.user_id] ?? 0) > 0 && (
                <span className="text-sm text-[#aaa]">{streaks[score.user_id]}🔥</span>
              )}
              <span className="font-mono text-sm">
                {fmtTime(score.time_seconds)}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
