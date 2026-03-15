import { useRef, useEffect, useState, useCallback } from 'react';
import { useCameraStream } from '../hooks/useCameraStream';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { useLivenessChallenge } from '../hooks/useLivenessChallenge';
import './CameraScanScreen.css';

const CameraScanScreen = ({
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const [currentPrompt, setCurrentPrompt] = useState('Initializing camera...');
  const [ovalState, setOvalState] = useState('grey');
  const shouldKeepCameraActive =
    state === 'requesting_permission' ||
    state === 'camera_loading' ||
    state === 'no_face' ||
    state === 'aligning' ||
    state === 'ready_to_scan' ||
    state === 'scanning';

  const { stream, error: cameraError } = useCameraStream(shouldKeepCameraActive);

  const {
    faceDetected,
    faceAligned,
    alignmentPrompt,
  } = useFaceTracking(stream, state !== 'ready' && state !== 'requesting_permission' && state !== 'failed');

  const {
    isRunning: livenessRunning,
    isDone: livenessDone,
    currentColor,
    currentStep,
  } = useLivenessChallenge(state === 'scanning');
  const isScanning = state === 'scanning';

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
      } else {
        onFaceLost();
      }
    } else if (state === 'no_face' || state === 'aligning') {
      if (!faceDetected) {
        onFaceLost();
      } else if (faceAligned) {
        onFaceAligned();
      } else if (state === 'no_face') {
        // Face returned, move to alignment state so UI can show guidance.
        onFaceDetected();
      }
    }
  }, [state, faceDetected, faceAligned, onFaceDetected, onFaceLost, onFaceAligned]);

  // Handle alignment to scan transition
  useEffect(() => {
    if (state === 'ready_to_scan' && !livenessRunning) {
      const timer = setTimeout(() => {
        onStartLiveness();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [state, livenessRunning, onStartLiveness]);

  // Handle liveness completion
  useEffect(() => {
    if (state === 'scanning' && livenessDone) {
      onLivenessComplete();
    }
  }, [state, livenessDone, onLivenessComplete]);

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
        setOvalState('green');
        break;
      case 'scanning':
        setCurrentPrompt('Hold still while we scan');
        setOvalState('scanning');
        break;
      default:
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
        <h1 className="scan-title">Face ID Verification</h1>
      </div>

      <div
        className="camera-container"
        style={isScanning && currentColor ? { backgroundColor: currentColor, transition: 'background-color 0.15s ease' } : undefined}
      >
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          onLoadedMetadata={handleVideoLoaded}
          style={isScanning ? {
            filter: 'grayscale(1) contrast(3) brightness(1.4)',
            mixBlendMode: 'screen',
          } : undefined}
        />
        <canvas ref={canvasRef} className="camera-canvas" />

        <div className="camera-overlay" ref={overlayRef}>
          <div className={`oval-guide oval-${ovalState}`}>
            <div className="oval-border" />
            {isScanning && (
              <svg className="oval-progress-ring" viewBox="0 0 100 125" key={currentStep}>
                <path
                  className="oval-progress-track"
                  d="M 50,3.5 A 47,59 0 0,1 50,121.5 A 47,59 0 0,1 50,3.5"
                />
                <path
                  className="oval-progress-arc"
                  d="M 50,3.5 A 47,59 0 0,1 50,121.5 A 47,59 0 0,1 50,3.5"
                />
              </svg>
            )}
          </div>

          <div className="prompt-container">
            <div className="prompt-text">{currentPrompt}</div>
          </div>

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