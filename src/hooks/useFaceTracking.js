import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';

const ANALYSIS_WIDTH = 320;
const ANALYSIS_HEIGHT = 240;
const DETECT_INTERVAL_MS = 90;
const TRACK_INTERVAL_MS = 33;
const MAX_LOST_TRACK_FRAMES = 8;

export const useFaceTracking = (stream, isActive) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignmentPrompt, setAlignmentPrompt] = useState('Move closer');

  const processingFrameRef = useRef(false);
  const stableStartTimeRef = useRef(0);
  const animationFrameRef = useRef(0);
  const faceMeshRef = useRef(null);
  const detectorRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const modeRef = useRef('detect');
  const lastDetectTimeRef = useRef(0);
  const lastTrackTimeRef = useRef(0);
  const lostTrackFramesRef = useRef(0);

  const setNoFaceState = useCallback(() => {
    setFaceDetected(false);
    setFaceAligned(false);
    stableStartTimeRef.current = 0;
    setAlignmentPrompt('No face detected');
  }, []);

  const processFacePosition = useCallback((newPosition) => {
    const now = Date.now();
    setFacePosition(newPosition);
    setFaceDetected(true);

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

  const getAnalysisCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = ANALYSIS_WIDTH;
      canvasRef.current.height = ANALYSIS_HEIGHT;
      contextRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
    }
    return canvasRef.current;
  }, []);

  const mapDetectedFaceToNormalized = useCallback((detectedFace) => {
    const box = detectedFace.boundingBox;
    if (!box) {
      return null;
    }

    return {
      x: (box.x + box.width / 2) / ANALYSIS_WIDTH,
      y: (box.y + box.height / 2) / ANALYSIS_HEIGHT,
      width: box.width / ANALYSIS_WIDTH,
      height: box.height / ANALYSIS_HEIGHT,
    };
  }, []);

  useEffect(() => {
    if (!isActive || !stream) return;

    let mounted = true;

    const initializeTracking = async () => {
      try {
        const analysisCanvas = getAnalysisCanvas();
        const analysisContext = contextRef.current;

        videoRef.current = document.createElement('video');
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        faceMeshRef.current = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });

        faceMeshRef.current.onResults((results) => {
          if (!mounted) return;

          const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
          if (!landmarks || landmarks.length === 0) {
            lostTrackFramesRef.current += 1;
            if (lostTrackFramesRef.current >= MAX_LOST_TRACK_FRAMES) {
              modeRef.current = 'detect';
              setNoFaceState();
            }
            return;
          }

          lostTrackFramesRef.current = 0;
          modeRef.current = 'track';

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

        if ('FaceDetector' in window) {
          detectorRef.current = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 1,
          });
        }

        const drawAnalysisFrame = () => {
          if (!analysisContext || !videoRef.current || videoRef.current.readyState < 2) {
            return false;
          }

          analysisContext.drawImage(videoRef.current, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
          return true;
        };

        const loop = async (timestamp) => {
          if (!mounted) return;

          const drewFrame = drawAnalysisFrame();
          if (!drewFrame) {
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
          }

          if (modeRef.current === 'detect' && detectorRef.current) {
            if (timestamp - lastDetectTimeRef.current >= DETECT_INTERVAL_MS) {
              lastDetectTimeRef.current = timestamp;
              try {
                const detections = await detectorRef.current.detect(analysisCanvas);
                const detectedFace = detections && detections[0];
                if (detectedFace) {
                  const position = mapDetectedFaceToNormalized(detectedFace);
                  if (position) {
                    processFacePosition(position);
                    modeRef.current = 'track';
                    lostTrackFramesRef.current = 0;
                  }
                } else {
                  setNoFaceState();
                }
              } catch (error) {
                console.error('Fast face detector error:', error);
              }
            }
          }

          const shouldRunMesh = modeRef.current === 'track' || !detectorRef.current;
          if (
            shouldRunMesh &&
            faceMeshRef.current &&
            !processingFrameRef.current &&
            timestamp - lastTrackTimeRef.current >= TRACK_INTERVAL_MS
          ) {
            processingFrameRef.current = true;
            lastTrackTimeRef.current = timestamp;
            try {
              await faceMeshRef.current.send({ image: analysisCanvas });
            } catch (error) {
              console.error('Face mesh frame processing error:', error);
            } finally {
              processingFrameRef.current = false;
            }
          }

          animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
      } catch (error) {
        console.error('Failed to initialize face tracking:', error);
        if (mounted) {
          setNoFaceState();
          setAlignmentPrompt('Unable to initialize face detection');
        }
      }
    };

    initializeTracking();

    return () => {
      mounted = false;
      processingFrameRef.current = false;
      stableStartTimeRef.current = 0;
      modeRef.current = 'detect';
      lostTrackFramesRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceMeshRef.current && typeof faceMeshRef.current.close === 'function') {
        faceMeshRef.current.close();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      faceMeshRef.current = null;
      detectorRef.current = null;
      videoRef.current = null;
    };
  }, [
    isActive,
    stream,
    processFacePosition,
    getAnalysisCanvas,
    mapDetectedFaceToNormalized,
    setNoFaceState,
  ]);

  useEffect(() => {
    if (!isActive) {
      setNoFaceState();
      setFacePosition({ x: 0, y: 0, width: 0, height: 0 });
      stableStartTimeRef.current = 0;
    }
  }, [isActive, setNoFaceState]);

  return {
    faceDetected,
    facePosition,
    faceAligned,
    alignmentPrompt,
  };
};