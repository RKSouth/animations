"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

type BallPhase = "idle" | "running" | "finished";

type BallDescriptor = {
  id: number;
  leftPercent: number;
  startYOffset: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  rotate: number;
  opacity: number;
};

type FallingBallsProps = {
  ballCount?: number;
  onFinished?: () => void;
};

function mulberry32(seed: number) {
  return function random() {
    let seedValue = (seed += 0x6d2b79f5);
    seedValue = Math.imul(seedValue ^ (seedValue >>> 15), seedValue | 1);
    seedValue ^= seedValue + Math.imul(seedValue ^ (seedValue >>> 7), seedValue | 61);
    return ((seedValue ^ (seedValue >>> 14)) >>> 0) / 4294967296;
  };
}

export default function FallingBalls({
  ballCount = 304,
  onFinished,
}: FallingBallsProps) {
  const [phase, setPhase] = useState<BallPhase>("idle");
  const [runKey, setRunKey] = useState(0);

  const balls = useMemo(() => {



    const random = mulberry32(1000 + runKey);
    
    return Array.from({ length: ballCount }, (_, index) => {
      return {
        id: index,
        leftPercent: random() * 100,
        startYOffset: -80 - random() * 320,
        size: 14 + random() * 54,
        delay: random() * 1.8,
        duration: 2.1 + random() * 2.6,
        driftX: -140 + random() * 280,
        rotate: -540 + random() * 1080,
        opacity: 0.35 + random() * 0.65,
      };
    });
  }, [ballCount, runKey]);

  function startAnimation() {
    setRunKey((currentValue) => currentValue + 1);
    setPhase("running");
  }

  function handleBallComplete(ballIndex: number) {
    if (ballIndex !== balls.length - 1) return;
    setPhase("finished");
    onFinished?.();
  }

  const isIdle = phase === "idle";
  const isRunning = phase === "running";
  const isFinished = phase === "finished";

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/animations"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-100"
          >
            ← Back to Animations
          </Link>

          <button
            type="button"
            onClick={startAnimation}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-100"
          >
            {isIdle ? "Start" : "Replay"}
          </button>
        </div>


          <div className="relative h-[78svh] min-h-[620px] w-full">
            {isIdle && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl">
                    Falling
                  </h1>
                  <p className="mt-4 text-base text-zinc-100 sm:text-lg">
                    Random, spinning, growing, shrinking
                  </p>
                </div>
              </div>
            )}

            {(isRunning || isFinished) && (
              <div className="absolute inset-0" aria-hidden="true">
                {balls.map((ball, ballIndex) => (
                  <motion.div
                    key={`${runKey}-${ball.id}`}
                    className="absolute bg-amber-100"
                    style={{
                      left: `${ball.leftPercent}%`,
                      top: 0,
                      width: `${ball.size}px`,
                      height: `${ball.size}px`,
                      opacity: ball.opacity,
                    }}
                    initial={{
                      x: "-50%",
                      y: ball.startYOffset,
                      scale: 0.55,
                      rotate: 0,
                    }}
                    animate={{
                      x: `calc(-50% + ${ball.driftX}px)`,
                      y: "calc(78svh + 220px)",
                      scale: [0.55, 1.15, 0.18],
                      rotate: ball.rotate,
                      opacity: [ball.opacity, ball.opacity, ball.opacity * 0.8, 0.08],
                    }}
                    transition={{
                      delay: ball.delay,
                      duration: ball.duration,
                      ease: "easeIn",
                    }}
                    onAnimationComplete={() => handleBallComplete(ballIndex)}
                  />
                ))}
              </div>
            )}
          </div>

        {isFinished && (
          <div className="flex flex-col items-center gap-4 pt-2">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">
              Finished
            </h1>

            <button
              type="button"
              onClick={startAnimation}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-100"
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}