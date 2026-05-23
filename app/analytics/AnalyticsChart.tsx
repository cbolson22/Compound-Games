"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type DailyData = {
  date: string;
  numeris: number;
  lumis: number;
  verba: number;
  aquarum: number;
  total: number;
};

type Game = "numeris" | "lumis" | "verba" | "aquarum" | "total";

const GAMES: Game[] = ["total", "numeris", "lumis", "verba", "aquarum"];

const GAME_LABELS: Record<Game, string> = {
  total: "All Users",
  numeris: "Numeris",
  lumis: "Lumis",
  verba: "Verba",
  aquarum: "Aquarum",
};

const GAME_COLORS: Record<Game, string> = {
  total: "#1a1a1a",
  numeris: "#2563eb",
  lumis: "#16a34a",
  verba: "#9333ea",
  aquarum: "#ea580c",
};

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`;
}

export default function AnalyticsChart({ data }: { data: DailyData[] }) {
  const [activeGame, setActiveGame] = useState<Game>("total");
  const formatted = data.map((d) => ({ ...d, date: formatDate(d.date) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 flex-wrap">
        {GAMES.map((game) => (
          <button
            key={game}
            onClick={() => setActiveGame(game)}
            style={
              activeGame === game
                ? { borderColor: GAME_COLORS[game], color: GAME_COLORS[game] }
                : {}
            }
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeGame === game
                ? "bg-white"
                : "border-[#e8e8e8] text-[#aaa] hover:border-[#ccc] hover:text-[#555]"
            }`}
          >
            {GAME_LABELS[game]}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={formatted}
          margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#999" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e8e8e8",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey={activeGame}
            name={GAME_LABELS[activeGame]}
            stroke={GAME_COLORS[activeGame]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
