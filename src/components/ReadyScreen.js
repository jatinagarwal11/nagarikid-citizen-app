import './ReadyScreen.css';

const ReadyScreen = ({ onBeginScan }) => {
  return (
    <div className="ready-screen">
      <div className="ready-content">
        <div className="project-name">NagarikAPI</div>

        <h1 className="title">Face ID Verification</h1>

        <p className="subtitle">
          Use your front camera to match your face with your registered identity.
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

        <div className="liveness-info">
          <h3 className="liveness-info-title">About Liveness Detection</h3>
          <p className="liveness-info-text">
            This face verification uses a passive liveness detection approach inspired by
            the research paper <em>"FaceLivenessNet: A lightweight CNN for detecting face liveness"</em> by
            Yaojie Liu, Amin Jourabloo, and Xiaoming Liu (Michigan State University, 2018).
            The technique analyses texture and depth cues from a single frame to distinguish
            a live face from a printed photo or screen replay.
          </p>
          <p className="liveness-info-disclaimer">
            <strong>Disclaimer:</strong> The liveness detector in this prototype has <strong>not</strong> been
            fine-tuned or trained on real data. It operates exclusively on the simulated data
            within this demo and will not generalise to arbitrary faces or spoofing attacks.
            It should not be used for production identity verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReadyScreen;