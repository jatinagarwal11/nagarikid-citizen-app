import { useState, useEffect, useRef, useCallback } from 'react';

const LIVENESS_COLORS = [
  '#0066cc', // blue
  '#dc3545', // red
  '#28a745', // green
  '#ffffff', // white
  '#0066cc', // blue again
];

const FLASH_DURATION = 350; // ms per color

export const useLivenessChallenge = (shouldStart) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentColor, setCurrentColor] = useState('#0066cc');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const intervalRef = useRef();
  const startTimeRef = useRef(0);
  const totalDuration = LIVENESS_COLORS.length * FLASH_DURATION;

  const startChallenge = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
    setProgress(0);
    setCurrentColor(LIVENESS_COLORS[0]);
    startTimeRef.current = Date.now();

    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      if (step < LIVENESS_COLORS.length) {
        setCurrentStep(step);
        setCurrentColor(LIVENESS_COLORS[step]);
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
    progress,
    currentStep,
  };
};