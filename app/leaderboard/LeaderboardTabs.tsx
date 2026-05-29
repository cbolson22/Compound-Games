"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fmtTime } from "@/lib/format";
// To re-enable VerbaBoardModal, restore these imports:
// import { useEffect, useMemo } from "react"; // (merge with the useState import above)
// import { LETTER_VALUES } from "@/lib/scoring";
// import { getWordSet } from "@/lib/wordlist";
// import {
//   computeDetectedWords,
//   computeHighlightedCells,
//   WORD_COLORS,
//   MAX_COL_HEIGHT as VERBA_MAX_COL_HEIGHT,
//   type DetectedWord,
// } from "@/components/games/verba/useVerba";

/* To re-enable board viewing, uncomment VerbaBoardModal:
function VerbaBoardModal({
  grid,
  score,
  username,
  onClose,
}: {
  grid: string[][];
  score: number;
  username: string;
  onClose: () => void;
}) {
  const columns = grid.length;
  const [wordSet, setWordSet] = useState<Set<string> | null>(null);

  useEffect(() => {
    getWordSet().then(setWordSet);
  }, []);

  const detectedWords: DetectedWord[] = useMemo(
    () => (wordSet ? computeDetectedWords(grid, columns, wordSet) : []),
    [grid, columns, wordSet],
  );
  const highlightedCells = useMemo(
    () => computeHighlightedCells(detectedWords),
    [detectedWords],
  );

  // Read-only grid snapshot — renders the saved solution from DB without replaying game logic
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-serif text-xl">{username}</div>
            <div className="text-sm text-[#aaa]">{score} pts</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#aaa] hover:text-[#1a1a1a] text-lg leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 44px)`,
              gap: "4px",
            }}
          >
            {Array.from({ length: columns }, (_, colIdx) => (
              <div
                key={colIdx}
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {Array.from(
                  { length: VERBA_MAX_COL_HEIGHT },
                  (_, visualRow) => {
                    const dataRow = VERBA_MAX_COL_HEIGHT - 1 - visualRow;
                    const letter = grid[colIdx]?.[dataRow];
                    const wordIdx = letter
                      ? highlightedCells.get(`${colIdx},${dataRow}`)
                      : undefined;
                    const color =
                      wordIdx !== undefined
                        ? WORD_COLORS[wordIdx % WORD_COLORS.length]
                        : null;
                    return (
                      <div
                        key={visualRow}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          border: `1.5px solid ${color ? color.border : letter ? "#cbd5e1" : "#f0f0f0"}`,
                          background: color
                            ? color.bg
                            : letter
                              ? "#f8fafc"
                              : "#fafafa",
                          boxShadow: color
                            ? `0 0 10px ${color.glow}`
                            : undefined,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: color ? color.text : "#1a1a1a",
                          position: "relative",
                        }}
                      >
                        {letter ?? ""}
                        {letter && (
                          <span
                            style={{
                              fontSize: "0.5rem",
                              color: color ? color.border : "#94a3b8",
                              position: "absolute",
                              bottom: 2,
                              right: 4,
                            }}
                          >
                            {LETTER_VALUES[letter] ?? 1}
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            ))}
          </div>
        </div>

        {detectedWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {detectedWords.map((w, i) => {
              const color = WORD_COLORS[i % WORD_COLORS.length];
              return (
                <span
                  key={i}
                  className="text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: color.border,
                    background: color.bg,
                    color: color.text,
                  }}
                >
                  {w.word.toLowerCase()}&nbsp;
                  <span style={{ color: color.border }}>+{w.score}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
*/

type TimeScoreRow = {
  user_id: string;
  time_seconds: number;
  profiles: { username: string } | null;
};
type PointScoreRow = {
  user_id: string;
  score: number;
  solution: string[][] | null;
  profiles: { username: string } | null;
};

