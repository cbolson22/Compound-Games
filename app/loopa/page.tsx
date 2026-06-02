"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

const N = 5;
const CELL_SIZE = 60;
const EDGE_SIZE = 36; // larger = easier to click

type EdgeKey = string;
const hKey = (r: number, c: number): EdgeKey => `h${r},${c}`;
const vKey = (r: number, c: number): EdgeKey => `v${r},${c}`;

// Color per clue value
const CLUE_COLORS: Record<number, string> = {
  0: "#d1d5db",
  1: "#60a5fa",
  2: "#34d399",
  3: "#f97316",
};

const EDGE_ACTIVE = "#6366f1";
const EDGE_HOVER = "#a5b4fc";
const EDGE_OFF = "#e2e8f0";
const DOT_DEFAULT = "#94a3b8";
const DOT_ACTIVE = "#6366f1";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dotNeighbors(r: number, c: number): [number, number][] {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < N) res.push([r + 1, c]);
  if (c > 0) res.push([r, c - 1]);
  if (c < N) res.push([r, c + 1]);
  return res;
}

function generatePuzzle(): number[][] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const visited = new Set<string>(["0,0"]);
    const path: [number, number][] = [[0, 0]];

    const dfs = (): boolean => {
      const [r, c] = path[path.length - 1];
      if (path.length >= 10) {
        if (dotNeighbors(r, c).some(([nr, nc]) => nr === 0 && nc === 0))
          return true;
      }
      const ns = shuffle(
        dotNeighbors(r, c).filter(([nr, nc]) => !visited.has(`${nr},${nc}`)),
      );
      for (const [nr, nc] of ns) {
        visited.add(`${nr},${nc}`);
        path.push([nr, nc]);
        if (dfs()) return true;
        path.pop();
        visited.delete(`${nr},${nc}`);
      }
      return false;
    };

    if (!dfs()) continue;

    const solution = new Set<EdgeKey>();
    for (let i = 0; i < path.length; i++) {
      const [r1, c1] = path[i];
      const [r2, c2] = path[(i + 1) % path.length];
      if (r1 === r2) solution.add(hKey(r1, Math.min(c1, c2)));
      else solution.add(vKey(Math.min(r1, r2), c1));
    }

    return Array.from({ length: N }, (_, r) =>
      Array.from({ length: N }, (_, c) => {
        let n = 0;
        if (solution.has(hKey(r, c))) n++;
        if (solution.has(hKey(r + 1, c))) n++;
        if (solution.has(vKey(r, c))) n++;
        if (solution.has(vKey(r, c + 1))) n++;
        return n;
      }),
    );
  }

  return Array.from({ length: N }, () => Array(N).fill(0));
}

function cellEdgeCount(edges: Set<EdgeKey>, r: number, c: number): number {
  let n = 0;
  if (edges.has(hKey(r, c))) n++;
  if (edges.has(hKey(r + 1, c))) n++;
  if (edges.has(vKey(r, c))) n++;
  if (edges.has(vKey(r, c + 1))) n++;
  return n;
}

function isValidLoop(edges: Set<EdgeKey>): boolean {
  if (edges.size === 0) return false;
  const degree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const type = edge[0];
    const [rs, cs] = edge.slice(1).split(",");
    const r = +rs,
      c = +cs;
    const [d1, d2] =
      type === "h"
        ? [`${r},${c}`, `${r},${c + 1}`]
        : [`${r},${c}`, `${r + 1},${c}`];
    degree.set(d1, (degree.get(d1) ?? 0) + 1);
    degree.set(d2, (degree.get(d2) ?? 0) + 1);
    if (!adj.has(d1)) adj.set(d1, []);
    if (!adj.has(d2)) adj.set(d2, []);
    adj.get(d1)!.push(d2);
    adj.get(d2)!.push(d1);
  }
  for (const deg of degree.values()) if (deg !== 2) return false;
  const start = degree.keys().next().value!;
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const dot = queue.shift()!;
    for (const nb of adj.get(dot) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited.size === degree.size;
}

