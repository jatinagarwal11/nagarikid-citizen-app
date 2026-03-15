import { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const VerifierPage = ({ onBack }) => {
  const [result, setResult] = useState(null);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  const onScanSuccess = useCallback(async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const verification = await res.json();
      setResult(verification);
    } catch (err) {
      setResult({ verified: false, error: 'Invalid QR' });
    }
  }, [API_BASE]);

  const onScanFailure = useCallback((error) => {
    console.warn(`QR scan error: ${error}`);
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
    });
    scanner.render(onScanSuccess, onScanFailure);
    return () => scanner.clear();
  }, [onScanSuccess, onScanFailure]);

  const handleReset = () => setResult(null);

  return (
    <div className="verifier-page">
      <div className="verifier-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <span className="verifier-badge">Verifier</span>
      </div>

      <h1 className="verifier-title">Scan QR Code</h1>
      <p className="verifier-subtitle">
        Point your camera at a citizen's NagarikID QR code to verify their identity.
      </p>

      {!result && <div id="reader" className="qr-reader" />}

      {result && (
        <div className={`verify-result ${result.verified ? 'verified' : 'denied'}`}>
          <div className="verify-icon">{result.verified ? '✓' : '✗'}</div>
          <h2>{result.verified ? 'Identity Verified' : 'Verification Failed'}</h2>
          {result.verified && (
            <div className="verify-details">
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>DOB:</strong> {result.dob}</p>
              <p><strong>National ID:</strong> {result.national_id}</p>
              {result.photo_url && (
                <img src={result.photo_url} alt="Verified person" className="verify-photo" />
              )}
            </div>
          )}
          <button className="scan-again-btn" onClick={handleReset}>
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
};

export default VerifierPage;
