"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fmtTime } from "@/lib/format";

type TimeScoreRow = {
  user_id: string;
  time_seconds: number;
  profiles: { username: string } | null;
};
type PointScoreRow = {
  user_id: string;
  score: number;
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
  if (!scores.length)
    return <p className="text-sm text-[#aaa]">No plays yet today.</p>;
  const ranks = pointRanks(scores);
  return (
    <div className="w-full flex flex-col gap-2">
      {scores.map((s, i) => (
        <ScoreRow
          key={i}
          rank={ranks[i]}
          username={s.profiles?.username ?? "—"}
          streak={streaks[s.user_id] ?? 0}
          value={`${s.score} pts`}
          isMe={s.user_id === userId}
        />
      ))}
    </div>
  );
}

function wrongRanks(scores: LowScoreRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    ranks.push(i === 0 ? 0 : scores[i].score === scores[i - 1].score ? ranks[i - 1] : i);
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

const TABS: { id: Tab; label: string }[] = [
  { id: "numeris",   label: "Numeris"   },
  { id: "lumis",     label: "Lumis"     },
  { id: "verba",     label: "Verba"     },
  { id: "aquarum",   label: "Aquarum"   },
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
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === t.id
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-[#999] hover:text-[#555]"
            }`}
          >
            {t.label}
          </button>
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
        <PointList
          scores={verbaScores}
          streaks={verbaStreaks}
          userId={user?.id}
        />
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