// Which dots are touched by active edges
function activeDots(edges: Set<EdgeKey>): Set<string> {
  const dots = new Set<string>();
  for (const edge of edges) {
    const type = edge[0];
    const [rs, cs] = edge.slice(1).split(",");
    const r = +rs,
      c = +cs;
    if (type === "h") {
      dots.add(`${r},${c}`);
      dots.add(`${r},${c + 1}`);
    } else {
      dots.add(`${r},${c}`);
      dots.add(`${r + 1},${c}`);
    }
  }
  return dots;
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function LoopaPage() {
  const [clues, setClues] = useState<number[][] | null>(null);
  const [edges, setEdges] = useState<Set<EdgeKey>>(new Set());
  const [hovered, setHovered] = useState<EdgeKey | null>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    setClues(generatePuzzle()); // eslint-disable-line
  }, []);

  const solved = useMemo(() => {
    if (!clues || edges.size === 0) return false;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (cellEdgeCount(edges, r, c) !== clues[r][c]) return false;
    return isValidLoop(edges);
  }, [edges, clues]);

  const litDots = useMemo(() => activeDots(edges), [edges]);

  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [solved]);

  const toggleEdge = useCallback(
    (key: EdgeKey) => {
      if (solved) return;
      setEdges((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [solved],
  );

  const reset = useCallback(() => {
    setClues(null);
    setEdges(new Set());
    setTime(0);
    setTimeout(() => setClues(generatePuzzle()), 0);
  }, []);

  const gridTemplate = Array.from({ length: 2 * N + 1 }, (_, i) =>
    i % 2 === 0 ? `${EDGE_SIZE}px` : `${CELL_SIZE}px`,
  ).join(" ");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <nav className="absolute top-0 left-0 px-5 pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all"
        >
          ← Home
        </Link>
      </nav>

      <div className="flex flex-col items-center gap-1">
        <h1 className="font-serif text-5xl">Loopa</h1>
        <p className="text-sm text-[#aaa]">
          Draw one closed loop — numbers show how many sides it uses
        </p>
      </div>

      <div className="font-mono text-2xl">{fmtTime(time)}</div>

      {!clues && (
        <div
          style={{
            width: (CELL_SIZE + EDGE_SIZE) * N + EDGE_SIZE + 24,
            height: (CELL_SIZE + EDGE_SIZE) * N + EDGE_SIZE + 24,
            borderRadius: 16,
            background: "#f8fafc",
          }}
        />
      )}
      {clues && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            gridTemplateRows: gridTemplate,
            userSelect: "none",
            background: "#f8fafc",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          }}
        >
          {Array.from({ length: (2 * N + 1) ** 2 }, (_, idx) => {
            const vi = Math.floor(idx / (2 * N + 1));
            const vj = idx % (2 * N + 1);
            const rEven = vi % 2 === 0;
            const cEven = vj % 2 === 0;

            // Dot
            if (rEven && cEven) {
              const dr = vi / 2,
                dc = vj / 2;
              const lit = litDots.has(`${dr},${dc}`);
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: lit ? 10 : 8,
                      height: lit ? 10 : 8,
                      borderRadius: "50%",
                      background: lit ? DOT_ACTIVE : DOT_DEFAULT,
                      transition: "all 0.15s",
                    }}
                  />
                </div>
              );
            }

            // H-edge
            if (rEven && !cEven) {
              const r = vi / 2,
                c = (vj - 1) / 2;
              const key = hKey(r, c);
              const active = edges.has(key);
              const hover = hovered === key;
              return (
                <button
                  key={idx}
                  onClick={() => toggleEdge(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: active ? 6 : hover ? 4 : 3,
                      borderRadius: 99,
                      background: active
                        ? EDGE_ACTIVE
                        : hover
                          ? EDGE_HOVER
                          : EDGE_OFF,
                      boxShadow: active ? `0 0 8px ${EDGE_ACTIVE}88` : "none",
                      transition: "all 0.1s",
                    }}
                  />
                </button>
              );
            }

            // V-edge
            if (!rEven && cEven) {
              const r = (vi - 1) / 2,
                c = vj / 2;
              const key = vKey(r, c);
              const active = edges.has(key);
              const hover = hovered === key;
              return (
                <button
                  key={idx}
                  onClick={() => toggleEdge(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: active ? 6 : hover ? 4 : 3,
                      borderRadius: 99,
                      background: active
                        ? EDGE_ACTIVE
                        : hover
                          ? EDGE_HOVER
                          : EDGE_OFF,
                      boxShadow: active ? `0 0 8px ${EDGE_ACTIVE}88` : "none",
                      transition: "all 0.1s",
                    }}
                  />
                </button>
              );
            }

            // Cell
            const r = (vi - 1) / 2,
              c = (vj - 1) / 2;
            const clue = clues[r][c];
            const count = cellEdgeCount(edges, r, c);
            const over = count > clue;
            const done = count === clue && clue > 0;

            const CLUE_BG: Record<number, string> = {
              1: "#dbeafe",
              2: "#d1fae5",
              3: "#ffedd5",
            };

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {clue > 0 && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      background: over
                        ? "#fee2e2"
                        : done
                          ? CLUE_BG[clue]
                          : "transparent",
                      color: over
                        ? "#ef4444"
                        : done
                          ? CLUE_COLORS[clue]
                          : CLUE_COLORS[clue],
                      opacity: over ? 1 : done ? 1 : 0.3,
                      boxShadow: done
                        ? `0 0 0 2px ${CLUE_COLORS[clue]}55`
                        : "none",
                      transform: done ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.2s",
                    }}
                  >
                    {clue}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {solved ? (
        <div className="flex flex-col items-center gap-3">
          <p className="font-serif text-2xl">Loop complete!</p>
          <p className="text-sm text-[#aaa]">{fmtTime(time)}</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:opacity-85 transition-opacity"
          >
            New puzzle
          </button>
        </div>
      ) : (
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full border border-[#ddd] text-sm font-medium text-[#555] hover:border-[#aaa] hover:text-[#1a1a1a] transition-all"
        >
          New puzzle
        </button>
      )}
    </main>
  );
}
