import { useState, useCallback, useEffect } from 'react';
import ReadyScreen from './components/ReadyScreen';
import CameraScanScreen from './components/CameraScanScreen';
import './FaceVerification.css';

const FaceVerificationPage = ({ onBack, onSuccess }) => {
  const [state, setState] = useState('ready');

  useEffect(() => {
    if (state === 'success' && onSuccess) {
      onSuccess();
    }
  }, [state, onSuccess]);

  const handleBeginScan = useCallback(() => {
    setState('requesting_permission');
  }, []);

  const handlePermissionGranted = useCallback(() => {
    setState('camera_loading');
  }, []);

  const handlePermissionDenied = useCallback(() => {
    setState('failed');
  }, []);

  const handleFaceDetected = useCallback(() => {
    setState('aligning');
  }, []);

  const handleFaceLost = useCallback(() => {
    setState('no_face');
  }, []);

  const handleFaceAligned = useCallback(() => {
    setState('ready_to_scan');
  }, []);

  const handleStartLiveness = useCallback(() => {
    setState('scanning');
  }, []);

  const handleLivenessComplete = useCallback(() => {
    setState('success');
  }, []);

  const handleLivenessFailed = useCallback(() => {
    setState('failed');
  }, []);

  const handleRetry = useCallback(() => {
    setState('ready');
  }, []);

  return (
    <div className="face-verification-page">
      {state === 'ready' && (
        <ReadyScreen onBeginScan={handleBeginScan} />
      )}

      {(state === 'requesting_permission' ||
        state === 'camera_loading' ||
        state === 'no_face' ||
        state === 'aligning' ||
        state === 'ready_to_scan' ||
        state === 'scanning') && (
        <CameraScanScreen
          state={state}
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
          onFaceDetected={handleFaceDetected}
          onFaceLost={handleFaceLost}
          onFaceAligned={handleFaceAligned}
          onStartLiveness={handleStartLiveness}
          onLivenessComplete={handleLivenessComplete}
          onLivenessFailed={handleLivenessFailed}
        />
      )}

      {state === 'success' && (
        <div className="verification-result success">
          <div className="result-content">
            <div className="result-icon">✓</div>
            <h2>Face ID Verification Complete</h2>
            <p>Your face has been successfully matched with your identity.</p>
            <div className="result-buttons">
              {onSuccess && (
                <button className="retry-button" onClick={onSuccess}>
                  Continue Registration
                </button>
              )}
              <button className="retry-button" onClick={handleRetry}>
                Verify Again
              </button>
              {onBack && (
                <button className="back-button" onClick={onBack}>
                  Back to App
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {state === 'failed' && (
        <div className="verification-result failed">
          <div className="result-content">
            <div className="result-icon">✗</div>
            <h2>Face ID Verification Failed</h2>
            <p>We couldn't match your face with your identity. Please try again.</p>
            <div className="result-buttons">
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
              {onBack && (
                <button className="back-button" onClick={onBack}>
                  Back to App
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceVerificationPage;