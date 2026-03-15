import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';

export const useFaceTracking = (stream, isActive) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignmentPrompt, setAlignmentPrompt] = useState('Move closer');

  const processingFrameRef = useRef(false);
  const stableStartTimeRef = useRef(0);
  const processFacePosition = useCallback((newPosition) => {
    const now = Date.now();
    setFacePosition(newPosition);
    setFaceDetected(true);

    // Check alignment (face should be roughly centered and appropriately sized)
    const ovalCenterX = 0.5;
    const ovalCenterY = 0.5;
    const ovalRadius = 0.2;

    const distanceFromCenter = Math.sqrt(
      Math.pow(newPosition.x - ovalCenterX, 2) +
      Math.pow(newPosition.y - ovalCenterY, 2)
    );

    const isCentered = distanceFromCenter < ovalRadius * 0.95;
    const isRightSize = newPosition.width > 0.12 && newPosition.width < 0.45;

    if (isCentered && isRightSize) {
      if (stableStartTimeRef.current === 0) {
        stableStartTimeRef.current = now;
      } else if (now - stableStartTimeRef.current > 500) {
        setFaceAligned(true);
        setAlignmentPrompt('Face centered. Hold still');
      }
      return;
    }

    stableStartTimeRef.current = 0;
    setFaceAligned(false);

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
        setAlignmentPrompt('Center your face');
      }
    } else if (newPosition.width < 0.18) {
      setAlignmentPrompt('Move closer');
    } else {
      setAlignmentPrompt('Move slightly back');
    }
  }, []);

  useEffect(() => {
    if (!isActive || !stream) return;

    let mounted = true;
    let faceMesh;
    let videoElement;
    let rafId;

    const initializeTracking = async () => {
      try {
        videoElement = document.createElement('video');
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.srcObject = stream;
        await videoElement.play();

        faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results) => {
          if (!mounted) return;

          const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
          if (!landmarks || landmarks.length === 0) {
            setFaceDetected(false);
            setFaceAligned(false);
            stableStartTimeRef.current = 0;
            setAlignmentPrompt('No face detected');
            return;
          }

          let minX = 1;
          let minY = 1;
          let maxX = 0;
          let maxY = 0;

          landmarks.forEach((point) => {
            if (point.x < minX) minX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.x > maxX) maxX = point.x;
            if (point.y > maxY) maxY = point.y;
          });

          processFacePosition({
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            width: maxX - minX,
            height: maxY - minY,
          });
        });

        const detectFrame = async () => {
          if (!mounted || !faceMesh || !videoElement) return;

          if (!processingFrameRef.current && videoElement.readyState >= 2) {
            processingFrameRef.current = true;
            try {
              await faceMesh.send({ image: videoElement });
            } catch (error) {
              // Keep loop alive even if one frame fails.
              console.error('Face mesh frame processing error:', error);
            } finally {
              processingFrameRef.current = false;
            }
          }

          rafId = requestAnimationFrame(detectFrame);
        };

        rafId = requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error('Failed to initialize face tracking:', error);
        if (mounted) {
          setFaceDetected(false);
          setFaceAligned(false);
          setAlignmentPrompt('Unable to initialize face detection');
        }
      }
    };

    initializeTracking();

    return () => {
      mounted = false;
      processingFrameRef.current = false;
      stableStartTimeRef.current = 0;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (faceMesh && typeof faceMesh.close === 'function') {
        faceMesh.close();
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [isActive, stream, processFacePosition]);

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