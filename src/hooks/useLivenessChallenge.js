import { useState, useEffect, useRef, useCallback } from 'react';

const LIVENESS_COLORS = [
  '#00ffff', // electric cyan
  '#ff00ff', // hot magenta
  '#39ff14', // neon green
  '#ff3300', // neon red-orange
  '#ffff00', // neon yellow
];

const LIVENESS_HUES = [180, 300, 90, 0, 60];
const FLASH_DURATION = 2000; // ms per color

export const useLivenessChallenge = (shouldStart) => {
  const [currentColor, setCurrentColor] = useState(null);
  const [currentHue, setCurrentHue] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef(null);
  const runningRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    runningRef.current = false;
    setIsRunning(false);
    setCurrentColor(null);
    setCurrentHue(0);
    setProgress(0);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!shouldStart) {
      cleanup();
      return;
    }

    // Already started — don't restart
    if (runningRef.current) return;

    runningRef.current = true;
    setIsRunning(true);
    setCurrentStep(0);
    setProgress(0);
    setCurrentColor(LIVENESS_COLORS[0]);
    setCurrentHue(LIVENESS_HUES[0]);

    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      if (step < LIVENESS_COLORS.length) {
        setCurrentStep(step);
        setCurrentColor(LIVENESS_COLORS[step]);
        setCurrentHue(LIVENESS_HUES[step]);
        setProgress((step / LIVENESS_COLORS.length) * 100);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        runningRef.current = false;
        setIsRunning(false);
        setProgress(100);
      }
    }, FLASH_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      runningRef.current = false;
    };
  }, [shouldStart, cleanup]);

  return {
    isRunning,
    currentColor,
    currentHue,
    progress,
    currentStep,
    totalSteps: LIVENESS_COLORS.length,
  };
};