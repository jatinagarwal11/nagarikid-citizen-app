import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VerificationState } from '../FaceVerificationPage';
import { useCameraStream, useFaceTracking, useLivenessChallenge } from '../hooks';
import './CameraScanScreen.css';

interface CameraScanScreenProps {
  state: VerificationState;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
  onFaceDetected: () => void;
  onFaceLost: () => void;
  onFaceAligned: () => void;
  onStartLiveness: () => void;
  onLivenessComplete: () => void;
  onLivenessFailed: () => void;
}

const CameraScanScreen: React.FC<CameraScanScreenProps> = ({
  state,
  onPermissionGranted,
  onPermissionDenied,
  onFaceDetected,
  onFaceLost,
  onFaceAligned,
  onStartLiveness,
  onLivenessComplete,
  onLivenessFailed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [currentPrompt, setCurrentPrompt] = useState('Initializing camera...');
  const [ovalState, setOvalState] = useState<'grey' | 'amber' | 'blue' | 'scanning'>('grey');

  const { stream, error: cameraError } = useCameraStream(state === 'requesting_permission');

  const {
    faceDetected,
    facePosition,
    faceAligned,
    alignmentPrompt,
  } = useFaceTracking(stream, state !== 'ready' && state !== 'requesting_permission' && state !== 'failed');

  const {
    isRunning: livenessRunning,
    currentColor,
    progress,
  } = useLivenessChallenge(state === 'scanning');

  // Handle camera permission and setup
  useEffect(() => {
    if (state === 'requesting_permission') {
      if (stream) {
        onPermissionGranted();
      } else if (cameraError) {
        onPermissionDenied();
      }
    }
  }, [state, stream, cameraError, onPermissionGranted, onPermissionDenied]);

  // Handle face detection state changes
  useEffect(() => {
    if (state === 'camera_loading') {
      if (faceDetected) {
        onFaceDetected();
      }
    } else if (state === 'no_face' || state === 'aligning') {
      if (!faceDetected) {
        onFaceLost();
      } else if (faceAligned) {
        onFaceAligned();
      }
    }
  }, [state, faceDetected, faceAligned, onFaceDetected, onFaceLost, onFaceAligned]);

  // Handle alignment to scan transition
  useEffect(() => {
    if (state === 'ready_to_scan' && !livenessRunning) {
      const timer = setTimeout(() => {
        onStartLiveness();
      }, 1000); // Wait 1 second for stability
      return () => clearTimeout(timer);
    }
  }, [state, livenessRunning, onStartLiveness]);

  // Handle liveness completion
  useEffect(() => {
    if (state === 'scanning' && !livenessRunning) {
      onLivenessComplete();
    }
  }, [state, livenessRunning, onLivenessComplete]);

  // Update UI based on current state
  useEffect(() => {
    switch (state) {
      case 'camera_loading':
        setCurrentPrompt('Initializing camera...');
        setOvalState('grey');
        break;
      case 'no_face':
        setCurrentPrompt('No face detected');
        setOvalState('grey');
        break;
      case 'aligning':
        setCurrentPrompt(alignmentPrompt);
        setOvalState('amber');
        break;
      case 'ready_to_scan':
        setCurrentPrompt('Hold still');
        setOvalState('blue');
        break;
      case 'scanning':
        setCurrentPrompt('Hold still while we scan');
        setOvalState('scanning');
        break;
    }
  }, [state, alignmentPrompt]);

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  // Handle video metadata loaded
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Style canvas to match video dimensions
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
  }, []);

  return (
    <div className="camera-scan-screen">
      <div className="scan-header">
        <h1 className="scan-title">Face Verification</h1>
      </div>

      <div className="camera-container">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          onLoadedMetadata={handleVideoLoaded}
        />
        <canvas ref={canvasRef} className="camera-canvas" />

        <div className="camera-overlay" ref={overlayRef}>
          <div className={`oval-guide oval-${ovalState}`}>
            <div className="oval-border" />
          </div>

          <div className="prompt-container">
            <div className="prompt-text">{currentPrompt}</div>
          </div>

          {state === 'scanning' && (
            <div
              className="liveness-overlay"
              style={{
                backgroundColor: currentColor,
                opacity: 0.3,
              }}
            />
          )}
        </div>
      </div>

      <div className="scan-footer">
        <p className="helper-text">
          Make sure your face is clearly visible and well lit
        </p>
      </div>
    </div>
  );
};

export default CameraScanScreen;