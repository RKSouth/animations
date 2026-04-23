/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

type BoardState = number[][];

type HoverTarget = {
  ringIndex: number;
  sliceIndex: number;
} | null;

type DragState = {
  ringIndex: number;
  startMouseAngle: number;
  startTargetAngle: number;
  pressX: number;
  pressY: number;
  didDrag: boolean;
  targetOnPress: HoverTarget;
};

const RING_COUNT = 3;
const SLICE_COUNT = 6;

export default function SpinBlastPrototype() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sketchApiRef = useRef<{ resetGame: () => void } | null>(null);

  const [score, setScore] = useState(0);
  const [nextValue, setNextValue] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    let instance: any = null;
    let disposed = false;

    import("p5").then((mod) => {
      if (disposed || !containerRef.current) return;

      const P5 = mod.default;

      const sketch = (p: any) => {
        let board: BoardState = createEmptyBoard();
        let hoverTarget: HoverTarget = null;
        let dragState: DragState | null = null;

        let ringOffsets = [0, 0, 0];
        let visualRingAngles = [0, 0, 0];
        let targetRingAngles = [0, 0, 0];

        let currentScore = 0;
        let currentNextValue = 1;

        let canvasWidth = 760;
        let canvasHeight = 850;
        let centerX = canvasWidth / 2;
        let centerY = canvasHeight * 0.47;

        let innerHoleRadius = 44;
        let ringThickness = 78;
        let ringGap = 12;

        const sliceAngle = p.TWO_PI / SLICE_COUNT;
        const startAngle = -p.HALF_PI;

        function updateLayout() {
          const containerWidth = containerRef.current?.clientWidth ?? 760;

          canvasWidth = Math.max(320, Math.min(760, containerWidth));
          canvasHeight = Math.floor(canvasWidth * 1.12);

          centerX = canvasWidth / 2;
          centerY = canvasHeight * 0.52;

          innerHoleRadius = Math.max(26, canvasWidth * 0.055);
          ringThickness = Math.max(42, canvasWidth * 0.095);
          ringGap = Math.max(6, canvasWidth * 0.012);
        }

        function createEmptyBoard(): BoardState {
          return Array.from({ length: RING_COUNT }, () =>
            Array.from({ length: SLICE_COUNT }, () => 0)
          );
        }

        function randomNextValue() {
          const roll = Math.random();
          if (roll < 0.7) return 1;
          if (roll < 0.94) return 2;
          return 3;
        }

        function syncReactState() {
          setScore(currentScore);
          setNextValue(currentNextValue);
        }

        function resetGame() {
          board = createEmptyBoard();
          ringOffsets = [0, 0, 0];
          visualRingAngles = [0, 0, 0];
          targetRingAngles = [0, 0, 0];
          currentScore = 0;
          currentNextValue = randomNextValue();
          dragState = null;
          syncReactState();
        }

        sketchApiRef.current = { resetGame };

        function getRingInnerRadius(ringIndex: number) {
          return innerHoleRadius + ringIndex * (ringThickness + ringGap);
        }

        function getRingOuterRadius(ringIndex: number) {
          return getRingInnerRadius(ringIndex) + ringThickness;
        }

        function getValueColor(value: number) {
          if (value === 0) return [198, 198, 202];
          if (value === 1) return [245, 206, 71];
          if (value === 2) return [187, 214, 76];
          if (value === 3) return [96, 207, 171];
          if (value === 4) return [107, 178, 239];
          if (value === 5) return [180, 122, 242];
          return [245, 136, 136];
        }

        function getLogicalSliceIndexFromDisplay(ringIndex: number, displaySliceIndex: number) {
          return (displaySliceIndex - ringOffsets[ringIndex] + SLICE_COUNT * 10) % SLICE_COUNT;
        }

        function getValueAtDisplay(ringIndex: number, displaySliceIndex: number) {
          const logicalSliceIndex = getLogicalSliceIndexFromDisplay(ringIndex, displaySliceIndex);
          return board[ringIndex][logicalSliceIndex];
        }

        function setValueAtDisplay(ringIndex: number, displaySliceIndex: number, value: number) {
          const logicalSliceIndex = getLogicalSliceIndexFromDisplay(ringIndex, displaySliceIndex);
          board[ringIndex][logicalSliceIndex] = value;
        }

        function getMouseAngle() {
          return Math.atan2(p.mouseY - centerY, p.mouseX - centerX);
        }

        function getRingIndexFromMouse() {
          const dx = p.mouseX - centerX;
          const dy = p.mouseY - centerY;
          const radius = Math.sqrt(dx * dx + dy * dy);

          for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
            if (radius >= getRingInnerRadius(ringIndex) && radius <= getRingOuterRadius(ringIndex)) {
              return ringIndex;
            }
          }

          return -1;
        }

        function getHoverTargetFromMouse(): HoverTarget {
          const ringIndex = getRingIndexFromMouse();
          if (ringIndex === -1) return null;

          let angle = getMouseAngle() - startAngle - visualRingAngles[ringIndex];

          while (angle < 0) angle += p.TWO_PI;
          while (angle >= p.TWO_PI) angle -= p.TWO_PI;

          return {
            ringIndex,
            sliceIndex: Math.floor((angle / p.TWO_PI) * SLICE_COUNT),
          };
        }

        function lerpAngle(current: number, target: number, amount: number) {
          let delta = target - current;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          return current + delta * amount;
        }

        function updateAnimations() {
          for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
            visualRingAngles[ringIndex] = lerpAngle(
              visualRingAngles[ringIndex],
              targetRingAngles[ringIndex],
              0.22
            );
          }
        }

        function drawSegmentPath(
          innerRadius: number,
          outerRadius: number,
          angleStart: number,
          angleEnd: number
        ) {
          p.beginShape();

          for (let step = 0; step <= 24; step += 1) {
            const t = step / 24;
            const angle = p.lerp(angleStart, angleEnd, t);
            p.vertex(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
          }

          for (let step = 24; step >= 0; step -= 1) {
            const t = step / 24;
            const angle = p.lerp(angleStart, angleEnd, t);
            p.vertex(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
          }

          p.endShape(p.CLOSE);
        }

        function drawRing(ringIndex: number) {
          const innerRadius = getRingInnerRadius(ringIndex);
          const outerRadius = getRingOuterRadius(ringIndex);

          p.push();
          p.translate(centerX, centerY);
          p.rotate(visualRingAngles[ringIndex]);

          for (let sliceIndex = 0; sliceIndex < SLICE_COUNT; sliceIndex += 1) {
            const angleStart = startAngle + sliceIndex * sliceAngle;
            const angleEnd = angleStart + sliceAngle;
            const midAngle = angleStart + sliceAngle / 2;
            const labelRadius = (innerRadius + outerRadius) / 2;

            const value = getValueAtDisplay(ringIndex, sliceIndex);
            const isHovered =
              hoverTarget?.ringIndex === ringIndex && hoverTarget?.sliceIndex === sliceIndex;

            const color = getValueColor(value);

            p.push();

            p.fill(color[0], color[1], color[2]);
            p.stroke(242, 238, 223);
            p.strokeWeight(isHovered && value === 0 ? 4 : 6);

            drawSegmentPath(innerRadius, outerRadius, angleStart, angleEnd);

            p.pop();

            const textX = Math.cos(midAngle) * labelRadius;
            const textY = Math.sin(midAngle) * labelRadius;

            if (value > 0) {
              p.push();
              p.translate(textX, textY);

              // Counter-rotate text so numbers do not fly/tilt with the ring.
              p.rotate(-visualRingAngles[ringIndex]);

              p.fill(70, 64, 48);
              p.noStroke();
              p.textAlign(p.CENTER, p.CENTER);
              p.textStyle(p.BOLD);
              p.textSize(Math.max(18, canvasWidth * 0.037));
              p.text(value, 0, 2);
              p.pop();
            }

            if (isHovered && value === 0 && !dragState) {
              p.push();
              p.translate(textX, textY);
              p.rotate(-visualRingAngles[ringIndex]);

              p.fill(70, 64, 48, 130);
              p.noStroke();
              p.textAlign(p.CENTER, p.CENTER);
              p.textStyle(p.BOLD);
              p.textSize(Math.max(18, canvasWidth * 0.037));
              p.text(currentNextValue, 0, 2);
              p.pop();
            }
          }

          p.pop();
        }

        function drawBoard() {
          p.push();
          p.translate(centerX, centerY);

          p.noStroke();
          p.fill(239, 236, 221);
          p.circle(0, 0, getRingOuterRadius(RING_COUNT - 1) * 2 + canvasWidth * 0.08);

          p.pop();

          for (let ringIndex = RING_COUNT - 1; ringIndex >= 0; ringIndex -= 1) {
            drawRing(ringIndex);
          }

          p.push();
          p.translate(centerX, centerY);
          p.noStroke();
          p.fill(239, 236, 221);
          p.circle(0, 0, innerHoleRadius * 2);
          p.pop();
        }

        function drawUi() {
          p.push();

          p.fill(90, 80, 65);
          p.noStroke();
          p.textAlign(p.LEFT, p.CENTER);
          p.textSize(Math.max(22, canvasWidth * 0.045));
          p.text("Score", canvasWidth * 0.05, canvasHeight * 0.08);

          p.fill(244, 72, 52);
          p.textStyle(p.BOLD);
          p.textSize(Math.max(32, canvasWidth * 0.068));
          p.text(String(currentScore), canvasWidth * 0.22, canvasHeight * 0.085);

          p.fill(90, 80, 65);
          p.textStyle(p.NORMAL);
          p.textSize(Math.max(20, canvasWidth * 0.042));
          p.text("Next", canvasWidth * 0.68, canvasHeight * 0.08);

          const nextColor = getValueColor(currentNextValue);
          const nextCircleSize = Math.max(42, canvasWidth * 0.082);
          const nextCircleX = canvasWidth * 0.9;
          const nextCircleY = canvasHeight * 0.08;

          p.fill(nextColor[0], nextColor[1], nextColor[2]);
          p.circle(nextCircleX, nextCircleY, nextCircleSize);

          p.fill(70, 64, 48);
          p.textAlign(p.CENTER, p.CENTER);
          p.textStyle(p.BOLD);
          p.textSize(Math.max(20, canvasWidth * 0.04));
          p.text(String(currentNextValue), nextCircleX, nextCircleY + 2);

          p.pop();
        }

        function resolveAllMerges() {
          let mergedSomething = true;
          let scoreGain = 0;

          while (mergedSomething) {
            mergedSomething = false;

            for (let sliceIndex = 0; sliceIndex < SLICE_COUNT; sliceIndex += 1) {
              for (let ringIndex = 0; ringIndex < RING_COUNT - 1; ringIndex += 1) {
                const current = getValueAtDisplay(ringIndex, sliceIndex);
                const next = getValueAtDisplay(ringIndex + 1, sliceIndex);

                if (current === 0 || next === 0 || current !== next) continue;

                const mergedValue = current + 1;

                setValueAtDisplay(ringIndex, sliceIndex, 0);
                setValueAtDisplay(ringIndex + 1, sliceIndex, mergedValue);

                scoreGain += mergedValue;
                mergedSomething = true;
                break;
              }

              if (mergedSomething) break;
            }
          }

          if (scoreGain > 0) {
            currentScore += scoreGain;
            syncReactState();
          }
        }

        function tryPlaceValue(target: HoverTarget) {
          if (!target) return;

          const currentValue = getValueAtDisplay(target.ringIndex, target.sliceIndex);
          if (currentValue !== 0) return;

          setValueAtDisplay(target.ringIndex, target.sliceIndex, currentNextValue);
          resolveAllMerges();

          currentNextValue = randomNextValue();
          syncReactState();
        }

        function finishDragRotation() {
          if (!dragState) return;

          const snappedSteps = Math.round(targetRingAngles[dragState.ringIndex] / sliceAngle);
          targetRingAngles[dragState.ringIndex] = snappedSteps * sliceAngle;
          visualRingAngles[dragState.ringIndex] = targetRingAngles[dragState.ringIndex];

          ringOffsets[dragState.ringIndex] =
            ((snappedSteps % SLICE_COUNT) + SLICE_COUNT) % SLICE_COUNT;

          resolveAllMerges();
        }

        p.setup = () => {
          updateLayout();
          const canvas = p.createCanvas(canvasWidth, canvasHeight);
          canvas.parent(containerRef.current!);
          resetGame();
        };

        p.draw = () => {
          p.background(226, 226, 214);

          updateAnimations();
          hoverTarget = getHoverTargetFromMouse();

          drawUi();
          drawBoard();
        };

        p.mousePressed = () => {
          const target = getHoverTargetFromMouse();
          const ringIndex = getRingIndexFromMouse();

          if (ringIndex === -1) return;

          dragState = {
            ringIndex,
            startMouseAngle: getMouseAngle(),
            startTargetAngle: targetRingAngles[ringIndex],
            pressX: p.mouseX,
            pressY: p.mouseY,
            didDrag: false,
            targetOnPress: target,
          };
        };

        p.mouseDragged = () => {
          if (!dragState) return;

          const movedDistance = Math.hypot(p.mouseX - dragState.pressX, p.mouseY - dragState.pressY);

          if (movedDistance > 6) {
            dragState.didDrag = true;
          }

          const deltaAngle = getMouseAngle() - dragState.startMouseAngle;
          targetRingAngles[dragState.ringIndex] = dragState.startTargetAngle + deltaAngle;
        };

        p.mouseReleased = () => {
          if (!dragState) return;

          if (dragState.didDrag) {
            finishDragRotation();
          } else {
            tryPlaceValue(dragState.targetOnPress);
          }

          dragState = null;
        };

        p.windowResized = () => {
          updateLayout();
          p.resizeCanvas(canvasWidth, canvasHeight);
        };
      };

      instance = new P5(sketch, containerRef.current!);
    });

    return () => {
      disposed = true;
      sketchApiRef.current = null;
      if (instance) instance.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f0e3] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => history.back()}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            ← Back
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm">
              Score: {score}
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm">
              Next: {nextValue}
            </div>

            <button
              type="button"
              onClick={() => sketchApiRef.current?.resetGame()}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
            >
              Reset Game
            </button>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-[2rem] border border-zinc-200 bg-[#efecdd] shadow-sm">
          <div
            ref={containerRef}
            className="w-full [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full [&_canvas]:max-w-full"
          />
        </div>

        <div className="max-w-3xl px-2 text-sm leading-6 text-zinc-600">
          Tap an empty segment to place the next value. Click and drag a ring to rotate it. Matching
          aligned values merge outward and upgrade by 1.
        </div>
      </div>
    </div>
  );
}