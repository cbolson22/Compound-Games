import { supabase } from "./supabase";

export type BadgeDef = {
  id: string;
  name: string;
  icon: string;
  hint: string; // shown when locked
  description: string; // shown when earned
};

export type BadgeStatus = {
  def: BadgeDef;
  earned: boolean;
};

// Ordered easiest → hardest
export const BADGE_DEFS: BadgeDef[] = [
  {
    id: "early_adopter",
    name: "Early Adopter",
    icon: "🌱",
    hint: "You were there from the very start.",
    description: "Played within the first 3 weeks of Compound Games launching.",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    icon: "🌅",
    hint: "Be the first one to show up.",
    description: "First person to submit a score on any day.",
  },
  {
    id: "last_call",
    name: "Last Call",
    icon: "🕛",
    hint: "Some people cut it close.",
    description: "Last person to submit a score on any day.",
  },
  {
    id: "go_for_gold",
    name: "Go for Gold",
    icon: "🥇",
    hint: "Be the best on any given day.",
    description: "Earned a gold medal in any game.",
  },
  {
    id: "word_wizard",
    name: "Word Wizard",
    icon: "✨",
    hint: "Master the letters.",
    description: "Scored 60+ points in a single game of Verba.",
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    icon: "⚡",
    hint: "Blink and it's done.",
    description:
      "Solved Numeris in under 5s, Aquarum in under 25s, or Lumis in under 35s.",
  },
  {
    id: "zero_mistakes",
    name: "Zero Mistakes",
    icon: "🫧",
    hint: "Some people just know.",
    description: "Finished Compondus with zero wrong guesses.",
  },
  {
    id: "completionist",
    name: "Completionist",
    icon: "🎯",
    hint: "Try everything in one sitting.",
    description: "Played all 5 games on the same day.",
  },
  {
    id: "the_grind",
    name: "The Grind",
    icon: "⚙️",
    hint: "Show up, day after day.",
    description: "Completed 50 total puzzles.",
  },
  {
    id: "century",
    name: "Century",
    icon: "💯",
    hint: "The long haul.",
    description: "Completed 100 total puzzles.",
  },
  {
    id: "on_fire",
    name: "On Fire",
    icon: "🔥",
    hint: "Keep the streak alive.",
    description: "Maintained a 14-day streak in any single game.",
  },
  {
    id: "midas_touch",
    name: "Midas Touch",
    icon: "🏆",
    hint: "Everything you touch turns to gold.",
    description: "Earned at least one gold medal on 5 consecutive days.",
  },
  {
    id: "legend",
    name: "Legend",
    icon: "🌟",
    hint: "Some people don't miss.",
    description: "Maintained a 50-day streak in any single game.",
  },
  {
    id: "clean_sweep",
    name: "Clean Sweep",
    icon: "👑",
    hint: "Dominate every game in one day.",
    description: "Earned gold in all 5 games on the same day.",
  },
];

const EARLY_ADOPTER_CUTOFF = "2026-06-05"; // 3 weeks from May 15 launch
const ALL_GAMES = ["numeris", "lumis", "verba", "aquarum", "compondus"];

// Finds the longest consecutive calendar-day run in an arbitrary set of dates.
// Unlike computeStreak in streaks.ts, this does NOT require the run to touch today.
function computeMaxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
        86400000,
    );
    if (diffDays === 1) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

type UserPlay = {
  puzzle_id: string;
  time_seconds: number | null;
  score: number | null;
  completed_at: string;
  daily_puzzles: { game: string; puzzle_date: string };
};

type GoldRow = {
  game: string;
  puzzle_date: string;
};

type AnyPlay = {
  puzzle_id: string;
  user_id: string;
  completed_at: string;
};

