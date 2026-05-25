"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserStreak } from "@/lib/streaks";
import { getMedalCounts, type AllMedalCounts } from "@/lib/medals";
import { supabase } from "@/lib/supabase";
import { getTodaysCT } from "@/lib/dates";

async function fetchPlayedGames(userId: string): Promise<Set<string>> {
  const { data: puzzles } = await supabase
    .from("daily_puzzles")
    .select("id, game")
    .eq("puzzle_date", getTodaysCT())
    .in("game", ["numeris", "lumis", "verba", "aquarum", "compondus"]);
  if (!puzzles?.length) return new Set();

  const { data: scores } = await supabase
    .from("scores")
    .select("puzzle_id")
    .eq("user_id", userId)
    .in(
      "puzzle_id",
      puzzles.map((p) => p.id),
    );
  if (!scores?.length) return new Set();

  const scored = new Set(scores.map((s) => s.puzzle_id));
  return new Set(puzzles.filter((p) => scored.has(p.id)).map((p) => p.game));
}

function StatusBadge({ played }: { played: boolean }) {
  if (played) {
    return (
      <span className="text-xs font-medium text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">
        ✓ Done
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">
      Play today
    </span>
  );
}

function MedalRow({
  counts,
}: {
  counts: { gold: number; silver: number; bronze: number };
}) {
  return (
    <span className="text-sm text-[#aaa]">
      {counts.gold}🥇 {counts.silver}🥈 {counts.bronze}🥉
    </span>
  );
}

const TUTORIAL_CONTENT: Record<string, { title: string; body: string }> = {
  numeris: {
    title: "How to play Numeris",
    body: "Arrange the number and operator tiles into the slots to form a math equation that equals the target number. Drag tiles from the tray into the slots, or tap a tile to place it in the next empty slot. Tap a filled slot to send it back to the tray. You must use all tiles.",
  },
  lumis: {
    title: "How to play Lumis",
    body: "A pattern of lit cells appears on the grid, then goes dark once you pick up your first piece. Recreate the pattern from memory by dragging each piece into the correct place, or clicking a piece then clicking the correct cell to place it. You can reset the board at any time to see the pattern again.",
  },
  verba: {
    title: "How to play Verba",
    body: "Place letter tiles onto the grid to form words across rows and columns. Letters always fall to the bottom of the column when placed. Words are detected automatically — longer words and rarer letters score more points. Arrange your tiles to maximize your score before time runs out. Be careful: any extra letters connected to a valid word will void that word.",
  },
  aquarum: {
    title: "How to play Aquarum",
    body: "Rotate the pipe segments to connect each colored inlet to its matching colored outlet. Tap any pipe to rotate it. All paths must be completed to solve the puzzle.",
  },
  compondus: {
    title: "How to play Compondus",
    body: "You are shown two words — the top and bottom of a chain. Fill in the missing words in between so that each consecutive pair forms a compound word or phrase (e.g. FIRE → TRUCK → LOAD). The first letter of each hidden word is revealed as a hint. Wrong guesses reveal the next letter. Your score is your total number of wrong guesses — lower is better.",
  },
};

function TutorialModal({
  game,
  onClose,
}: {
  game: string;
  onClose: () => void;
}) {
  const content = TUTORIAL_CONTENT[game];
  if (!content) return null;
  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-7 w-full max-w-lg flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl text-[#1a1a1a]">{content.title}</h2>
        <p className="text-sm text-[#555] leading-relaxed">{content.body}</p>
        <video
          src={`/${game}-tutorial.mov`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl"
        />
        <button
          className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
          onClick={onClose}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();
  const [numerisStreak, setNumerisStreak] = useState(0);
  const [lumisStreak, setLumisStreak] = useState(0);
  const [verbaStreak, setVerbaStreak] = useState(0);
  const [aquarumStreak, setAquarumStreak] = useState(0);
  const [compondusStreak, setCompondusStreak] = useState(0);
  const [playedGames, setPlayedGames] = useState<Set<string> | null>(null);
  const [medals, setMedals] = useState<AllMedalCounts | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserStreak(user.id, "numeris").then(setNumerisStreak);
    getUserStreak(user.id, "lumis").then(setLumisStreak);
    getUserStreak(user.id, "verba").then(setVerbaStreak);
    getUserStreak(user.id, "aquarum").then(setAquarumStreak);
    getUserStreak(user.id, "compondus").then(setCompondusStreak);
    fetchPlayedGames(user.id).then(setPlayedGames);
    getMedalCounts(user.id).then(setMedals);
  }, [user]);

  const games = [
    { href: "/numeris",   name: "Numeris",   streak: numerisStreak,   key: "numeris",   isNew: false },
    { href: "/lumis",     name: "Lumis",     streak: lumisStreak,     key: "lumis",     isNew: false },
    { href: "/verba",     name: "Verba",     streak: verbaStreak,     key: "verba",     isNew: false },
    { href: "/aquarum",   name: "Aquarum",   streak: aquarumStreak,   key: "aquarum",   isNew: false },
    { href: "/compondus", name: "Compondus", streak: compondusStreak, key: "compondus", isNew: true  },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-serif text-5xl mb-2">Compound Games</h1>
      <p className="text-xs uppercase tracking-widest text-[#ccc] mb-6">
        Daily Puzzles
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {games.map((g) => (
          <div key={g.key} className="relative">
            {g.isNew && (
              <span className="new-badge absolute -top-2.5 -left-2 z-10 bg-violet-600 text-white text-[0.55rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full pointer-events-none select-none">
                new game
              </span>
            )}
            <Link
              href={g.href}
              className="flex items-start justify-between gap-2 px-6 pt-4 pb-4 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="font-serif text-2xl">{g.name}</span>
                <button
                  className="text-xs font-medium text-[#555] border border-[#ddd] rounded-full px-2.5 py-0.5 hover:border-[#aaa] hover:text-[#1a1a1a] transition-all w-fit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTutorial(g.key);
                  }}
                >
                  Tutorial
                </button>
              </div>
              {playedGames !== null && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge played={playedGames.has(g.key)} />
                  {g.streak > 0 && (
                    <span className="text-sm text-[#aaa]">{g.streak}🔥</span>
                  )}
                  {medals !== null && (
                    <MedalRow
                      counts={
                        medals[g.key as keyof AllMedalCounts] ?? {
                          gold: 0,
                          silver: 0,
                          bronze: 0,
                        }
                      }
                    />
                  )}
                </div>
              )}
            </Link>
          </div>
        ))}

        <Link
          href="/leaderboard"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
        >
          <span className="font-serif text-2xl">Leaderboard</span>
          <span className="text-sm text-[#aaa]">Today&apos;s Rankings</span>
        </Link>
      </div>

      <div className="mt-6 text-sm text-[#aaa]">
        {!loading &&
          (user ? (
            <div className="flex items-center gap-4">
              <span>{profile?.username ?? user.email}</span>
              <button
                onClick={signOut}
                className="hover:text-[#1a1a1a] transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="hover:text-[#1a1a1a] transition-colors"
            >
              Sign in
            </Link>
          ))}
      </div>

      {activeTutorial && (
        <TutorialModal
          game={activeTutorial}
          onClose={() => setActiveTutorial(null)}
        />
      )}
    </main>
  );
}
