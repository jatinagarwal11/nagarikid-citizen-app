import { useState, useEffect, useRef } from 'react';

/*
 * SingPass-style liveness: cycle through 5 neon colours, 2 s each.
 * Uses requestAnimationFrame + a start timestamp — React can never
 * kill an interval.  State only updates when the step index changes
 * (5 re-renders over 10 s).
 */

const COLORS = [
  '#00ffff', // cyan
  '#ff00ff', // magenta
  '#39ff14', // neon green
  '#ff3300', // red-orange
  '#ffff00', // yellow
];
const STEP_MS = 2000;

export const useLivenessChallenge = (shouldStart) => {
  const [step, setStep] = useState(-1);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const lastStepRef = useRef(-1);

  useEffect(() => {
    if (!shouldStart) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = 0;
      lastStepRef.current = -1;
      setStep(-1);
      return;
    }

    startRef.current = performance.now();
    lastStepRef.current = 0;
    setStep(0);

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const s = Math.floor(elapsed / STEP_MS);

      if (s !== lastStepRef.current) {
        lastStepRef.current = s;
        setStep(s);
      }

      if (s < COLORS.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [shouldStart]);

  const isDone = step >= COLORS.length;
  const idx = isDone ? COLORS.length - 1 : Math.max(0, step);

  return {
    isRunning: shouldStart && !isDone,
    isDone: shouldStart && isDone,
    currentColor: step >= 0 ? COLORS[idx] : null,
    currentStep: idx,
    totalSteps: COLORS.length,
  };
};