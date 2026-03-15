import { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const TYPE_LABELS = { bank: 'Bank / KYC', pharmacy: 'Pharmacy', age_verification: 'Age Verification' };

/* ── Verifier Login ──────────────────────────────────── */
function VerifierLogin({ onLogin }) {
  const [pan, setPan] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verifier/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_pan: pan, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verifier-login">
      <div className="brand-mark">V</div>
      <h1>Verifier Login</h1>
      <p className="login-subtitle">Enter your company PAN and credentials</p>
      <form onSubmit={handleSubmit} className="login-inner">
        <input className="input" placeholder="Company PAN (e.g. PAN001)" value={pan} onChange={e => setPan(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="login-hint">Demo: PAN001 (Bank) · PAN002 (Pharmacy) · PAN003 (Age) — password: password</p>
    </div>
  );
}

/* ── QR Scanner ──────────────────────────────────────── */
function QRScanner({ onResult, verifierToken }) {
  const onScanSuccess = useCallback(async (decodedText) => {
    try {
      const qr = JSON.parse(decodedText);
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${verifierToken}`,
        },
        body: JSON.stringify(qr),
      });
      const data = await res.json();
      onResult(data);
    } catch {
      onResult({ verified: false, reason: 'Invalid QR code' });
    }
  }, [verifierToken, onResult]);

  const onScanFailure = useCallback(() => {}, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 });
    scanner.render(onScanSuccess, onScanFailure);
    return () => { try { scanner.clear(); } catch {} };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div>
      <h2 className="scanner-heading">Scan Citizen QR</h2>
      <p className="verifier-subtitle">Point your camera at a NagarikAPI QR code</p>
      <div id="reader" className="qr-reader" />
    </div>
  );
}

/* ── KYC Result ──────────────────────────────────────── */
function KYCResult({ data, decision, reason }) {
  const approved = decision === 'approved';
  return (
    <div className={`verify-result-card ${approved ? 'result-approved' : 'result-denied'}`}>
      <div className="result-header">
        <span className="result-icon">{approved ? '✓' : '✗'}</span>
        <h2>KYC {approved ? 'Cleared' : 'Denied'}</h2>
      </div>
      <p className="result-reason">{reason}</p>
      <div className="result-section">
        <h4>Verification Summary</h4>
        <dl className="result-dl">
          <div><dt>Full Name</dt><dd>{data.full_name}</dd></div>
          <div><dt>Date of Birth</dt><dd>{data.dob}</dd></div>
          <div><dt>Age</dt><dd>{data.age}</dd></div>
          <div><dt>National ID</dt><dd>{data.national_id}</dd></div>
          <div><dt>Address</dt><dd>{data.address}</dd></div>
          <div><dt>Identity Verified</dt><dd>{data.identity_verified ? 'Yes' : 'No'}</dd></div>
          <div><dt>Liveness Passed</dt><dd>{data.liveness_verified ? 'Yes' : 'No'}</dd></div>
          <div><dt>KYC Status</dt><dd>{data.kyc_status}</dd></div>
          <div><dt>Risk Level</dt><dd>{data.kyc_risk_level}</dd></div>
          <div><dt>Citizenship #</dt><dd>{data.citizenship_number}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/* ── Pharmacy Result ─────────────────────────────────── */
function PharmacyResult({ data, decision, reason }) {
  const approved = decision === 'approved';
  const drugs = data.allowed_drugs || [];
  return (
    <div className={`verify-result-card ${approved ? 'result-approved' : 'result-denied'}`}>
      <div className="result-header">
        <span className="result-icon">{approved ? '✓' : '✗'}</span>
        <h2>Drug Access {approved ? 'Authorised' : 'Denied'}</h2>
      </div>
      <p className="result-reason">{reason}</p>
      <div className="result-section">
        <h4>Patient Verification</h4>
        <dl className="result-dl">
          <div><dt>Name</dt><dd>{data.full_name}</dd></div>
          <div><dt>Age</dt><dd>{data.age}</dd></div>
          <div><dt>Prescription</dt><dd>{data.prescription_status}</dd></div>
          <div><dt>Expiry</dt><dd>{data.prescription_expiry || '—'}</dd></div>
          <div><dt>Doctor Auth</dt><dd>{data.doctor_authorization || '—'}</dd></div>
          <div><dt>Recent Purchase Flag</dt><dd>{data.recent_drug_flag ? '⚠ Yes' : 'No'}</dd></div>
        </dl>
      </div>
      <div className="result-section">
        <h4>Authorised Drugs</h4>
        {drugs.length > 0 ? (
          <ul className="drug-permit-list">
            {drugs.map((d, i) => (
              <li key={i} className="drug-permit-item drug-approved">
                <span className="drug-icon">💊</span>
                <span className="drug-name">{d.name}</span>
                <span className="drug-schedule">Schedule {d.schedule}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="drug-none">No restricted drugs authorised for this patient.</p>
        )}
      </div>
    </div>
  );
}

/* ── Age Result ──────────────────────────────────────── */
function AgeResult({ data, decision, reason }) {
  const approved = decision === 'approved';
  return (
    <div className={`age-result ${approved ? 'age-approved' : 'age-denied'}`}>
      <div className="age-big-icon">{approved ? '✓' : '✗'}</div>
      <h2>{approved ? 'AGE VERIFIED' : 'UNDER AGE'}</h2>
      <p className="result-reason">{reason}</p>
      <div className="age-badges">
        <span className={`age-badge ${data.over_18 ? 'badge-pass' : 'badge-fail'}`}>Over 18: {data.over_18 ? 'YES' : 'NO'}</span>
        <span className={`age-badge ${data.over_21 ? 'badge-pass' : 'badge-fail'}`}>Over 21: {data.over_21 ? 'YES' : 'NO'}</span>
      </div>
      <p className="age-liveness">Liveness: {data.liveness_verified ? 'Passed' : 'Failed'}</p>
    </div>
  );
}

/* ── Verifier History ────────────────────────────────── */
function VerifierHistory({ token }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/verifier/audit-trail`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntries(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <p className="loading-text">Loading history…</p>;
  if (!entries.length) return <p className="audit-empty">No verification history yet.</p>;

  return (
    <div className="audit-container">
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Purpose</th>
              <th>Decision</th>
              <th>Reason</th>
              <th>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id || i} className={e.is_suspicious ? 'audit-suspicious' : ''}>
                <td className="audit-ts">{new Date(e.timestamp).toLocaleString()}</td>
                <td>{e.purpose}</td>
                <td><span className={`audit-decision ${e.decision}`}>{e.decision === 'approved' ? '✓' : '✗'} {e.decision}</span></td>
                <td>{e.reason || '—'}</td>
                <td>{e.is_suspicious ? <span className="audit-flag">⚠</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main VerifierPage ───────────────────────────────── */
const VerifierPage = ({ onBack }) => {
  const [step, setStep] = useState('login');        // login | dashboard | scanning | result | history
  const [verifierToken, setVerifierToken] = useState(null);
  const [businessType, setBusinessType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const handleLogin = (data) => {
    setVerifierToken(data.token);
    setBusinessType(data.business_type);
    setCompanyName(data.company_name);
    setStep('dashboard');
  };

  const handleResult = (data) => {
    setScanResult(data);
    setStep('result');
  };

  const handleLogout = () => {
    setVerifierToken(null);
    setStep('login');
  };

  return (
    <div className="verifier-page">
      <div className="verifier-header">
        <button className="back-link" onClick={step === 'login' ? onBack : step === 'dashboard' ? handleLogout : () => setStep('dashboard')}>
          ← {step === 'login' ? 'Home' : step === 'dashboard' ? 'Sign out' : 'Back'}
        </button>
        {verifierToken && <span className="verifier-badge">{TYPE_LABELS[businessType] || 'Verifier'}</span>}
      </div>

      {step === 'login' && <VerifierLogin onLogin={handleLogin} />}

      {step === 'dashboard' && (
        <div className="verifier-dashboard">
          <h1 className="verifier-title">{companyName}</h1>
          <p className="verifier-subtitle">Logged in as {TYPE_LABELS[businessType] || businessType} verifier</p>
          <div className="verifier-actions">
            <button className="btn-primary" onClick={() => setStep('scanning')}>Scan QR Code</button>
            <button className="btn-secondary" onClick={() => setStep('history')}>Verification History</button>
          </div>
        </div>
      )}

      {step === 'scanning' && (
        <QRScanner verifierToken={verifierToken} onResult={handleResult} />
      )}

      {step === 'result' && scanResult && (
        <div className="verifier-result-wrap">
          {!scanResult.verified && (
            <div className="verify-result-card result-denied">
              <div className="result-header">
                <span className="result-icon">✗</span>
                <h2>Verification Failed</h2>
              </div>
              <p className="result-reason">{scanResult.reason || 'QR code invalid or expired'}</p>
            </div>
          )}
          {scanResult.verified && scanResult.business_type === 'bank' && (
            <KYCResult data={scanResult.data} decision={scanResult.decision} reason={scanResult.reason} />
          )}
          {scanResult.verified && scanResult.business_type === 'pharmacy' && (
            <PharmacyResult data={scanResult.data} decision={scanResult.decision} reason={scanResult.reason} />
          )}
          {scanResult.verified && scanResult.business_type === 'age_verification' && (
            <AgeResult data={scanResult.data} decision={scanResult.decision} reason={scanResult.reason} />
          )}
          {scanResult.warning && (
            <div className="brute-force-warning">⚠ {scanResult.warning}</div>
          )}
          <button className="btn-primary" onClick={() => { setScanResult(null); setStep('scanning'); }} style={{ marginTop: '1.5rem' }}>
            Scan Another
          </button>
        </div>
      )}

      {step === 'history' && <VerifierHistory token={verifierToken} />}
    </div>
  );
};

export default VerifierPage;

