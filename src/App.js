import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import FaceVerificationPage from './FaceVerificationPage';
import VerifierPage from './VerifierPage';
import AdminPage from './AdminPage';
import KnowledgeGraph from './components/KnowledgeGraph';
import AuditTrail from './components/AuditTrail';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

/* ────────────────────────────────────────────────────────
   Landing Page
   ──────────────────────────────────────────────────────── */
function LandingPage({ onSelectCitizen, onSelectVerifier, onSelectAdmin }) {
  return (
    <div className="landing">
      <div className="landing-inner">
        <div className="landing-brand">
          <div className="brand-mark">N</div>
          <h1 className="landing-title">NagarikAPI</h1>
          <p className="landing-subtitle">Nepal's digital identity platform</p>
        </div>

        <div className="landing-cards landing-cards-3">
          <button className="role-card" onClick={onSelectCitizen}>
            <div className="role-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="role-name">Nagarik</h2>
            <p className="role-desc">Access your digital identity, manage your profile, and view who accessed your data</p>
            <span className="role-action">Continue →</span>
          </button>

          <button className="role-card" onClick={onSelectVerifier}>
            <div className="role-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
              </svg>
            </div>
            <h2 className="role-name">Verifier</h2>
            <p className="role-desc">Verify citizen identity for KYC, pharmacy, or age-gated services</p>
            <span className="role-action">Continue →</span>
          </button>

          <button className="role-card" onClick={onSelectAdmin}>
            <div className="role-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="role-name">Government</h2>
            <p className="role-desc">Admin portal — citizen lookup, audit trails, and suspicious activity</p>
            <span className="role-action">Continue →</span>
          </button>
        </div>

        <p className="landing-footer">Secure · Tamper-proof · Instant verification</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Citizen Flow
   ──────────────────────────────────────────────────────── */
function CitizenFlow({ onBack }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [qrData, setQrData] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [showRegister, setShowRegister] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('scan');
  const [scannedData, setScannedData] = useState(null);
  const [faceIdVerified, setFaceIdVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [graphData, setGraphData] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const login = async (national_id, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ national_id, password }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setLoggedIn(true);
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/generate-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Token error: ${res.status}`);
      const data = await res.json();
      if (data.uid) {
        const userRes = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);
        const userData = await userRes.json();
        setUser({ ...userData, qrData: data });
        const qrUrl = await QRCode.toDataURL(JSON.stringify(data));
        setQrData(qrUrl);
        setCountdown(5);
      }
    } catch (error) {
      alert('Failed to load user data: ' + error.message);
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Camera access denied.');
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    setScanning(true);
    setScanProgress('Detecting document edges…');

    setTimeout(() => setScanProgress('Reading MRZ zone…'), 800);
    setTimeout(() => setScanProgress('Extracting text via OCR…'), 1800);
    setTimeout(() => setScanProgress('Parsing fields…'), 2800);
    setTimeout(() => {
      setScanProgress('Validating data…');
    }, 3500);
    setTimeout(() => {
      setScanning(false);
      setScanProgress('');
      setScannedData({ national_id: '123456789', name: 'Jatin Agarwal', dob: '1998-07-15' });
      setRegistrationStep('verify');
    }, 4200);
  };

  const registerUser = async (password) => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: scannedData.national_id,
          name: scannedData.name,
          dob: scannedData.dob,
          photo_url: '/jatin.jpg',
          password,
        }),
      });
      if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
      await res.json();
      alert('Registration successful! You can now login.');
      setShowRegister(false);
      setRegistrationStep('scan');
      setScannedData(null);
      setFaceIdVerified(false);
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    loadUser();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { loadUser(); return 5; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loggedIn, loadUser]);

  // Load knowledge graph + audit trail when logged in
  useEffect(() => {
    if (!loggedIn) return;
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE}/citizen/knowledge-graph`, { headers: h })
      .then(r => r.json()).then(setGraphData).catch(() => {});
    fetch(`${API_BASE}/citizen/audit-trail`, { headers: h })
      .then(r => r.json()).then(setAuditData).catch(() => {});
  }, [loggedIn]);

  useEffect(() => {
    if (showRegister && registrationStep === 'scan') startCamera();
  }, [showRegister, registrationStep]);

  /* Registration */
  if (!loggedIn && showRegister) {
    return (
      <div className="register">
        <div className="page-header">
          <button className="back-link" onClick={() => setShowRegister(false)}>← Back</button>
        </div>
        <h1>Create Account</h1>

        {registrationStep === 'scan' && (
          <div className="step-card">
            <span className="step-label">Step 1</span>
            <h2>Scan National ID</h2>
            <p>Position your ID card in front of the camera.</p>
            <video ref={videoRef} autoPlay playsInline className="camera-preview" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {scanning ? (
              <div className="ocr-scanning">
                <div className="ocr-spinner" />
                <p className="ocr-status">{scanProgress}</p>
                <div className="ocr-progress-bar"><div className="ocr-progress-fill" /></div>
              </div>
            ) : (
              <button className="btn-primary" onClick={captureImage}>Capture &amp; Scan</button>
            )}
          </div>
        )}

        {registrationStep === 'verify' && scannedData && (
          <div className="step-card">
            <span className="step-label">Step 2</span>
            <h2>Verify Identity</h2>
            <div className="scanned-id-card">
              <img src="/jatin.jpg" alt="Scanned portrait" className="scanned-portrait" />
              <div className="extracted-data">
                <p><strong>National ID:</strong> {scannedData.national_id}</p>
                <p><strong>Name:</strong> {scannedData.name}</p>
                <p><strong>DOB:</strong> {scannedData.dob}</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setRegistrationStep('face_id_verify')}>
              Start Face Verification
            </button>
            <button className="btn-secondary" onClick={() => setRegistrationStep('scan')}>Rescan</button>
          </div>
        )}

        {registrationStep === 'face_id_verify' && (
          <div className="liveness-step">
            <FaceVerificationPage
              onBack={() => setRegistrationStep('verify')}
              onSuccess={() => { setFaceIdVerified(true); setRegistrationStep('form'); }}
            />
          </div>
        )}

        {registrationStep === 'form' && scannedData && faceIdVerified && (
          <div className="step-card">
            <span className="step-label">Step 3</span>
            <h2>Set Password</h2>
            <p>Face verified. Create your account password.</p>
            <input id="reg-password" type="password" placeholder="Password" className="input" />
            <button className="btn-primary" onClick={() => registerUser(document.getElementById('reg-password').value)}>
              Complete
            </button>
          </div>
        )}
      </div>
    );
  }

  /* Login */
  if (!loggedIn) {
    return (
      <div className="login">
        <div className="page-header">
          <button className="back-link" onClick={onBack}>← Back</button>
        </div>
        <div className="login-inner">
          <h1>NagarikAPI</h1>
          <p className="login-subtitle">Sign in to your digital identity</p>
          <input id="national_id" placeholder="National ID" className="input" />
          <input id="password" type="password" placeholder="Password" className="input" />
          <button className="btn-primary" onClick={() => login(document.getElementById('national_id').value, document.getElementById('password').value)}>
            Sign In
          </button>
          <button className="btn-secondary" onClick={() => setShowRegister(true)}>Create Account</button>
        </div>
      </div>
    );
  }

  /* Loading */
  if (!user) {
    return (
      <div className="loading">
        <h1>NagarikAPI</h1>
        <p>Loading your digital identity…</p>
      </div>
    );
  }

  /* Dashboard */
  return (
    <div className="dashboard">
      <div className="page-header">
        <button className="back-link" onClick={() => { setLoggedIn(false); setUser(null); setActiveTab('identity'); localStorage.removeItem('token'); }}>
          Sign Out
        </button>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab ${activeTab === 'identity' ? 'active' : ''}`} onClick={() => setActiveTab('identity')}>My Identity</button>
        <button className={`tab ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>Data Connections</button>
        <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>Access History</button>
      </div>

      {activeTab === 'identity' && (
        <div className="id-card">
          <img src={user.photo_url || 'https://via.placeholder.com/100'} alt="User" className="id-photo" />
          <h2>{user.name}</h2>
          <p className="id-meta">National ID: {user.national_id}</p>
          <p className="id-meta">DOB: {user.dob}</p>
          <div className="qr-section">
            <img src={qrData} alt="QR Code" className="qr-img" />
            <p className="qr-timer">Refreshes in {countdown}s</p>
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
        <div className="dash-section">
          <h2 className="dash-section-title">My Data Connections</h2>
          <p className="dash-section-sub">Your government-linked identity graph</p>
          <KnowledgeGraph data={graphData} />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="dash-section">
          <h2 className="dash-section-title">My Access History</h2>
          <p className="dash-section-sub">Every time an organisation accessed your data</p>
          <AuditTrail entries={auditData} mode="citizen" />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   App Router
   ──────────────────────────────────────────────────────── */
function App() {
  const [view, setView] = useState('landing');

  if (view === 'citizen') return <CitizenFlow onBack={() => setView('landing')} />;
  if (view === 'verifier') return <VerifierPage onBack={() => setView('landing')} />;
  if (view === 'admin') return <AdminPage onBack={() => setView('landing')} />;

  return (
    <LandingPage
      onSelectCitizen={() => setView('citizen')}
      onSelectVerifier={() => setView('verifier')}
      onSelectAdmin={() => setView('admin')}
    />
  );
}

export default App;