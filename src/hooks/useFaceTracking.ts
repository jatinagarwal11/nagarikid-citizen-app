import { useState, useEffect, useRef, useCallback } from 'react';

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useFaceTracking = (stream: MediaStream | null, isActive: boolean) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState<FacePosition>({ x: 0, y: 0, width: 0, height: 0 });
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignmentPrompt, setAlignmentPrompt] = useState('Move closer');

  const animationFrameRef = useRef<number>();
  const lastFaceTimeRef = useRef<number>(0);
  const stableStartTimeRef = useRef<number>(0);

  // Simplified face detection simulation
  // In a real implementation, this would use MediaPipe Face Mesh
  const detectFace = useCallback(() => {
    if (!stream || !isActive) return;

    // Simulate face detection with random but realistic values
    const now = Date.now();
    const shouldDetectFace = Math.random() > 0.1; // 90% chance of detecting face

    if (shouldDetectFace) {
      // Simulate face position within reasonable bounds
      const centerX = 0.4 + Math.random() * 0.2; // 0.4 to 0.6 (centered)
      const centerY = 0.35 + Math.random() * 0.3; // 0.35 to 0.65
      const faceWidth = 0.15 + Math.random() * 0.1; // 0.15 to 0.25
      const faceHeight = faceWidth * 1.3; // Slightly taller than wide

      const newPosition = {
        x: centerX,
        y: centerY,
        width: faceWidth,
        height: faceHeight,
      };

      setFacePosition(newPosition);
      setFaceDetected(true);
      lastFaceTimeRef.current = now;

      // Check alignment (face should be roughly centered and appropriately sized)
      const ovalCenterX = 0.5;
      const ovalCenterY = 0.5;
      const ovalRadius = 0.2;

      const distanceFromCenter = Math.sqrt(
        Math.pow(newPosition.x - ovalCenterX, 2) +
        Math.pow(newPosition.y - ovalCenterY, 2)
      );

      const isCentered = distanceFromCenter < ovalRadius * 0.8;
      const isRightSize = newPosition.width > 0.18 && newPosition.width < 0.22;

      if (isCentered && isRightSize) {
        if (stableStartTimeRef.current === 0) {
          stableStartTimeRef.current = now;
        } else if (now - stableStartTimeRef.current > 1000) { // Stable for 1 second
          setFaceAligned(true);
        }
      } else {
        stableStartTimeRef.current = 0;
        setFaceAligned(false);

        // Set appropriate prompt
        if (!isCentered) {
          if (newPosition.x < ovalCenterX - ovalRadius * 0.5) {
            setAlignmentPrompt('Move right');
          } else if (newPosition.x > ovalCenterX + ovalRadius * 0.5) {
            setAlignmentPrompt('Move left');
          } else if (newPosition.y < ovalCenterY - ovalRadius * 0.5) {
            setAlignmentPrompt('Move down');
          } else if (newPosition.y > ovalCenterY + ovalRadius * 0.5) {
            setAlignmentPrompt('Move up');
          } else {
            setAlignmentPrompt('Move closer');
          }
        } else if (!isRightSize) {
          if (newPosition.width < 0.18) {
            setAlignmentPrompt('Move closer');
          } else {
            setAlignmentPrompt('Move slightly back');
          }
        }
      }
    } else {
      // No face detected
      setFaceDetected(false);
      setFaceAligned(false);
      stableStartTimeRef.current = 0;
      setAlignmentPrompt('No face detected');
    }
  }, [stream, isActive]);

  // Run detection loop
  useEffect(() => {
    if (!isActive) return;

    const runDetection = () => {
      detectFace();
      animationFrameRef.current = requestAnimationFrame(runDetection);
    };

    // Start detection loop
    animationFrameRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detectFace, isActive]);

  // Reset state when not active
  useEffect(() => {
    if (!isActive) {
      setFaceDetected(false);
      setFaceAligned(false);
      setFacePosition({ x: 0, y: 0, width: 0, height: 0 });
      stableStartTimeRef.current = 0;
    }
  }, [isActive]);

  return {
    faceDetected,
    facePosition,
    faceAligned,
    alignmentPrompt,
  };
};