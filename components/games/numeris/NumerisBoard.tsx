"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserStreak } from "@/lib/streaks";
import { fmtTime } from "@/lib/format";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useNumeris, isSym, type TileData, type Puzzle } from "./useNumeris";
import Tile from "./Tile";
import styles from "./numeris.module.css";

// ── Tray drop zone ────────────────────────────────────────────────────
function TrayArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return (
    <div
      ref={setNodeRef}
      className={[styles.tray, isOver ? styles.dragOver : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

// ── Draggable tray tile ───────────────────────────────────────────────
function DraggableTrayTile({
  tile,
  isUsed,
  onClick,
}: {
  tile: TileData;
  isUsed: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tray-${tile.id}`,
    disabled: isUsed,
  });
  return (
    <Tile
      ref={setNodeRef}
      val={tile.val}
      used={isUsed}
      dragging={isDragging}
      onClick={isUsed ? undefined : onClick}
      {...listeners}
      {...attributes}
    />
  );
}

// ── Slot (droppable + draggable when filled) ──────────────────────────
function SlotCell({
  slotIndex,
  val,
  solved,
  onReturn,
}: {
  slotIndex: number;
  val: string | null;
  solved: boolean;
  onReturn: () => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
  });
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: `slot-${slotIndex}`,
    disabled: val === null || solved,
  });

  const filled = val !== null;
  const classes = [
    styles.slot,
    filled ? styles.filled : "",
    filled && isSym(val!) ? styles.symFilled : "",
    isOver && !isDragging ? styles.dragOver : "",
    isDragging ? styles.slotDragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={(node: HTMLElement | null) => {
        setDropRef(node);
        setDragRef(node);
      }}
      className={classes}
      onClick={filled && !solved ? onReturn : undefined}
      {...attributes}
      {...(filled && !solved ? listeners : {})}
    >
      {val}
      {filled && <span className={styles.rx}>✕</span>}
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────
export default function NumerisBoard({
  puzzle,
  puzzleId,
}: {
  puzzle: Puzzle;
  puzzleId: string | null;
}) {
  const { user } = useAuth();
  const scoreSubmitted = useRef(false);

  const [existingScore, setExistingScore] = useState<number | null>(null);
  const [loadingScore, setLoadingScore] = useState(!!puzzleId);
  const [streak, setStreak] = useState(0);

  const savedElapsed = puzzleId
    ? parseInt(localStorage.getItem(`numeris-${puzzleId}`) || "0", 10)
    : 0;

  const paused = loadingScore || existingScore !== null;

  const {
    tiles,
    slotContents,
    usedIndices,
    solved,
    elapsed,
    currentResult,
    allFilled,
    target,
    placeTile,
    swapSlots,
    returnSlot,
    clearBoard,
    resetBoard,
  } = useNumeris(puzzle, { initialElapsed: savedElapsed, paused });

  useEffect(() => {
    if (!user || !puzzleId) return;
    supabase
      .from("scores")
      .select("time_seconds, solution")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingScore(data.time_seconds);
          if (data.solution) resetBoard(data.solution as (string | null)[]);
          if (user) getUserStreak(user.id, 'numeris').then(setStreak)
        }
        setLoadingScore(false);
      });
  }, [user, puzzleId, resetBoard]);

  useEffect(() => {
    if (!puzzleId || loadingScore || existingScore !== null) return;
    localStorage.setItem(`numeris-${puzzleId}`, String(elapsed));
  }, [elapsed, puzzleId, loadingScore, existingScore]);

  useEffect(() => {
    if (
      !solved ||
      !user ||
      !puzzleId ||
      scoreSubmitted.current ||
      loadingScore ||
      existingScore !== null
    )
      return;
    scoreSubmitted.current = true;
    localStorage.removeItem(`numeris-${puzzleId}`);
    ;(async () => {
      await supabase.from("scores").insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        time_seconds: elapsed,
        solution: slotContents,
      });
      const s = await getUserStreak(user.id, 'numeris')
      setStreak(s)
    })();
  }, [
    solved,
    user,
    puzzleId,
    elapsed,
    slotContents,
    loadingScore,
    existingScore,
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (!over) return;
      const aid = active.id as string;
      const oid = over.id as string;

      if (aid.startsWith("tray-")) {
        if (oid.startsWith("slot-")) {
          placeTile(parseInt(aid.slice(5)), parseInt(oid.slice(5)));
        }
      } else if (aid.startsWith("slot-")) {
        const fromSlot = parseInt(aid.slice(5));
        if (oid.startsWith("slot-")) {
          const toSlot = parseInt(oid.slice(5));
          if (fromSlot !== toSlot) swapSlots(fromSlot, toSlot);
        } else if (oid === "tray") {
          returnSlot(fromSlot);
        }
      }
    },
    [placeTile, swapSlots, returnSlot],
  );

  const handleTileClick = useCallback(
    (tileId: number) => {
      if (solved) return;
      const firstEmpty = slotContents.findIndex((s) => s === null);
      if (firstEmpty !== -1) placeTile(tileId, firstEmpty);
    },
    [solved, slotContents, placeTile],
  );

  const activeTileVal = (() => {
    if (!activeId) return null;
    if (activeId.startsWith("tray-")) {
      return (
        tiles.find((t) => t.id === parseInt(activeId.slice(5)))?.val ?? null
      );
    }
    if (activeId.startsWith("slot-")) {
      return slotContents[parseInt(activeId.slice(5))];
    }
    return null;
  })();


  const resultClass = [
    styles.resultBox,
    currentResult === null
      ? ""
      : currentResult === target
        ? styles.match
        : allFilled
          ? styles.nomatch
          : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.nr}>
        <div className={styles.gTitle}>Numeris</div>
        <div className={styles.gSub}>Daily Number Puzzle</div>

        <div className={styles.timerWrap}>
          <div className={styles.timerLbl}>Time</div>
          <div
            className={[
              styles.timer,
              solved || existingScore !== null ? styles.solved : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {fmtTime(existingScore ?? elapsed)}
          </div>
        </div>

        <div className={styles.targetWrap}>
          <div className={styles.targetLbl}>Target</div>
          <div className={styles.targetNum}>{target}</div>
        </div>

        <div className={styles.eqArea}>
          <div className={styles.slotsRow}>
            {slotContents.map((val, si) => (
              <SlotCell
                key={si}
                slotIndex={si}
                val={val}
                solved={solved}
                onReturn={() => returnSlot(si)}
              />
            ))}
          </div>
          <div className={styles.eqSuffix}>
            <div className={styles.eqSep}>=</div>
            <div className={resultClass}>
              {currentResult === null ? "?" : currentResult}
            </div>
          </div>
        </div>

        {!solved && existingScore === null && (
          <>
            <div className={styles.tilesLbl}>Your tiles</div>
            <TrayArea>
              {tiles.map((t) => (
                <DraggableTrayTile
                  key={t.id}
                  tile={t}
                  isUsed={usedIndices.has(t.id)}
                  onClick={() => handleTileClick(t.id)}
                />
              ))}
            </TrayArea>

            <div className={styles.controls}>
              <button className={styles.btn} onClick={clearBoard}>
                Clear
              </button>
            </div>
          </>
        )}

        {(solved || existingScore !== null) && (
          <div className={[styles.solvedBanner, styles.show].join(" ")}>
            <div className={styles.solvedTxt}>Solved!</div>
            <div className={styles.solvedSub}>
              Completed in {fmtTime(existingScore ?? elapsed)}
            </div>
            {streak > 0 && (
              <div className={styles.solvedSub}>{streak}🔥</div>
            )}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTileVal != null ? <Tile val={activeTileVal} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
