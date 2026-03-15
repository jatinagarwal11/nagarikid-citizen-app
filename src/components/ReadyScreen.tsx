import React from 'react';
import './ReadyScreen.css';

interface ReadyScreenProps {
  onBeginScan: () => void;
}

const ReadyScreen: React.FC<ReadyScreenProps> = ({ onBeginScan }) => {
  return (
    <div className="ready-screen">
      <div className="ready-content">
        <div className="project-name">NagarikID</div>

        <h1 className="title">Face Verification</h1>

        <p className="subtitle">
          Use your front camera to verify that you are present.
        </p>

        <div className="instructions">
          <div className="instruction-item">
            <div className="instruction-icon">○</div>
            <span>Position your face inside the oval</span>
          </div>

          <div className="instruction-item">
            <div className="instruction-icon">👤</div>
            <span>Keep your face uncovered</span>
          </div>

          <div className="instruction-item">
            <div className="instruction-icon">💡</div>
            <span>Use normal indoor lighting</span>
          </div>

          <div className="instruction-item">
            <div className="instruction-icon">⏸️</div>
            <span>Hold still during the scan</span>
          </div>
        </div>

        <button className="begin-scan-button" onClick={onBeginScan}>
          Begin scan
        </button>
      </div>
    </div>
  );
};

export default ReadyScreen;