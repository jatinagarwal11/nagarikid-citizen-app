import { useState, useEffect, useRef, useCallback } from 'react';

const LIVENESS_COLORS = [
  '#00ffff', // electric cyan
  '#ff00ff', // hot magenta
  '#39ff14', // neon green
  '#ff3300', // neon red-orange
  '#ffff00', // neon yellow
];

// Dramatic hue-rotate degrees for each step
const LIVENESS_HUES = [180, 300, 90, 0, 60];

const FLASH_DURATION = 2000; // ms per color

export const useLivenessChallenge = (shouldStart) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentColor, setCurrentColor] = useState('#0066cc');
  const [currentHue, setCurrentHue] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const intervalRef = useRef();
  const startTimeRef = useRef(0);

  const startChallenge = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
    setProgress(0);
    setCurrentColor(LIVENESS_COLORS[0]);
    setCurrentHue(LIVENESS_HUES[0]);
    startTimeRef.current = Date.now();

    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      if (step < LIVENESS_COLORS.length) {
        setCurrentStep(step);
        setCurrentColor(LIVENESS_COLORS[step]);
        setCurrentHue(LIVENESS_HUES[step]);
        setProgress((step / LIVENESS_COLORS.length) * 100);
      } else {
        // Challenge complete
        setIsRunning(false);
        setProgress(100);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, FLASH_DURATION);
  }, []);

  const stopChallenge = useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setCurrentStep(0);
    setCurrentColor('#0066cc');
    setCurrentHue(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (shouldStart && !isRunning) {
      startChallenge();
    } else if (!shouldStart && isRunning) {
      stopChallenge();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldStart, isRunning, startChallenge, stopChallenge]);

  return {
    isRunning,
    currentColor,
    currentHue,
    progress,
    currentStep,
  };
};