export async function computeUserBadges(
  userId: string,
): Promise<BadgeStatus[]> {
  const [playsResult, goldsResult] = await Promise.all([
    supabase
      .from("scores")
      .select(
        "puzzle_id, time_seconds, score, completed_at, daily_puzzles!inner(game, puzzle_date)",
      )
      .eq("user_id", userId),
    supabase
      .from("medals")
      .select("game, puzzle_date")
      .eq("user_id", userId)
      .eq("medal_type", "gold"),
  ]);

  const plays = (playsResult.data ?? []) as unknown as UserPlay[];
  const golds = (goldsResult.data ?? []) as unknown as GoldRow[];

  // Fetch all scores for puzzles the user played (needed for Early Bird / Last Call)
  const puzzleIds = plays.map((p) => p.puzzle_id);
  const allPlaysResult = puzzleIds.length
    ? await supabase
        .from("scores")
        .select("puzzle_id, user_id, completed_at")
        .in("puzzle_id", puzzleIds)
    : { data: [] };

  const allPlays = (allPlaysResult.data ?? []) as unknown as AnyPlay[];

  // Build lookups
  const datesByGame: Record<string, string[]> = {};
  const gamesByDate: Record<string, Set<string>> = {};
  for (const p of plays) {
    const { game, puzzle_date } = p.daily_puzzles;
    (datesByGame[game] ??= []).push(puzzle_date);
    (gamesByDate[puzzle_date] ??= new Set()).add(game);
  }

  const goldsByDate: Record<string, Set<string>> = {};
  const goldDates: string[] = [];
  for (const g of golds) {
    (goldsByDate[g.puzzle_date] ??= new Set()).add(g.game);
    goldDates.push(g.puzzle_date);
  }

  // Earliest and latest completed_at per puzzle across all players
  const earliestByPuzzle: Record<string, string> = {};
  const latestByPuzzle: Record<string, string> = {};
  for (const p of allPlays) {
    if (
      !earliestByPuzzle[p.puzzle_id] ||
      p.completed_at < earliestByPuzzle[p.puzzle_id]
    ) {
      earliestByPuzzle[p.puzzle_id] = p.completed_at;
    }
    if (
      !latestByPuzzle[p.puzzle_id] ||
      p.completed_at > latestByPuzzle[p.puzzle_id]
    ) {
      latestByPuzzle[p.puzzle_id] = p.completed_at;
    }
  }
  const userPlayByPuzzle: Record<string, string> = {};
  for (const p of plays) {
    userPlayByPuzzle[p.puzzle_id] = p.completed_at;
  }

  const checks: Record<string, boolean> = {
    early_adopter: plays.some(
      (p) => p.daily_puzzles.puzzle_date < EARLY_ADOPTER_CUTOFF,
    ),

    early_bird: plays.some(
      (p) => earliestByPuzzle[p.puzzle_id] === userPlayByPuzzle[p.puzzle_id],
    ),

    last_call: plays.some(
      (p) => latestByPuzzle[p.puzzle_id] === userPlayByPuzzle[p.puzzle_id],
    ),

    go_for_gold: golds.length > 0,

    word_wizard: plays.some(
      (p) => p.daily_puzzles.game === "verba" && (p.score ?? 0) >= 60,
    ),

    speed_demon: plays.some((p) => {
      const t = p.time_seconds;
      if (t === null) return false;
      const game = p.daily_puzzles.game;
      return (
        (game === "numeris" && t <= 5) ||
        (game === "lumis" && t <= 35) ||
        (game === "aquarum" && t <= 25)
      );
    }),

    zero_mistakes: plays.some(
      (p) => p.daily_puzzles.game === "compondus" && p.score === 0,
    ),

    completionist: Object.values(gamesByDate).some(
      (games) => games.size === ALL_GAMES.length,
    ),

    the_grind: plays.length >= 50,

    century: plays.length >= 100,

    on_fire: Object.values(datesByGame).some(
      (dates) => computeMaxStreak(dates) >= 14,
    ),

    midas_touch: computeMaxStreak(goldDates) >= 5,

    legend: Object.values(datesByGame).some(
      (dates) => computeMaxStreak(dates) >= 50,
    ),

    clean_sweep: Object.values(goldsByDate).some((games) =>
      ALL_GAMES.every((g) => games.has(g)),
    ),
  };

  return BADGE_DEFS.map((def) => ({ def, earned: checks[def.id] ?? false }));
}