// Olympic-style: same metric value = same rank; next distinct value jumps to current index
function timeRanks(scores: TimeScoreRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    ranks.push(
      i === 0
        ? 0
        : scores[i].time_seconds === scores[i - 1].time_seconds
          ? ranks[i - 1]
          : i,
    );
  }
  return ranks;
}

function pointRanks(scores: PointScoreRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    ranks.push(
      i === 0 ? 0 : scores[i].score === scores[i - 1].score ? ranks[i - 1] : i,
    );
  }
  return ranks;
}

type LowScoreRow = {
  user_id: string;
  score: number;
  profiles: { username: string } | null;
};

export type LeaderboardData = {
  numerisScores: TimeScoreRow[];
  lumisScores: TimeScoreRow[];
  verbaScores: PointScoreRow[];
  aquarumScores: TimeScoreRow[];
  compondusScores: LowScoreRow[];
  numerisStreaks: Record<string, number>;
  lumisStreaks: Record<string, number>;
  verbaStreaks: Record<string, number>;
  aquarumStreaks: Record<string, number>;
  compondusStreaks: Record<string, number>;
};

type Tab = "numeris" | "lumis" | "verba" | "aquarum" | "compondus";

const MEDAL_BG = ["#fffbeb", "#f8fafc", "#fef3e8"];
const MEDAL_BORDER = ["#d97706", "#94a3b8", "#b45309"];
const MEDALS = ["🥇", "🥈", "🥉"];

function rowStyle(rank: number, isMe: boolean): React.CSSProperties {
  return {
    background: rank < 3 ? MEDAL_BG[rank] : "#fff",
    borderColor: isMe ? "#3b82f6" : rank < 3 ? MEDAL_BORDER[rank] : "#f0f0f0",
    borderWidth: isMe ? "2px" : "1.5px",
    borderStyle: "solid",
  };
}

