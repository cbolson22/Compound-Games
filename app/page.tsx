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
    .in("game", ["numeris", "lumis", "verba", "aquarum", "compondus", "loopa"]);
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
  loopa: {
    title: "How to play Loopa",
    body: "Draw a single closed loop through the dots of the grid. Click the lines between dots to toggle them on or off. Numbers inside squares show exactly how many of that square's four sides must be part of the loop. Complete the loop when all clues are satisfied.",
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

const CONFETTI_COLORS = [
  "#ff6b6b",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#ff922b",
  "#cc5de8",
  "#f06595",
  "#74c0fc",
];

function BirthdayModal({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"gift" | "open">("gift");

  const [confettiPieces] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: 6 + Math.random() * 8,
      height: 8 + Math.random() * 7,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      isCircle: Math.random() > 0.5,
    })),
  );

  return (
    <>
      {phase === "open" && (
        <div className="fixed inset-0 pointer-events-none z-60 overflow-hidden">
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: "-40px",
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                borderRadius: p.isCircle ? "50%" : "2px",
                animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5 relative">
          {phase === "gift" ? (
            <>
              <div className="birthday-gift text-7xl select-none leading-none">
                🎁
              </div>
              <p className="text-sm text-[#555] text-center">
                You have a surprise waiting…
              </p>
              <button
                className="w-full py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
                onClick={() => setPhase("open")}
              >
                Open
              </button>
            </>
          ) : (
            <>
              <button
                className="absolute top-4 right-4 text-[#bbb] hover:text-[#1a1a1a] text-base leading-none transition-colors"
                onClick={onClose}
              >
                ✕
              </button>
              <div className="text-5xl leading-none">🎂</div>
              <h2 className="font-serif text-3xl text-center text-[#1a1a1a]">
                Happy Birthday!
              </h2>
              <p className="text-sm text-[#555] text-center leading-relaxed">
                Hope your day is as great as your scores, {username}! 🎉
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();
  const [numerisStreak, setNumerisStreak] = useState(0);
  const [lumisStreak, setLumisStreak] = useState(0);
  const [verbaStreak, setVerbaStreak] = useState(0);
  const [aquarumStreak, setAquarumStreak] = useState(0);
  const [compondusStreak, setCompondusStreak] = useState(0);
  const [loopaStreak, setLoopaStreak] = useState(0);
  const [playedGames, setPlayedGames] = useState<Set<string> | null>(null);
  const [medals, setMedals] = useState<AllMedalCounts | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  const [birthdayForceOpen, setBirthdayForceOpen] = useState(false);
  const [birthdayShownToday] = useState(
    () =>
      typeof window !== "undefined" &&
      !!localStorage.getItem(`bday_shown_${getTodaysCT()}`),
  );

  const isBirthday =
    !loading &&
    !!profile?.birthday &&
    profile.birthday === getTodaysCT().slice(5);
  const showBirthday =
    (isBirthday && !birthdayShownToday && !birthdayDismissed) ||
    birthdayForceOpen;

  function handleBirthdayClose() {
    localStorage.setItem(`bday_shown_${getTodaysCT()}`, "1");
    setBirthdayDismissed(true);
    setBirthdayForceOpen(false);
  }

  useEffect(() => {
    if (!user) return;
    getUserStreak(user.id, "numeris").then(setNumerisStreak);
    getUserStreak(user.id, "lumis").then(setLumisStreak);
    getUserStreak(user.id, "verba").then(setVerbaStreak);
    getUserStreak(user.id, "aquarum").then(setAquarumStreak);
    getUserStreak(user.id, "compondus").then(setCompondusStreak);
    getUserStreak(user.id, "loopa").then(setLoopaStreak);
    fetchPlayedGames(user.id).then(setPlayedGames);
    getMedalCounts(user.id).then(setMedals);
  }, [user]);

  const games = [
    {
      href: "/numeris",
      name: "Numeris",
      streak: numerisStreak,
      key: "numeris",
      isNew: false,
    },
    {
      href: "/lumis",
      name: "Lumis",
      streak: lumisStreak,
      key: "lumis",
      isNew: false,
    },
    {
      href: "/verba",
      name: "Verba",
      streak: verbaStreak,
      key: "verba",
      isNew: false,
    },
    {
      href: "/aquarum",
      name: "Aquarum",
      streak: aquarumStreak,
      key: "aquarum",
      isNew: false,
    },
    {
      href: "/compondus",
      name: "Compondus",
      streak: compondusStreak,
      key: "compondus",
      isNew: false,
    },
    {
      href: "/loopa",
      name: "Loopa",
      streak: loopaStreak,
      key: "loopa",
      isNew: false,
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center p-8 pt-12">
      <h1 className="font-serif text-5xl mb-2 text-center">Compound Games</h1>
      <p className="text-xl text-[#555] mb-1 text-center">
        {isBirthday && "🎂 "}
        {new Date().toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        {isBirthday && " 🎂"}
      </p>
      <Link
        href="/analytics"
        className="text-[0.65rem] text-[#ddd] hover:text-[#aaa] transition-colors mb-6"
      >
        site analytics
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {games.map((g) => (
          <div key={g.key} className="relative h-full">
            {g.isNew && (
              <span className="new-badge absolute -top-2.5 -left-2 z-10 bg-violet-600 text-white text-[0.55rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full pointer-events-none select-none">
                new game
              </span>
            )}
            <Link
              href={g.href}
              className="flex items-start justify-between gap-2 px-6 pt-4 pb-4 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors h-full"
            >
              <div className="flex flex-col gap-1">
                <span className="font-serif text-2xl">{g.name}</span>
                <button
                  className="text-xs font-medium rounded-full px-2.5 py-0.5 transition-all w-fit"
                  style={{ border: "1px solid #ddd", color: "#555" }}
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
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors h-full"
        >
          <span className="font-serif text-2xl">Leaderboard</span>
          <span className="text-sm text-[#aaa]">Today&apos;s Rankings</span>
        </Link>

        <Link
          href="/profile"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors h-full"
        >
          <span className="font-serif text-2xl">My Badges</span>
          <span className="text-sm text-[#aaa]">
            Achievements &amp; profile
          </span>
        </Link>

        <Link
          href="/feedback"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors h-full"
        >
          <span className="font-serif text-2xl">Feedback</span>
          <span className="text-sm text-[#aaa]">Ideas, bugs, requests</span>
        </Link>

        {isBirthday && (
          <button
            onClick={() => setBirthdayForceOpen(true)}
            className="flex flex-col gap-1 p-6 border-2 border-[#f9a8d4] rounded-2xl hover:border-[#f472b6] transition-colors h-full text-left"
          >
            <span className="font-serif text-2xl">🎂 Happy Birthday!</span>
            <span className="text-sm text-[#aaa]">Open your surprise again</span>
          </button>
        )}
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

      {showBirthday && (
        <BirthdayModal
          username={profile?.username ?? "friend"}
          onClose={handleBirthdayClose}
        />
      )}
    </main>
  );
}
