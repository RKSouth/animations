/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

type CellValue = number;
type BoardState = CellValue[][];
type HoverTarget = {
  ringIndex: number;
  sliceIndex: number;
} | null;

type MergeFlash = {
  ringIndex: number;
  sliceIndex: number;
  value: number;
  startMs: number;
};

type FloatingScore = {
  x: number;
  y: number;
  amount: number;
  startMs: number;
};

const RING_COUNT = 3;
const SLICE_COUNT = 6;

export default function SpinBlastPrototype() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sketchApiRef = useRef<{
    resetGame: () => void;
    rotateRing: (ringIndex: number) => void;
  } | null>(null);

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
        let board: BoardState = createInitialBoard();
        let hoverTarget: HoverTarget = null;

        let ringOffsets = [0, 0, 0];
        let visualRingAngles = [0, 0, 0];
        let targetRingAngles = [0, 0, 0];

        let mergeFlashes: MergeFlash[] = [];
        let floatingScores: FloatingScore[] = [];

        let currentScore = 0;
        let currentNextValue = 1;

        let canvasWidth = 760;
        let canvasHeight = 900;

        let centerX = canvasWidth / 2;
        let centerY = canvasHeight * 0.42;

        let innerHoleRadius = 44;
        let ringThickness = 78;
        let ringGap = 12;

        const sliceAngle = p.TWO_PI / SLICE_COUNT;
        const startAngle = -p.HALF_PI;

        function updateLayout() {
          const containerWidth = containerRef.current?.clientWidth ?? 760;

          canvasWidth = Math.max(320, Math.min(760, containerWidth));
          canvasHeight = Math.floor(canvasWidth * 1.22);

          centerX = canvasWidth / 2;
          centerY = canvasHeight * 0.42;

          innerHoleRadius = Math.max(28, canvasWidth * 0.06);
          ringThickness = Math.max(42, canvasWidth * 0.095);
          ringGap = Math.max(6, canvasWidth * 0.012);
        }

        function syncReactState() {
          setScore(currentScore);
          setNextValue(currentNextValue);
        }

        function createInitialBoard(): BoardState {
          return Array.from({ length: RING_COUNT }, () =>
            Array.from({ length: SLICE_COUNT }, () => 0)
          );
        }

        function randomNextValue() {
          const roll = Math.random();
          if (roll < 0.68) return 1;
          if (roll < 0.93) return 2;
          return 3;
        }

        function resetGame() {
          board = createInitialBoard();
          ringOffsets = [0, 0, 0];
          visualRingAngles = [0, 0, 0];
          targetRingAngles = [0, 0, 0];
          hoverTarget = null;
          mergeFlashes = [];
          floatingScores = [];
          currentScore = 0;
          currentNextValue = randomNextValue();
          syncReactState();
        }

        sketchApiRef.current = {
          resetGame,
          rotateRing,
        };

        function getRingInnerRadius(ringIndex: number) {
          return innerHoleRadius + ringIndex * (ringThickness + ringGap);
        }

        function getRingOuterRadius(ringIndex: number) {
          return getRingInnerRadius(ringIndex) + ringThickness;
        }

        function getLogicalSliceIndexFromDisplay(ringIndex: number, displaySliceIndex: number) {
          return (displaySliceIndex - ringOffsets[ringIndex] + SLICE_COUNT * 10) % SLICE_COUNT;
        }

        function getCellValueAtDisplayPosition(ringIndex: number, displaySliceIndex: number) {
          const logicalSliceIndex = getLogicalSliceIndexFromDisplay(ringIndex, displaySliceIndex);
          return board[ringIndex][logicalSliceIndex];
        }

        function setCellValueAtDisplayPosition(
          ringIndex: number,
          displaySliceIndex: number,
          value: number
        ) {
          const logicalSliceIndex = getLogicalSliceIndexFromDisplay(ringIndex, displaySliceIndex);
          board[ringIndex][logicalSliceIndex] = value;
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
              0.18
            );
          }

          const now = p.millis();
          mergeFlashes = mergeFlashes.filter((flash) => now - flash.startMs < 380);
          floatingScores = floatingScores.filter((entry) => now - entry.startMs < 850);
        }

        function beginRingSegmentPath(
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

        function drawSegment(
          ringIndex: number,
          displaySliceIndex: number,
          innerRadius: number,
          outerRadius: number,
          angleStart: number,
          angleEnd: number,
          value: number,
          isHovered: boolean
        ) {
          const midAngle = (angleStart + angleEnd) / 2;
          const labelRadius = (innerRadius + outerRadius) / 2;
          const [red, green, blue] = getValueColor(value);

          const flash = mergeFlashes.find(
            (entry) =>
              entry.ringIndex === ringIndex && entry.sliceIndex === displaySliceIndex
          );

          const flashProgress = flash
            ? 1 - Math.min(1, (p.millis() - flash.startMs) / 380)
            : 0;

          p.push();

          if (value === 0) {
            p.fill(195, 195, 198);
          } else {
            const boosted = 40 * flashProgress;
            p.fill(
              Math.min(255, red + boosted),
              Math.min(255, green + boosted),
              Math.min(255, blue + boosted)
            );
          }

          if (isHovered && value === 0) {
            p.stroke(70, 70, 70);
            p.strokeWeight(4);
          } else {
            p.stroke(242, 238, 223);
            p.strokeWeight(6);
          }

          beginRingSegmentPath(innerRadius, outerRadius, angleStart, angleEnd);

          if (flashProgress > 0) {
            p.noFill();
            p.stroke(255, 255, 255, 190 * flashProgress);
            p.strokeWeight(8 * flashProgress);
            beginRingSegmentPath(innerRadius + 4, outerRadius - 4, angleStart, angleEnd);
          }

          p.pop();

          if (value > 0) {
            const textX =
              centerX + Math.cos(midAngle + visualRingAngles[ringIndex]) * labelRadius;
            const textY =
              centerY + Math.sin(midAngle + visualRingAngles[ringIndex]) * labelRadius;

            p.push();
            p.fill(70, 64, 48);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(Math.max(18, canvasWidth * 0.037) + flashProgress * 8);
            p.textStyle(p.BOLD);
            p.text(value, textX, textY + 2);
            p.pop();
          }

          if (isHovered && value === 0) {
            const previewX =
              centerX + Math.cos(midAngle + visualRingAngles[ringIndex]) * labelRadius;
            const previewY =
              centerY + Math.sin(midAngle + visualRingAngles[ringIndex]) * labelRadius;

            p.push();
            p.fill(70, 64, 48, 130);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(Math.max(18, canvasWidth * 0.037));
            p.textStyle(p.BOLD);
            p.text(currentNextValue, previewX, previewY + 2);
            p.pop();
          }
        }

        function drawRing(ringIndex: number) {
          const innerRadius = getRingInnerRadius(ringIndex);
          const outerRadius = getRingOuterRadius(ringIndex);

          p.push();
          p.translate(centerX, centerY);
          p.rotate(visualRingAngles[ringIndex]);

          for (let displaySliceIndex = 0; displaySliceIndex < SLICE_COUNT; displaySliceIndex += 1) {
            const angleStart = startAngle + displaySliceIndex * sliceAngle;
            const angleEnd = angleStart + sliceAngle;

            const value = getCellValueAtDisplayPosition(ringIndex, displaySliceIndex);
            const isHovered =
              hoverTarget?.ringIndex === ringIndex && hoverTarget?.sliceIndex === displaySliceIndex;

            drawSegment(
              ringIndex,
              displaySliceIndex,
              innerRadius,
              outerRadius,
              angleStart,
              angleEnd,
              value,
              isHovered
            );
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

        function drawFloatingScores() {
          const now = p.millis();

          for (const entry of floatingScores) {
            const age = now - entry.startMs;
            const t = Math.min(1, age / 850);

            p.push();
            p.noStroke();
            p.fill(244, 72, 52, 255 * (1 - t));
            p.textAlign(p.CENTER, p.CENTER);
            p.textStyle(p.BOLD);
            p.textSize(Math.max(18, canvasWidth * 0.034));
            p.text(`+${entry.amount}`, entry.x, entry.y - t * 34);
            p.pop();
          }
        }

        function getButtonLayout() {
          const buttonHeight = Math.max(44, canvasHeight * 0.058);
          const buttonGap = Math.max(8, canvasWidth * 0.016);
          const sidePadding = Math.max(16, canvasWidth * 0.026);
          const totalWidth = canvasWidth - sidePadding * 2;
          const buttonWidth = (totalWidth - buttonGap * 3) / 4;
          const buttonY = canvasHeight - buttonHeight - Math.max(18, canvasHeight * 0.028);
          const startX = sidePadding;

          return {
            buttonHeight,
            buttonGap,
            sidePadding,
            totalWidth,
            buttonWidth,
            buttonY,
            startX,
          };
        }

        function drawButtons() {
          const { buttonHeight, buttonWidth, buttonY, startX, buttonGap } = getButtonLayout();

          for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
            const x = startX + ringIndex * (buttonWidth + buttonGap);
            const label = `Rotate ${ringIndex + 1}`;

            p.push();
            p.fill(190, 190, 194);
            p.noStroke();
            p.rect(x, buttonY, buttonWidth, buttonHeight, 14);

            p.fill(75, 70, 60);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(Math.max(12, canvasWidth * 0.022));
            p.textStyle(p.BOLD);
            p.text(label, x + buttonWidth / 2, buttonY + buttonHeight / 2 + 1);
            p.pop();
          }

          const resetX = startX + 3 * (buttonWidth + buttonGap);

          p.push();
          p.fill(246, 143, 143);
          p.noStroke();
          p.rect(resetX, buttonY, buttonWidth, buttonHeight, 14);

          p.fill(255);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(Math.max(12, canvasWidth * 0.022));
          p.textStyle(p.BOLD);
          p.text("Reset", resetX + buttonWidth / 2, buttonY + buttonHeight / 2 + 1);
          p.pop();
        }

        function drawUi() {
          p.push();

          p.fill(90, 80, 65);
          p.noStroke();
          p.textAlign(p.LEFT, p.CENTER);
          p.textSize(Math.max(22, canvasWidth * 0.045));
          p.textStyle(p.NORMAL);
          p.text("Score", Math.max(18, canvasWidth * 0.03), Math.max(42, canvasHeight * 0.075));

          p.fill(244, 72, 52);
          p.textStyle(p.BOLD);
          p.textSize(Math.max(32, canvasWidth * 0.068));
          p.text(String(currentScore), Math.max(100, canvasWidth * 0.2), Math.max(45, canvasHeight * 0.08));

          p.fill(90, 80, 65);
          p.textStyle(p.NORMAL);
          p.textSize(Math.max(20, canvasWidth * 0.042));
          p.text("Next", canvasWidth - Math.max(150, canvasWidth * 0.28), Math.max(42, canvasHeight * 0.075));

          const nextColor = getValueColor(currentNextValue);
          const nextCircleSize = Math.max(42, canvasWidth * 0.082);
          const nextCircleX = canvasWidth - Math.max(48, canvasWidth * 0.09);
          const nextCircleY = Math.max(44, canvasHeight * 0.08);

          p.fill(nextColor[0], nextColor[1], nextColor[2]);
          p.circle(nextCircleX, nextCircleY, nextCircleSize);

          p.fill(70, 64, 48);
          p.textAlign(p.CENTER, p.CENTER);
          p.textStyle(p.BOLD);
          p.textSize(Math.max(20, canvasWidth * 0.04));
          p.text(String(currentNextValue), nextCircleX, nextCircleY + 2);

          p.pop();

          drawButtons();
          drawFloatingScores();
        }

        function pushMergeFlash(ringIndex: number, sliceIndex: number, value: number) {
          mergeFlashes.push({
            ringIndex,
            sliceIndex,
            value,
            startMs: p.millis(),
          });
        }

        function pushFloatingScore(ringIndex: number, sliceIndex: number, amount: number) {
          const innerRadius = getRingInnerRadius(ringIndex);
          const outerRadius = getRingOuterRadius(ringIndex);
          const labelRadius = (innerRadius + outerRadius) / 2;
          const angle =
            startAngle +
            sliceIndex * sliceAngle +
            sliceAngle / 2 +
            visualRingAngles[ringIndex];

          floatingScores.push({
            x: centerX + Math.cos(angle) * labelRadius,
            y: centerY + Math.sin(angle) * labelRadius,
            amount,
            startMs: p.millis(),
          });
        }

        function resolveAllMerges() {
          let mergedSomething = true;
          let scoreGain = 0;

          while (mergedSomething) {
            mergedSomething = false;

            for (let displaySliceIndex = 0; displaySliceIndex < SLICE_COUNT; displaySliceIndex += 1) {
              const columnValues = Array.from({ length: RING_COUNT }, (_, ringIndex) =>
                getCellValueAtDisplayPosition(ringIndex, displaySliceIndex)
              );

              for (let ringIndex = 0; ringIndex < RING_COUNT - 1; ringIndex += 1) {
                const current = columnValues[ringIndex];
                const next = columnValues[ringIndex + 1];

                if (current === 0 || next === 0) continue;
                if (current !== next) continue;

                const mergedValue = current + 1;

                setCellValueAtDisplayPosition(ringIndex + 1, displaySliceIndex, mergedValue);
                setCellValueAtDisplayPosition(ringIndex, displaySliceIndex, 0);

                pushMergeFlash(ringIndex + 1, displaySliceIndex, mergedValue);
                pushFloatingScore(ringIndex + 1, displaySliceIndex, mergedValue);

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

        function rotateRing(ringIndex: number) {
          ringOffsets[ringIndex] = (ringOffsets[ringIndex] + 1 + SLICE_COUNT) % SLICE_COUNT;
          targetRingAngles[ringIndex] += sliceAngle;
          resolveAllMerges();
        }

        function tryPlaceValue(ringIndex: number, displaySliceIndex: number) {
          const currentValue = getCellValueAtDisplayPosition(ringIndex, displaySliceIndex);
          if (currentValue !== 0) return;

          setCellValueAtDisplayPosition(ringIndex, displaySliceIndex, currentNextValue);
          resolveAllMerges();
          currentNextValue = randomNextValue();
          syncReactState();
        }

        function getHoverTargetFromMouse(): HoverTarget {
          const dx = p.mouseX - centerX;
          const dy = p.mouseY - centerY;
          const radius = Math.sqrt(dx * dx + dy * dy);

          let ringIndex = -1;
          for (let index = 0; index < RING_COUNT; index += 1) {
            const innerRadius = getRingInnerRadius(index);
            const outerRadius = getRingOuterRadius(index);

            if (radius >= innerRadius && radius <= outerRadius) {
              ringIndex = index;
              break;
            }
          }

          if (ringIndex === -1) return null;

          let angle = Math.atan2(dy, dx) - startAngle - visualRingAngles[ringIndex];
          while (angle < 0) angle += p.TWO_PI;
          while (angle >= p.TWO_PI) angle -= p.TWO_PI;

          const displaySliceIndex = Math.floor((angle / p.TWO_PI) * SLICE_COUNT);

          return {
            ringIndex,
            sliceIndex: displaySliceIndex,
          };
        }

        function handleMousePressed() {
          const { buttonHeight, buttonWidth, buttonY, startX, buttonGap } = getButtonLayout();

          for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
            const x = startX + ringIndex * (buttonWidth + buttonGap);

            if (
              p.mouseX >= x &&
              p.mouseX <= x + buttonWidth &&
              p.mouseY >= buttonY &&
              p.mouseY <= buttonY + buttonHeight
            ) {
              rotateRing(ringIndex);
              return;
            }
          }

          const resetX = startX + 3 * (buttonWidth + buttonGap);

          if (
            p.mouseX >= resetX &&
            p.mouseX <= resetX + buttonWidth &&
            p.mouseY >= buttonY &&
            p.mouseY <= buttonY + buttonHeight
          ) {
            resetGame();
            return;
          }

          const target = getHoverTargetFromMouse();
          if (target) {
            tryPlaceValue(target.ringIndex, target.sliceIndex);
          }
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
          handleMousePressed();
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
          Click an empty segment to place the current value. Use the rotate buttons to turn rings.
          Matching aligned values merge outward, upgrade by 1, and increase your score.
        </div>
      </div>
    </div>
  );
}