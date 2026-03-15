import { useState, useEffect, useCallback } from 'react';
import KnowledgeGraph from './components/KnowledgeGraph';
import AuditTrail from './components/AuditTrail';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
const TYPE_LABELS = { bank: 'Bank / KYC', pharmacy: 'Pharmacy', age_verification: 'Age Verification' };

/* ── Admin Login ─────────────────────────────────────── */
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
    <div className="admin-login">
      <div className="brand-mark">G</div>
      <h1>Government Admin Portal</h1>
      <p className="login-subtitle">Department of National ID — Internal Access</p>
      <form onSubmit={submit} className="login-inner">
        <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="login-hint">Demo: admin / password</p>
      <p className="disclaimer-inline" style={{marginTop:'0.75rem',maxWidth:'320px'}}>ℹ This admin portal uses simulated data. No real citizen records are accessed.</p>
    </div>
  );
}

/* ── Dashboard stats ─────────────────────────────────── */
function AdminDashboard({ data, onSearch, onViewSuspicious }) {
  if (!data) return <p className="loading-text">Loading dashboard…</p>;
  return (
    <div className="admin-dash">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{data.total_verifications}</span>
          <span className="stat-label">Total Verifications</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.denied_count}</span>
          <span className="stat-label">Denied</span>
        </div>
        <div className="stat-card stat-card-alert">
          <span className="stat-value">{data.unresolved_suspicious}</span>
          <span className="stat-label">Suspicious Alerts</span>
        </div>
        {Object.entries(data.by_type || {}).map(([t, c]) => (
          <div className="stat-card" key={t}>
            <span className="stat-value">{c}</span>
            <span className="stat-label">{TYPE_LABELS[t] || t}</span>
          </div>
        ))}
      </div>

      {data.unresolved_suspicious > 0 && (
        <div className="suspicious-banner" onClick={onViewSuspicious}>
          ⚠ {data.unresolved_suspicious} unresolved suspicious activity alert{data.unresolved_suspicious > 1 ? 's' : ''} — click to review
        </div>
      )}

      <h3 className="admin-section-title">Recent Verification Activity</h3>
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr><th>Time</th><th>Organisation</th><th>PAN</th><th>Type</th><th>Decision</th></tr>
          </thead>
          <tbody>
            {(data.recent_activity || []).map((e, i) => {
              const org = e.verifier_organizations || {};
              return (
                <tr key={e.id || i} className={e.is_suspicious ? 'audit-suspicious' : ''}>
                  <td className="audit-ts">{new Date(e.timestamp).toLocaleString()}</td>
                  <td>{org.company_name || e.verifier_user || '—'}</td>
                  <td className="audit-pan">{org.company_pan || '—'}</td>
                  <td><span className={`audit-type-badge audit-type-${e.business_type}`}>{TYPE_LABELS[e.business_type] || e.business_type}</span></td>
                  <td><span className={`audit-decision ${e.decision}`}>{e.decision === 'approved' ? '✓' : '✗'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Suspicious Activity ─────────────────────────────── */
function SuspiciousView({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/suspicious-activity`, { headers: { Authorization: `Bearer ${token}` } });
        setEvents(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <p className="loading-text">Loading…</p>;
  if (!events.length) return <p className="audit-empty">No suspicious activity recorded.</p>;

  return (
    <div>
      <h3 className="admin-section-title">Suspicious Activity Alerts</h3>
      <div className="suspicious-list">
        {events.map((e, i) => {
          const org = e.verifier_organizations || {};
          return (
            <div key={e.id || i} className="suspicious-card">
              <div className="suspicious-icon">⚠</div>
              <div className="suspicious-detail">
                <strong>{org.company_name || 'Unknown'}</strong> ({org.company_pan || '—'})
                <p>{e.description}</p>
                <span className="audit-ts">{new Date(e.flagged_at).toLocaleString()}</span>
                <span className={`suspicious-status ${e.resolved ? 'resolved' : 'unresolved'}`}>
                  {e.resolved ? 'Resolved' : 'Unresolved'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Citizen detail ──────────────────────────────────── */
function CitizenDetail({ citizenId, token }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [graph, setGraph] = useState(null);
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/admin/citizen/${citizenId}`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE}/admin/citizen/${citizenId}/knowledge-graph`, { headers: h }).then(r => r.json()),
      fetch(`${API_BASE}/admin/citizen/${citizenId}/audit-trail`, { headers: h }).then(r => r.json()),
    ]).then(([p, g, a]) => { setProfile(p); setGraph(g); setAudit(a); });
  }, [citizenId, token]);

  if (!profile) return <p className="loading-text">Loading citizen data…</p>;

  const u = profile.user || {};
  const p = profile.profile || {};

  return (
    <div className="citizen-detail">
      <div className="admin-tabs">
        <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`tab ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>Knowledge Graph</button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>Audit Trail</button>
      </div>

      {tab === 'profile' && (
        <div className="admin-profile">
          <div className="admin-profile-header">
            <img src={u.photo_url || 'https://via.placeholder.com/80'} alt="" className="id-photo" />
            <div>
              <h2>{u.name}</h2>
              <p className="id-meta">NID: {u.national_id}</p>
              <p className="id-meta">DOB: {u.dob}</p>
            </div>
          </div>
          <div className="admin-profile-grid">
            <div><strong>Gender</strong> {p.gender || '—'}</div>
            <div><strong>Phone</strong> {p.phone || '—'}</div>
            <div><strong>Email</strong> {p.email || '—'}</div>
            <div><strong>Province</strong> {p.province || '—'}</div>
            <div><strong>District</strong> {p.district || '—'}</div>
            <div><strong>Municipality</strong> {p.municipality || '—'}</div>
            <div><strong>Ward</strong> {p.ward || '—'}</div>
            <div><strong>Citizenship #</strong> {p.citizenship_number || '—'}</div>
            <div><strong>KYC</strong> {p.kyc_verified ? 'Verified' : 'Unverified'}</div>
            <div><strong>KYC Risk</strong> {p.kyc_risk_level || '—'}</div>
            <div><strong>Prescription</strong> {p.has_valid_prescription ? 'Valid' : 'None/Expired'}</div>
            <div><strong>Drug Eligible</strong> {p.restricted_drug_eligible ? 'Yes' : 'No'}</div>
            <div><strong>License</strong> {p.license_number || '—'}</div>
            <div><strong>Vehicle</strong> {p.vehicle_registration || '—'}</div>
          </div>
        </div>
      )}

      {tab === 'graph' && <KnowledgeGraph data={graph} />}

      {tab === 'audit' && <AuditTrail entries={audit} mode="admin" />}
    </div>
  );
}

/* ── Main AdminPage ──────────────────────────────────── */
const AdminPage = ({ onBack }) => {
  const [step, setStep] = useState('login');
  const [token, setToken] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard | suspicious | citizen
  
  const handleLogin = (data) => {
    setToken(data.token);
    setStep('main');
  };

  // load dashboard
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setDashboard);
  }, [token]);

  const handleSearch = useCallback(async () => {
    if (!searchQ.trim()) { setResults([]); return; }
    const res = await fetch(`${API_BASE}/admin/search?q=${encodeURIComponent(searchQ)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setResults(await res.json());
  }, [searchQ, token]);

  const handleLogout = () => { setToken(null); setStep('login'); };

  return (
    <div className="admin-page">
      <div className="verifier-header">
        <button className="back-link" onClick={step === 'login' ? onBack : view !== 'dashboard' ? () => { setView('dashboard'); setSelectedCitizen(null); } : handleLogout}>
          ← {step === 'login' ? 'Home' : view !== 'dashboard' ? 'Dashboard' : 'Sign out'}
        </button>
        {token && <span className="verifier-badge">Gov Admin</span>}
      </div>

      {step === 'login' && <AdminLogin onLogin={handleLogin} />}

      {step === 'main' && (
        <div className="admin-main">
          <h1 className="admin-title">Government Identity Administration</h1>

          {/* search */}
          <div className="admin-search">
            <input
              className="input"
              placeholder="Search citizen by name or NID…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn-primary" onClick={handleSearch} style={{ maxWidth: 120 }}>Search</button>
          </div>

          {results.length > 0 && (
            <div className="search-results">
              {results.map(r => (
                <button key={r.id} className="search-result-card" onClick={() => { setSelectedCitizen(r.id); setView('citizen'); setResults([]); setSearchQ(''); }}>
                  <img src={r.photo_url || 'https://via.placeholder.com/40'} alt="" className="search-photo" />
                  <div>
                    <strong>{r.name}</strong>
                    <span className="id-meta"> NID: {r.national_id}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {view === 'dashboard' && <AdminDashboard data={dashboard} onSearch={() => {}} onViewSuspicious={() => setView('suspicious')} />}
          {view === 'suspicious' && <SuspiciousView token={token} />}
          {view === 'citizen' && selectedCitizen && <CitizenDetail citizenId={selectedCitizen} token={token} />}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
