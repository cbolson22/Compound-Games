import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTodaysCT } from "@/lib/dates";
import AnalyticsChart, { type DailyData } from "./AnalyticsChart";

export const dynamic = "force-dynamic";

const GAMES = ["numeris", "lumis", "verba", "aquarum", "compondus"] as const;

async function getDailyPlayers(): Promise<DailyData[]> {
  const { data: puzzles } = await supabase
    .from("daily_puzzles")
    .select("id, game, puzzle_date")
    .in("game", [...GAMES])
    .lte("puzzle_date", getTodaysCT())
    .order("puzzle_date");

  if (!puzzles?.length) return [];

  const puzzleMap = new Map(
    puzzles.map((p) => [p.id, { game: p.game as string, date: p.puzzle_date as string }])
  );

  const { data: scores } = await supabase
    .from("scores")
    .select("puzzle_id, user_id")
    .in("puzzle_id", puzzles.map((p) => p.id));

  if (!scores?.length) return [];

  const grouped: Record<string, Record<string, Set<string>>> = {};
  for (const score of scores) {
    const info = puzzleMap.get(score.puzzle_id);
    if (!info) continue;
    if (!grouped[info.date]) grouped[info.date] = {};
    if (!grouped[info.date][info.game]) grouped[info.date][info.game] = new Set();
    grouped[info.date][info.game].add(score.user_id);
  }

  const allDates = [...new Set(puzzles.map((p) => p.puzzle_date as string))].sort();

  return allDates.map((date) => {
    const dayGames = grouped[date] ?? {};
    const uniqueTotal = new Set(Object.values(dayGames).flatMap((s) => [...s])).size;
    return {
      date,
      numeris:   dayGames.numeris?.size   ?? 0,
      lumis:     dayGames.lumis?.size     ?? 0,
      verba:     dayGames.verba?.size     ?? 0,
      aquarum:   dayGames.aquarum?.size   ?? 0,
      compondus: dayGames.compondus?.size ?? 0,
      total: uniqueTotal,
    };
  });
}

export default async function AnalyticsPage() {
  const data = await getDailyPlayers();

  const totals = {
    numeris:   data.reduce((s, d) => s + d.numeris,   0),
    lumis:     data.reduce((s, d) => s + d.lumis,     0),
    verba:     data.reduce((s, d) => s + d.verba,     0),
    aquarum:   data.reduce((s, d) => s + d.aquarum,   0),
    compondus: data.reduce((s, d) => s + d.compondus, 0),
  };

  return (
    <main className="min-h-screen">
      <nav className="px-5 pt-5 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all"
        >
          ← Home
        </Link>
      </nav>
      <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-serif text-4xl mb-1">Analytics</h1>
      <p className="text-sm text-[#aaa] mb-8">Daily unique players per game</p>

      <div className="border border-[#f0f0f0] rounded-2xl p-6">
        <AnalyticsChart data={data} />
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {GAMES.map((game) => (
          <div key={game} className="border border-[#f0f0f0] rounded-xl p-4">
            <p className="font-serif text-lg capitalize">{game}</p>
            <p className="text-2xl font-medium mt-1">{totals[game]}</p>
            <p className="text-xs text-[#aaa] mt-0.5">total plays</p>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