function ScoreRow({
  rank,
  username,
  streak,
  value,
  isMe,
}: {
  rank: number;
  username: string;
  streak: number;
  value: string;
  isMe: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={rowStyle(rank, isMe)}
    >
      <span className="text-sm w-6 shrink-0 text-center">
        {rank < 3 ? MEDALS[rank] : rank + 1}
      </span>
      <span className="flex-1 text-sm font-medium">{username}</span>
      {streak > 0 && <span className="text-sm text-[#aaa]">{streak}🔥</span>}
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function TimeList({
  scores,
  streaks,
  userId,
}: {
  scores: TimeScoreRow[];
  streaks: Record<string, number>;
  userId?: string;
}) {
  if (!scores.length)
    return <p className="text-sm text-[#aaa]">No solves yet today.</p>;
  const ranks = timeRanks(scores);
  return (
    <div className="w-full flex flex-col gap-2">
      {scores.map((s, i) => (
        <ScoreRow
          key={i}
          rank={ranks[i]}
          username={s.profiles?.username ?? "—"}
          streak={streaks[s.user_id] ?? 0}
          value={fmtTime(s.time_seconds)}
          isMe={s.user_id === userId}
        />
      ))}
    </div>
  );
}

function PointList({
  scores,
  streaks,
  userId,
}: {
  scores: PointScoreRow[];
  streaks: Record<string, number>;
  userId?: string;
}) {
  // To re-enable board viewing: uncomment this state, the onClick wrapper in the map, and the modal below
  // const [viewing, setViewing] = useState<{
  //   grid: string[][];
  //   score: number;
  //   username: string;
  // } | null>(null);

  if (!scores.length)
    return <p className="text-sm text-[#aaa]">No plays yet today.</p>;
  const ranks = pointRanks(scores);
  return (
    <>
      <div className="w-full flex flex-col gap-2">
        {scores.map((s, i) => {
          // To re-enable clicking to view board, replace the return below with:
          // return (
          //   <div
          //     key={i}
          //     onClick={() =>
          //       s.solution &&
          //       setViewing({
          //         grid: s.solution,
          //         score: s.score,
          //         username: s.profiles?.username ?? "—",
          //       })
          //     }
          //     className={s.solution ? "cursor-pointer" : ""}
          //   >
          //     <ScoreRow ... />
          //   </div>
          // );
          return (
            <ScoreRow
              key={i}
              rank={ranks[i]}
              username={s.profiles?.username ?? "—"}
              streak={streaks[s.user_id] ?? 0}
              value={`${s.score} pts`}
              isMe={s.user_id === userId}
            />
          );
        })}
      </div>
      {/* To re-enable board modal, uncomment:
      {viewing && (
        <VerbaBoardModal
          grid={viewing.grid}
          score={viewing.score}
          username={viewing.username}
          onClose={() => setViewing(null)}
        />
      )}
      */}
    </>
  );
}

function wrongRanks(scores: LowScoreRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    ranks.push(
      i === 0 ? 0 : scores[i].score === scores[i - 1].score ? ranks[i - 1] : i,
    );
  }
  return ranks;
}

function LowScoreList({
  scores,
  streaks,
  userId,
}: {
  scores: LowScoreRow[];
  streaks: Record<string, number>;
  userId?: string;
}) {
  if (!scores.length)
    return <p className="text-sm text-[#aaa]">No solves yet today.</p>;
  const ranks = wrongRanks(scores);
  return (
    <div className="w-full flex flex-col gap-2">
      {scores.map((s, i) => (
        <ScoreRow
          key={i}
          rank={ranks[i]}
          username={s.profiles?.username ?? "—"}
          streak={streaks[s.user_id] ?? 0}
          value={`${s.score} wrong`}
          isMe={s.user_id === userId}
        />
      ))}
    </div>
  );
}

const TABS: { id: Tab; label: string; isNew?: boolean }[] = [
  { id: "numeris", label: "Numeris" },
  { id: "lumis", label: "Lumis" },
  { id: "verba", label: "Verba" },
  { id: "aquarum", label: "Aquarum" },
  { id: "compondus", label: "Compondus" },
];

export default function LeaderboardTabs({
  numerisScores,
  lumisScores,
  verbaScores,
  aquarumScores,
  compondusScores,
  numerisStreaks,
  lumisStreaks,
  verbaStreaks,
  aquarumStreaks,
  compondusStreaks,
}: LeaderboardData) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("numeris");

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      <div className="flex w-full bg-[#f5f5f5] p-1 rounded-xl gap-1">
        {TABS.map((t) => (
          <div key={t.id} className="relative flex-1">
            {t.isNew && (
              <span className="new-badge absolute -top-2.5 -left-1 z-10 bg-violet-600 text-white text-[0.5rem] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full pointer-events-none select-none">
                new
              </span>
            )}
            <button
              onClick={() => setTab(t.id)}
              className={`w-full py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === t.id
                  ? "bg-white text-[#1a1a1a] shadow-sm"
                  : "text-[#999] hover:text-[#555]"
              }`}
            >
              {t.label}
            </button>
          </div>
        ))}
      </div>

      {tab === "numeris" && (
        <TimeList
          scores={numerisScores}
          streaks={numerisStreaks}
          userId={user?.id}
        />
      )}
      {tab === "lumis" && (
        <TimeList
          scores={lumisScores}
          streaks={lumisStreaks}
          userId={user?.id}
        />
      )}
      {tab === "verba" && (
        <div className="w-full flex flex-col gap-3">
          {/* To re-enable tap-to-view banner, uncomment:
          <p className="badge-pulse text-xs text-center font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-violet-600 text-white self-center">
            Tap a user&apos;s score to see their board
          </p>
          */}
          <PointList
            scores={verbaScores}
            streaks={verbaStreaks}
            userId={user?.id}
          />
        </div>
      )}
      {tab === "aquarum" && (
        <TimeList
          scores={aquarumScores}
          streaks={aquarumStreaks}
          userId={user?.id}
        />
      )}
      {tab === "compondus" && (
        <LowScoreList
          scores={compondusScores}
          streaks={compondusStreaks}
          userId={user?.id}
        />
      )}
    </div>
  );
}
