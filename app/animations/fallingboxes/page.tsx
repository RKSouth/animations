"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/dist/client/link";

type JumbotronPhase = "idle" | "shattering" | "revealed";

type JumbotronProps = {
  gridRows?: number;
  gridColumns?: number;
  onFinished?: () => void;
  enableScrollGestureTrigger?: boolean;
  onReveal?: () => void;
  breakSeed?: number;
  bottomBiasStrength?: number;
  rightBiasStrength?: number;
};

export default function Jumbotron({
  gridRows = 6,
  gridColumns = 10,
  enableScrollGestureTrigger = true,
  onReveal,
  breakSeed = 12345,
  bottomBiasStrength = 0.85,
  rightBiasStrength = 0.15,
  onFinished,
}: JumbotronProps) {
  const [jumbotronPhase, setJumbotronPhase] = useState<JumbotronPhase>("idle");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFinishedUi, setShowFinishedUi] = useState(false);
  const didStartShatterRef = useRef(false);

  const totalTileCount = gridRows * gridColumns;
  const lastTileIndex = totalTileCount - 1;

  const tileDescriptors = useMemo(() => {
    return Array.from({ length: totalTileCount }, (_, tileIndex) => {
      const rowIndex = Math.floor(tileIndex / gridColumns);
      const columnIndex = tileIndex % gridColumns;
      return { tileIndex, rowIndex, columnIndex };
    });
  }, [totalTileCount, gridColumns]);

  const breakOrderIndices = useMemo(() => {
    const seededRandom = mulberry32(breakSeed);
    const bottomExtraStrength = 0.65;

    const scoredTiles = tileDescriptors.map(({ tileIndex, rowIndex, columnIndex }) => {
      const rowNormalized = gridRows <= 1 ? 1 : rowIndex / (gridRows - 1);
      const columnNormalized = gridColumns <= 1 ? 0 : columnIndex / (gridColumns - 1);

      const jitter = seededRandom();
      const rowCurve = rowNormalized * rowNormalized;
      const rightCurve = columnNormalized * columnNormalized;

      const bottomComponent = bottomBiasStrength * rowCurve + bottomExtraStrength * rowNormalized;
      const rightComponent = rightBiasStrength * rightCurve;

      const score = jitter + bottomComponent + rightComponent;
      return { tileIndex, score };
    });

    scoredTiles.sort((left, right) => right.score - left.score);
    return scoredTiles.map((entry) => entry.tileIndex);
  }, [breakSeed, bottomBiasStrength, rightBiasStrength, tileDescriptors, gridRows, gridColumns]);

  const breakRankByTileIndex = useMemo(() => {
    const rankMap = new Map<number, number>();
    breakOrderIndices.forEach((tileIndex, breakRank) => {
      rankMap.set(tileIndex, breakRank);
    });
    return rankMap;
  }, [breakOrderIndices]);

  const revealNow = useCallback(() => {
    setJumbotronPhase("revealed");
    onReveal?.();
  }, [onReveal]);

  const startShatter = useCallback(() => {
    if (didStartShatterRef.current) return;
    didStartShatterRef.current = true;

    setShowFinishedUi(false);
    setIsCollapsed(false);
    setJumbotronPhase("shattering");

    window.setTimeout(() => {
      revealNow();
    }, 2600);
  }, [revealNow]);

  const restartAnimation = useCallback(() => {
    didStartShatterRef.current = false;
    setShowFinishedUi(false);
    setIsCollapsed(false);
    setJumbotronPhase("idle");
  }, []);

  useEffect(() => {
    if (jumbotronPhase !== "revealed") return;

    const collapseTimer = window.setTimeout(() => {
      setIsCollapsed(true);
      setShowFinishedUi(true);
      onFinished?.();
    }, 150);

    return () => window.clearTimeout(collapseTimer);
  }, [jumbotronPhase, onFinished]);

  useEffect(() => {
    if (!enableScrollGestureTrigger) return;
    if (jumbotronPhase !== "idle") return;

    function cleanup() {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    }

    function handleWheel(event: WheelEvent) {
      if (event.deltaY <= 0) return;
      startShatter();
      cleanup();
    }

    function handleTouchMove() {
      startShatter();
      cleanup();
    }

    function handleKeyDown(event: KeyboardEvent) {
      const isScrollKey =
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " " ||
        event.key === "End";

      if (!isScrollKey) return;

      startShatter();
      cleanup();
    }

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => cleanup();
  }, [enableScrollGestureTrigger, jumbotronPhase, startShatter]);

  const isShattering = jumbotronPhase === "shattering";
  const jumbotronBackgroundClassName = isShattering
    ? "bg-transparent"
    : "bg-[rgba(210,220,225,0.78)]";

  return (
    <div className="relative">
      <div
        className={`relative overflow-hidden transition-all duration-700 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[75svh] opacity-100"
        }`}
      >
        <div className="relative h-[75svh]">
          {jumbotronPhase === "revealed" && (
            <motion.div
              className="absolute inset-0 px-4 py-6 sm:px-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          )}

          {jumbotronPhase !== "revealed" && (
            <div className={`absolute inset-0 overflow-hidden shadow-xl ${jumbotronBackgroundClassName}`}>
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-8 text-[rgba(17,39,43,0.95)] sm:px-6">
                <h1 className="text-center font-semibold leading-[0.95] text-4xl sm:text-6xl lg:text-8xl">
                  Falling Boxes
                </h1>

                <button
                  type="button"
                  onClick={startShatter}
                  className="mt-6 rounded px-4 py-2 text-sm font-medium sm:text-base"
                >
                  ↓ See Work
                </button>
              </div>

              {isShattering && (
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  {tileDescriptors.map(({ tileIndex, rowIndex, columnIndex }) => {
                    const normalizedGridProgress = lastTileIndex <= 0 ? 1 : tileIndex / lastTileIndex;

                    const tileWidthPercent = 100 / gridColumns;
                    const tileHeightPercent = 100 / gridRows;

                    const breakRank = breakRankByTileIndex.get(tileIndex) ?? tileIndex;
                    const normalizedBreakRank =
                      totalTileCount <= 1 ? 1 : breakRank / (totalTileCount - 1);

                    const maxStaggerSeconds = 1.8;
                    const tileDelaySeconds =
                      maxStaggerSeconds * (normalizedBreakRank * normalizedBreakRank);

                    const tileDurationSeconds = 0.6 - 0.3 * normalizedBreakRank;

                    const fallDistancePixels = 220 + 1150 * normalizedGridProgress;
                    const rotationDegrees = -4 + 70 * normalizedGridProgress;
                    const horizontalDriftPixels = -50 + 100 * normalizedGridProgress;

                    const borderOpacity = 0.12;
                    const borderAndShadow = `0 0 0 1px rgba(15, 23, 42, ${borderOpacity}), 0 10px 25px rgba(0,0,0,0.18)`;

                    const tileStyle: React.CSSProperties = {
                      left: `${columnIndex * tileWidthPercent}%`,
                      top: `${rowIndex * tileHeightPercent}%`,
                      width: `${tileWidthPercent}%`,
                      height: `${tileHeightPercent}%`,
                      boxShadow: borderAndShadow,
                    };

                    const isTileThatReveals = breakRank === totalTileCount - 1;

                    return (
                      <motion.div
                        key={tileIndex}
                        className="absolute rounded-sm bg-[rgb(210,220,225)]"
                        style={tileStyle}
                        initial={{ opacity: 0.9, x: 1, y: 1, rotate: 1 }}
                        animate={{
                          x: horizontalDriftPixels,
                          y: fallDistancePixels,
                          rotate: rotationDegrees,
                          opacity: 0,
                        }}
                        transition={{
                          delay: tileDelaySeconds,
                          duration: tileDurationSeconds,
                          ease: "easeIn",
                        }}
                        onAnimationComplete={() => {
                          if (!isTileThatReveals) return;
                          revealNow();
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showFinishedUi && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <h1 className="text-center font-semibold leading-[0.95] text-4xl sm:text-6xl">
            Finished
          </h1>

          <button
            type="button"
            onClick={restartAnimation}
            className="rounded px-4 py-2 text-sm font-medium sm:text-base"
          >
            Restart
          </button>
        </div>
      )}

      <div className="mt-6">
        <Link href="/animations">
          <button className="rounded px-4 py-2 text-sm font-medium text-white sm:text-base">
            ← Back to Animations
          </button>
        </Link>
      </div>
    </div>
  );
}

function mulberry32(seed: number) {
  return function random() {
    let seedValue = (seed += 0x6d2b79f5);
    seedValue = Math.imul(seedValue ^ (seedValue >>> 15), seedValue | 1);
    seedValue ^= seedValue + Math.imul(seedValue ^ (seedValue >>> 7), seedValue | 61);
    return ((seedValue ^ (seedValue >>> 14)) >>> 0) / 4294967296;
  };
}