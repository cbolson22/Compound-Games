import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTodaysCT, getTomorrowCT } from "@/lib/dates";
import { generateNumeris } from "@/lib/puzzles/numeris";
import { generateLumis } from "@/lib/puzzles/lumis";
import { generateVerba } from "@/lib/puzzles/verba";
import { generateAquarum } from "@/lib/puzzles/aquarum";
import { awardMedalsForDate } from "@/lib/medals";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);

  // One-time backfill: award medals for all past puzzle dates
  if (url.searchParams.get("backfill") === "true") {
    const today = getTodaysCT();
    const { data: rows } = await supabaseAdmin
      .from("daily_puzzles")
      .select("puzzle_date")
      .lt("puzzle_date", today);
    const dates = [...new Set((rows ?? []).map((r) => r.puzzle_date))].sort();
    for (const date of dates) {
      await awardMedalsForDate(date, supabaseAdmin);
    }
    return NextResponse.json({ backfilled: dates.length, dates });
  }

  const dateParam = url.searchParams.get("date");
  if (dateParam && !DATE_RE.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  const puzzleDate = dateParam ?? getTomorrowCT();

  const gameFilter = url.searchParams.get("game");
  const VALID_GAMES = ["numeris", "lumis", "verba", "aquarum"];
  if (gameFilter && !VALID_GAMES.includes(gameFilter)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const all = [
    { game: "numeris", puzzle_data: generateNumeris() },
    { game: "lumis", puzzle_data: generateLumis() },
    { game: "verba", puzzle_data: generateVerba() },
    { game: "aquarum", puzzle_data: generateAquarum() },
  ];
  const puzzles = gameFilter ? all.filter((p) => p.game === gameFilter) : all;

  const { error } = await supabaseAdmin.from("daily_puzzles").upsert(
    puzzles.map((p) => ({
      game: p.game,
      puzzle_date: puzzleDate,
      puzzle_data: p.puzzle_data,
    })),
    { onConflict: "game,puzzle_date" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ date: puzzleDate, puzzles });
}
