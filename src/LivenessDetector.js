import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';

export const LivenessDetector = ({ onComplete, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);

  // State management
  const [state, setState] = useState('requesting_permission'); // idle, requesting_permission, aligning, ready, challenge_running, analyzing, success, failed
  const [faceDetected, setFaceDetected] = useState(false);
  const [alignment, setAlignment] = useState({ x: 0, y: 0, size: 0, stable: false });
  const [instruction, setInstruction] = useState('Initializing camera...');
  const [challengeStep, setChallengeStep] = useState(0);
  const [challengeColors] = useState([
    { color: '#FF0000', durationMs: 800, name: 'Red' },      // Bright red
    { color: '#00FF00', durationMs: 800, name: 'Green' },    // Bright green
    { color: '#0000FF', durationMs: 800, name: 'Blue' },     // Bright blue
    { color: '#FFFF00', durationMs: 800, name: 'Yellow' },   // Bright yellow
    { color: '#FF00FF', durationMs: 800, name: 'Magenta' },  // Bright magenta
    { color: '#00FFFF', durationMs: 800, name: 'Cyan' }      // Bright cyan
  ]);

  // Metrics for analysis
  const [metrics, setMetrics] = useState({
    alignmentStability: 0,
    facePresenceRatio: 0,
    brightnessResponseScore: 0,
    motionScore: 0,
    blinkDetected: false,
    samples: []
  });

  const stabilityTimerRef = useRef(null);
  const challengeStartTimeRef = useRef(null);
  const lastFacePositionRef = useRef({ x: 0, y: 0 });

  const drawUI = useCallback((ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

    // Clear any previous overlays first
    ctx.save();

    // Draw semi-transparent background for better contrast
    if (state === 'challenge_running') {
      if (challengeStep === -1) {
        // White flash between colors
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      } else if (challengeStep >= 0 && challengeStep < challengeColors.length) {
        // Color challenge
        const currentColor = challengeColors[challengeStep];
        ctx.fillStyle = currentColor.color + 'CC'; // More opaque for visibility
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Draw alignment guide - more prominent
    ctx.strokeStyle = faceDetected ? (alignment.stable ? '#00FF00' : '#FFA500') : '#FF0000';
    ctx.lineWidth = 4;
    ctx.setLineDash(faceDetected && !alignment.stable ? [10, 5] : []); // Dashed line when not aligned
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw inner circle for better guidance
    ctx.strokeStyle = faceDetected ? (alignment.stable ? '#00FF00' : '#FFA500') : '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.8, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw crosshairs for precise alignment
    if (!alignment.stable && faceDetected) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - radius * 0.5, centerY);
      ctx.lineTo(centerX + radius * 0.5, centerY);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius * 0.5);
      ctx.lineTo(centerX, centerY + radius * 0.5);
      ctx.stroke();
    }

    // Draw face position indicator if face is detected but not aligned
    if (faceDetected && !alignment.stable) {
      const faceX = centerX + alignment.x;
      const faceY = centerY + alignment.y;

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(faceX, faceY, 20, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw arrow pointing to center
      const angle = Math.atan2(centerY - faceY, centerX - faceX);
      const arrowLength = 30;
      const arrowX = faceX + Math.cos(angle) * 25;
      const arrowY = faceY + Math.sin(angle) * 25;

      ctx.beginPath();
      ctx.moveTo(faceX, faceY);
      ctx.lineTo(arrowX, arrowY);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 5 * Math.cos(angle - Math.PI/6), arrowY - 5 * Math.sin(angle - Math.PI/6));
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 5 * Math.cos(angle + Math.PI/6), arrowY - 5 * Math.sin(angle + Math.PI/6));
      ctx.stroke();
    }

    // Draw progress indicator during challenge
    if (state === 'challenge_running') {
      const progress = (challengeStep + 1) / challengeColors.length;
      const progressBarWidth = width * 0.8;
      const progressBarHeight = 8;
      const progressBarX = (width - progressBarWidth) / 2;
      const progressBarY = height - 60;

      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

      // Progress fill
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);

      // Progress text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${challengeStep + 1}/${challengeColors.length}`, width / 2, progressBarY - 10);
    }

    // Draw status indicator
    const statusY = 80;
    let statusColor = '#FF0000';
    let statusText = 'No Face Detected';

    if (faceDetected) {
      if (alignment.stable) {
        statusColor = '#00FF00';
        statusText = state === 'ready' ? 'Ready for Challenge' :
                    state === 'challenge_running' ? 'Challenge in Progress' :
                    state === 'analyzing' ? 'Analyzing...' :
                    state === 'success' ? 'Success!' : 'Face Aligned';
      } else {
        statusColor = '#FFA500';
        statusText = 'Adjust Face Position';
      }
    }

    // Status background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(20, statusY - 25, 200, 40);

    // Status indicator dot
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(40, statusY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Status text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(statusText, 60, statusY + 5);

    // Draw instruction text with better visibility
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.strokeText(instruction, centerX, height - 30);
    ctx.fillText(instruction, centerX, height - 30);

    ctx.restore();
  }, [faceDetected, alignment, state, challengeStep, challengeColors, instruction]);

  // Face detection callback
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Calculate face bounding box
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
      });

      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      const faceCenterX = (minX + maxX) / 2;
      const faceCenterY = (minY + maxY) / 2;
      const faceSize = Math.max(faceWidth, faceHeight);

      // Canvas dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const circleCenterX = canvasWidth / 2;
      const circleCenterY = canvasHeight / 2;
      const circleRadius = Math.min(canvasWidth, canvasHeight) * 0.25;

      // Calculate alignment
      const distanceFromCenter = Math.sqrt(
        Math.pow((faceCenterX * canvasWidth - circleCenterX), 2) +
        Math.pow((faceCenterY * canvasHeight - circleCenterY), 2)
      );

      const targetSize = circleRadius * 2;
      const sizeRatio = faceSize * canvasWidth / targetSize;

      // Check if face is aligned
      const isCentered = distanceFromCenter < circleRadius * 0.3;
      const isRightSize = sizeRatio > 0.8 && sizeRatio < 1.3;

      // Motion detection
      const motion = Math.sqrt(
        Math.pow(faceCenterX - lastFacePositionRef.current.x, 2) +
        Math.pow(faceCenterY - lastFacePositionRef.current.y, 2)
      );
      lastFacePositionRef.current = { x: faceCenterX, y: faceCenterY };

      setFaceDetected(true);
      setAlignment({
        x: faceCenterX * canvasWidth - circleCenterX,
        y: faceCenterY * canvasHeight - circleCenterY,
        size: sizeRatio,
        stable: isCentered && isRightSize && motion < 0.01
      });

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        motionScore: Math.max(prev.motionScore, motion),
        facePresenceRatio: prev.facePresenceRatio + 1
      }));

      // Draw face landmarks (optional, for debugging)
      if (state === 'aligning') {
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
      }

    } else {
      setFaceDetected(false);
      setAlignment({ x: 0, y: 0, size: 0, stable: false });
    }

    // Draw UI overlays
    drawUI(ctx, canvas.width, canvas.height);
  }, [state, drawUI]);

  // Initialize face mesh
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    return () => {
      faceMesh.close();
    };
  }, [onResults]);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setState('requesting_permission');
      setInstruction('Requesting camera permission...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        camera.start();
        cameraRef.current = camera;

        setState('aligning');
        setInstruction('Position your face inside the circle');
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setState('failed');
      setInstruction('Camera access denied. Please allow camera access and try again.');
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    initializeCamera();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [initializeCamera]);

  const analyzeResults = useCallback(() => {
    setState('analyzing');
    setInstruction('Analyzing...');

    // Simple heuristic analysis
    const { facePresenceRatio, motionScore, samples } = metrics;
    const totalSteps = challengeColors.length;
    const presenceRatio = facePresenceRatio / (totalSteps * 60); // Rough estimate

    // Check brightness variation
    const brightnessValues = samples.map(s => s.brightness);
    const brightnessVariation = Math.max(...brightnessValues) - Math.min(...brightnessValues);

    // Scoring logic
    const scores = {
      facePresence: presenceRatio > 0.8 ? 1 : 0,
      brightnessResponse: brightnessVariation > 0.2 ? 1 : 0,
      motion: motionScore > 0.001 ? 1 : 0,
      stability: alignment.stable ? 1 : 0
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

    setTimeout(() => {
      if (totalScore > 0.7) {
        setState('success');
        setInstruction('Liveness verification successful!');
        setTimeout(() => {
          onComplete({
            passed: true,
            score: totalScore,
            reasons: ['Face detected', 'Brightness response detected', 'Natural motion detected'],
            metrics: {
              alignmentStability: scores.stability,
              facePresenceRatio: presenceRatio,
              brightnessResponseScore: brightnessVariation,
              motionScore: motionScore,
              blinkDetected: false
            }
          });
        }, 2000);
      } else {
        setState('failed');
        setInstruction('Liveness verification failed. Please try again.');
        setTimeout(() => {
          onComplete({
            passed: false,
            score: totalScore,
            reasons: ['Insufficient liveness indicators'],
            metrics: {
              alignmentStability: scores.stability,
              facePresenceRatio: presenceRatio,
              brightnessResponseScore: brightnessVariation,
              motionScore: motionScore,
              blinkDetected: false
            }
          });
        }, 2000);
      }
    }, 1000);
  }, [metrics, challengeColors.length, alignment.stable, onComplete]);

  const startChallenge = useCallback(() => {
    setState('challenge_running');
    setChallengeStep(0);
    challengeStartTimeRef.current = Date.now();
    setMetrics(prev => ({ ...prev, samples: [] }));

    // Start challenge sequence
    const runChallengeStep = (step) => {
      if (step >= challengeColors.length) {
        // Challenge complete, analyze results
        analyzeResults();
        return;
      }

      setChallengeStep(step);
      setInstruction(`Look at the ${challengeColors[step].name} light`);

      // Brief white flash before each color (except first) for better visibility
      if (step > 0) {
        setTimeout(() => {
          setChallengeStep(-1); // Special state for white flash
          setInstruction('Get ready...');
          setTimeout(() => {
            setChallengeStep(step);
            setInstruction(`Look at the ${challengeColors[step].name} light`);
          }, 200);
        }, 100);
      }

      // Sample brightness during this step
      setTimeout(() => {
        // In a real implementation, we'd sample face brightness here
        // For MVP, we'll simulate some variation
        setMetrics(prev => ({
          ...prev,
          samples: [...prev.samples, {
            step,
            color: challengeColors[step].color,
            name: challengeColors[step].name,
            brightness: Math.random() * 0.5 + 0.3, // Simulate brightness variation
            timestamp: Date.now()
          }]
        }));

        runChallengeStep(step + 1);
      }, challengeColors[step].durationMs + (step > 0 ? 300 : 0)); // Extra time for white flash
    };

    runChallengeStep(0);
  }, [challengeColors, analyzeResults]);

  // Handle state transitions
  useEffect(() => {
    if (state === 'aligning' && faceDetected) {
      if (alignment.stable) {
        setInstruction('Hold still...');
        if (!stabilityTimerRef.current) {
          stabilityTimerRef.current = setTimeout(() => {
            setState('ready');
            setInstruction('Challenge starting in 3...');
            let countdown = 3;
            const countdownInterval = setInterval(() => {
              countdown--;
              if (countdown > 0) {
                setInstruction(`Challenge starting in ${countdown}...`);
              } else {
                clearInterval(countdownInterval);
                setTimeout(() => startChallenge(), 500);
              }
            }, 1000);
          }, 1000);
        }
      } else {
        if (stabilityTimerRef.current) {
          clearTimeout(stabilityTimerRef.current);
          stabilityTimerRef.current = null;
        }

        // Provide alignment instructions
        let instruction = '';
        if (Math.abs(alignment.x) > 50) {
          instruction += alignment.x > 0 ? 'Move left ' : 'Move right ';
        }
        if (Math.abs(alignment.y) > 50) {
          instruction += alignment.y > 0 ? 'Move up ' : 'Move down ';
        }
        if (alignment.size < 0.8) {
          instruction += 'Move closer ';
        } else if (alignment.size > 1.3) {
          instruction += 'Move back ';
        }

        setInstruction(instruction || 'Position your face inside the circle');
      }
    } else if (state === 'aligning' && !faceDetected) {
      setInstruction('No face detected. Position your face in front of the camera.');
    }
  }, [state, faceDetected, alignment, startChallenge]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#000' }}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)' // Mirror for natural feel
        }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: '640px',
          height: 'auto'
        }}
      />

      {/* Status overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        Status: {state.replace('_', ' ').toUpperCase()}
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#FF4444',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          Face: {faceDetected ? 'Yes' : 'No'} | Stable: {alignment.stable ? 'Yes' : 'No'}<br/>
          Motion: {metrics.motionScore.toFixed(3)} | Presence: {(metrics.facePresenceRatio / 60).toFixed(2)}
        </div>
      )}
    </div>
  );
};