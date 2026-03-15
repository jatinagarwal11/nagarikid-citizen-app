/* ═══════════════════════════════════════════════════════════
   mockData.js — Self-contained demo data so the app works
   without a running backend / Supabase.
   ═══════════════════════════════════════════════════════════ */

function age(dob) {
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

/* ── Citizens ──────────────────────────────────────────── */
export const CITIZENS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    national_id: '12345678',
    name: 'Ram Sharma',
    dob: '2001-05-12',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    password: 'password',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    national_id: '87654321',
    name: 'Sita Gurung',
    dob: '1998-02-03',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    password: 'password',
  },
];

export const CITIZEN_PROFILES = {
  '11111111-1111-1111-1111-111111111111': {
    gender: 'Male', phone: '+977-9841234567', email: 'ram.sharma@email.com',
    province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: 10,
    kyc_verified: true, kyc_verified_date: '2025-01-15', kyc_risk_level: 'low',
    has_valid_prescription: true, prescription_expiry: '2026-06-01', restricted_drug_eligible: true,
    doctor_authorization: 'Dr. Anil Thapa — NMC #12345', recent_drug_purchase_date: null,
    license_number: 'BA-1234', vehicle_registration: 'Ba 1 Ja 5678',
    citizenship_number: 'KTM-2001-12345', citizenship_issued_district: 'Kathmandu', citizenship_issued_date: '2019-05-12',
  },
  '22222222-2222-2222-2222-222222222222': {
    gender: 'Female', phone: '+977-9849876543', email: 'sita.gurung@email.com',
    province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', ward: 5,
    kyc_verified: false, kyc_verified_date: null, kyc_risk_level: 'pending',
    has_valid_prescription: true, prescription_expiry: '2025-12-15', restricted_drug_eligible: false,
    doctor_authorization: null, recent_drug_purchase_date: null,
    license_number: null, vehicle_registration: null,
    citizenship_number: 'KSK-1998-67890', citizenship_issued_district: 'Kaski', citizenship_issued_date: '2016-02-03',
  },
};

/* ── Verifiers ─────────────────────────────────────────── */
export const VERIFIERS = [
  { id: 'aaaa1111-1111-1111-1111-111111111111', company_pan: 'PAN001', company_name: 'Himalayan Bank Limited', business_type: 'bank', contact_email: 'kyc@himalayanbank.com', password: 'password', status: 'approved' },
  { id: 'aaaa2222-2222-2222-2222-222222222222', company_pan: 'PAN002', company_name: 'City Pharmacy Pvt. Ltd.', business_type: 'pharmacy', contact_email: 'verify@citypharmacy.com', password: 'password', status: 'approved' },
  { id: 'aaaa3333-3333-3333-3333-333333333333', company_pan: 'PAN003', company_name: 'Retail Mart Nepal', business_type: 'age_verification', contact_email: 'age@retailmart.com', password: 'password', status: 'approved' },
];

/* ── Admin ─────────────────────────────────────────────── */
export const ADMINS = [
  { id: 'bbbb1111-1111-1111-1111-111111111111', username: 'admin', password: 'password', role: 'super_admin', department: 'Department of National ID' },
];

/* ── Permission policies ───────────────────────────────── */
export const POLICIES = {
  bank: ['full_name','dob','age','national_id','address','photo_url','identity_verified','liveness_verified','kyc_status','kyc_risk_level','citizenship_number'],
  pharmacy: ['full_name','age','prescription_status','prescription_expiry','restricted_drug_eligible','doctor_authorization','recent_drug_flag'],
  age_verification: ['age_verified','over_18','over_21','liveness_verified'],
};

/* ── Mutable audit trail ───────────────────────────────── */
let _auditId = 100;
export const AUDIT_TRAIL = [
  { id: 1, citizen_id: '11111111-1111-1111-1111-111111111111', verifier_org_id: 'aaaa1111-1111-1111-1111-111111111111', verifier_user: 'Rajesh KC', business_type: 'bank', purpose: 'KYC onboarding — new account', fields_accessed: ['full_name','dob','national_id','address','kyc_status'], decision: 'approved', reason: 'Identity verified successfully', is_suspicious: false, timestamp: '2026-03-10T09:30:00Z' },
  { id: 2, citizen_id: '11111111-1111-1111-1111-111111111111', verifier_org_id: 'aaaa2222-2222-2222-2222-222222222222', verifier_user: 'Anita Poudel', business_type: 'pharmacy', purpose: 'Restricted medicine purchase', fields_accessed: ['full_name','age','prescription_status','restricted_drug_eligible'], decision: 'approved', reason: 'Valid prescription confirmed', is_suspicious: false, timestamp: '2026-03-12T14:15:00Z' },
  { id: 3, citizen_id: '11111111-1111-1111-1111-111111111111', verifier_org_id: 'aaaa3333-3333-3333-3333-333333333333', verifier_user: 'Store Staff', business_type: 'age_verification', purpose: 'Age-gated product purchase', fields_accessed: ['age_verified','over_18'], decision: 'approved', reason: 'Age threshold met', is_suspicious: false, timestamp: '2026-03-14T11:00:00Z' },
  { id: 4, citizen_id: '22222222-2222-2222-2222-222222222222', verifier_org_id: 'aaaa1111-1111-1111-1111-111111111111', verifier_user: 'Rajesh KC', business_type: 'bank', purpose: 'KYC onboarding attempt', fields_accessed: ['full_name','dob','national_id','address','kyc_status'], decision: 'denied', reason: 'KYC not yet verified', is_suspicious: false, timestamp: '2026-03-11T10:00:00Z' },
  { id: 5, citizen_id: '22222222-2222-2222-2222-222222222222', verifier_org_id: 'aaaa2222-2222-2222-2222-222222222222', verifier_user: 'Anita Poudel', business_type: 'pharmacy', purpose: 'Restricted medicine purchase', fields_accessed: ['full_name','age','prescription_status','restricted_drug_eligible'], decision: 'denied', reason: 'Prescription expired', is_suspicious: false, timestamp: '2026-03-13T16:45:00Z' },
];

export const SUSPICIOUS_ACTIVITY = [];

/* ── Helpers ───────────────────────────────────────────── */

function verifierById(id) { return VERIFIERS.find(v => v.id === id); }
function citizenById(id) { return CITIZENS.find(c => c.id === id); }

function buildAuditForCitizen(citizenId) {
  return AUDIT_TRAIL
    .filter(e => e.citizen_id === citizenId)
    .map(e => {
      const v = verifierById(e.verifier_org_id) || {};
      return { ...e, verifier_organizations: { company_name: v.company_name, company_pan: v.company_pan, business_type: v.business_type } };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function buildKnowledgeGraph(citizenId) {
  const c = citizenById(citizenId);
  if (!c) return { nodes: [], edges: [] };
  const p = CITIZEN_PROFILES[citizenId] || {};
  const a = age(c.dob);
  const auditEntries = AUDIT_TRAIL.filter(e => e.citizen_id === citizenId);
  const lastAudit = auditEntries.length ? auditEntries.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp))[0].timestamp : 'Never';
  const nodes = [
    { id: 'identity', label: 'Core Identity', data: { name: c.name, national_id: c.national_id, dob: c.dob, age: a, gender: p.gender || 'N/A', photo_url: c.photo_url } },
    { id: 'kyc', label: 'KYC', data: { status: p.kyc_verified ? 'Verified' : 'Unverified', verified_date: p.kyc_verified_date, risk_level: p.kyc_risk_level || 'pending' } },
    { id: 'address', label: 'Address', data: { province: p.province, district: p.district, municipality: p.municipality, ward: p.ward } },
    { id: 'prescriptions', label: 'Prescriptions', data: { has_valid: p.has_valid_prescription || false, expiry: p.prescription_expiry, restricted_eligible: p.restricted_drug_eligible || false, doctor: p.doctor_authorization } },
    { id: 'vehicles', label: 'Vehicles', data: { license: p.license_number || 'None', registration: p.vehicle_registration || 'None' } },
    { id: 'audit', label: 'Access History', data: { total_accesses: auditEntries.length, last_access: lastAudit } },
  ];
  const edges = nodes.filter(n => n.id !== 'identity').map(n => ({ from: 'identity', to: n.id }));
  return { nodes, edges };
}

function buildVerifyResponse(citizenId, businessType) {
  const c = citizenById(citizenId);
  if (!c) return { verified: false, reason: 'Citizen not found' };
  const p = CITIZEN_PROFILES[citizenId] || {};
  const a = age(c.dob);
  const addr = `Ward ${p.ward || '—'}, ${p.municipality || '—'}, ${p.district || '—'}, ${p.province || '—'}`;

  if (businessType === 'bank') {
    const ok = p.kyc_verified;
    return { verified: true, business_type: 'bank', decision: ok ? 'approved' : 'denied', reason: ok ? 'KYC verified' : 'KYC not yet verified for this citizen', data: { full_name: c.name, dob: c.dob, age: a, national_id: c.national_id, address: addr, photo_url: c.photo_url, identity_verified: true, liveness_verified: true, kyc_status: ok ? 'verified' : 'unverified', kyc_risk_level: p.kyc_risk_level || 'pending', citizenship_number: p.citizenship_number || 'N/A' } };
  }
  if (businessType === 'pharmacy') {
    const rxValid = p.has_valid_prescription && new Date(p.prescription_expiry) > new Date();
    const ok = rxValid && p.restricted_drug_eligible;
    return { verified: true, business_type: 'pharmacy', decision: ok ? 'approved' : 'denied', reason: ok ? 'Valid prescription — drug dispensing authorised' : !rxValid ? 'Prescription invalid or expired' : 'Not eligible for restricted drugs', data: { full_name: c.name, age: a, prescription_status: rxValid ? 'valid' : 'invalid / expired', prescription_expiry: p.prescription_expiry, restricted_drug_eligible: p.restricted_drug_eligible || false, doctor_authorization: p.doctor_authorization, recent_drug_flag: false } };
  }
  return { verified: true, business_type: 'age_verification', decision: a >= 18 ? 'approved' : 'denied', reason: a >= 18 ? 'Age threshold met' : 'Under 18', data: { age_verified: true, over_18: a >= 18, over_21: a >= 21, liveness_verified: true } };
}

/* ═══════════════════════════════════════════════════════════
   Mock API  — same interface as fetch(), returns Promises
   ═══════════════════════════════════════════════════════════ */
const mock = {
  /* ── Citizen auth ─────────────────────── */
  citizenLogin(national_id, password) {
    const c = CITIZENS.find(u => u.national_id === national_id && u.password === password);
    if (!c) return Promise.reject(new Error('Invalid credentials'));
    return Promise.resolve({ token: `mock-citizen-${c.id}` });
  },

  citizenRegister(national_id, name, dob) {
    if (CITIZENS.find(c => c.national_id === national_id)) return Promise.reject(new Error('User already exists'));
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    CITIZENS.push({ id, national_id, name, dob, photo_url: 'https://via.placeholder.com/100', password: 'password' });
    CITIZEN_PROFILES[id] = {};
    return Promise.resolve({ message: 'User registered successfully' });
  },

  citizenFromToken(token) {
    const id = token.replace('mock-citizen-', '');
    const c = CITIZENS.find(u => u.id === id);
    if (!c) return Promise.reject(new Error('Invalid'));
    return Promise.resolve(c);
  },

  generateQrData(token) {
    const id = token.replace('mock-citizen-', '');
    const c = CITIZENS.find(u => u.id === id);
    if (!c) return Promise.reject(new Error('Invalid'));
    const ts = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).slice(2, 10);
    return Promise.resolve({ uid: c.national_id, timestamp: ts, nonce, token: `mock-hmac-${c.national_id}-${ts}` });
  },

  /* ── Citizen data ─────────────────────── */
  citizenProfile(token) {
    const id = token.replace('mock-citizen-', '');
    const c = citizenById(id);
    return Promise.resolve({ user: c, profile: CITIZEN_PROFILES[id] || {} });
  },

  citizenKnowledgeGraph(token) {
    const id = token.replace('mock-citizen-', '');
    return Promise.resolve(buildKnowledgeGraph(id));
  },

  citizenAuditTrail(token) {
    const id = token.replace('mock-citizen-', '');
    return Promise.resolve(buildAuditForCitizen(id));
  },

  /* ── Verifier auth ────────────────────── */
  verifierLogin(company_pan, password) {
    const v = VERIFIERS.find(o => o.company_pan === company_pan && o.password === password && o.status === 'approved');
    if (!v) return Promise.reject(new Error('Invalid PAN or credentials'));
    return Promise.resolve({ token: `mock-verifier-${v.id}`, business_type: v.business_type, company_name: v.company_name });
  },

  /* ── Verify (QR scan) ─────────────────── */
  verify(verifierToken, qrData) {
    const vid = verifierToken.replace('mock-verifier-', '');
    const v = verifierById(vid);
    if (!v) return Promise.resolve({ verified: false, reason: 'Invalid verifier' });

    // find citizen by national_id in QR
    const c = CITIZENS.find(u => u.national_id === qrData.uid);
    if (!c) {
      addAudit(null, v, 'denied', [], 'Citizen not found');
      return Promise.resolve({ verified: false, reason: 'Citizen not found' });
    }

    // check QR freshness (demo: 30s window)
    const now = Math.floor(Date.now() / 1000);
    if (now - qrData.timestamp > 30) {
      addAudit(c.id, v, 'denied', [], 'QR token expired');
      return Promise.resolve({ verified: false, reason: 'QR token expired' });
    }

    const result = buildVerifyResponse(c.id, v.business_type);
    const fields = POLICIES[v.business_type] || [];
    addAudit(c.id, v, result.decision, fields, result.reason);

    // brute-force check
    const window5m = AUDIT_TRAIL.filter(e => e.verifier_org_id === v.id && (Date.now() - new Date(e.timestamp).getTime()) < 5 * 60000);
    if (window5m.length >= 10) {
      window5m.forEach(e => { e.is_suspicious = true; });
      SUSPICIOUS_ACTIVITY.push({ id: Date.now(), verifier_org_id: v.id, activity_type: 'brute_force', description: `${window5m.length} attempts in 5 minutes`, request_count: window5m.length, time_window_minutes: 5, flagged_at: new Date().toISOString(), resolved: false });
      result.warning = 'Unusual verification volume detected — activity logged';
    }

    return Promise.resolve(result);
  },

  /* ── Verifier audit trail ─────────────── */
  verifierAuditTrail(verifierToken) {
    const vid = verifierToken.replace('mock-verifier-', '');
    const entries = AUDIT_TRAIL.filter(e => e.verifier_org_id === vid).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return Promise.resolve(entries);
  },

  /* ── Admin auth ───────────────────────── */
  adminLogin(username, password) {
    const a = ADMINS.find(u => u.username === username && u.password === password);
    if (!a) return Promise.reject(new Error('Invalid credentials'));
    return Promise.resolve({ token: `mock-admin-${a.id}`, role: a.role, department: a.department });
  },

  /* ── Admin dashboard ──────────────────── */
  adminDashboard() {
    const total = AUDIT_TRAIL.length;
    const denied = AUDIT_TRAIL.filter(e => e.decision === 'denied').length;
    const typeCounts = {};
    AUDIT_TRAIL.forEach(e => { typeCounts[e.business_type] = (typeCounts[e.business_type] || 0) + 1; });
    const recent = AUDIT_TRAIL.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20).map(e => {
      const v = verifierById(e.verifier_org_id) || {};
      return { ...e, verifier_organizations: { company_name: v.company_name, company_pan: v.company_pan } };
    });
    return Promise.resolve({ total_verifications: total, denied_count: denied, unresolved_suspicious: SUSPICIOUS_ACTIVITY.filter(s => !s.resolved).length, by_type: typeCounts, recent_activity: recent, suspicious_events: SUSPICIOUS_ACTIVITY.filter(s => !s.resolved) });
  },

  adminSearch(q) {
    const lower = q.toLowerCase();
    const results = CITIZENS.filter(c => c.name.toLowerCase().includes(lower) || c.national_id.includes(lower));
    return Promise.resolve(results);
  },

  adminCitizen(citizenId) {
    const c = citizenById(citizenId);
    return Promise.resolve({ user: c, profile: CITIZEN_PROFILES[citizenId] || {} });
  },

  adminCitizenGraph(citizenId) {
    return Promise.resolve(buildKnowledgeGraph(citizenId));
  },

  adminCitizenAudit(citizenId) {
    return Promise.resolve(buildAuditForCitizen(citizenId));
  },

  adminSuspiciousActivity() {
    const events = SUSPICIOUS_ACTIVITY.map(e => {
      const v = verifierById(e.verifier_org_id) || {};
      return { ...e, verifier_organizations: { company_name: v.company_name, company_pan: v.company_pan, business_type: v.business_type } };
    });
    return Promise.resolve(events);
  },

  adminPolicies() {
    return Promise.resolve(Object.entries(POLICIES).map(([bt, fields]) => ({ business_type: bt, allowed_fields: fields })));
  },

  adminVerifiers() {
    return Promise.resolve(VERIFIERS);
  },
};

function addAudit(citizenId, verifier, decision, fields, reason) {
  AUDIT_TRAIL.push({
    id: ++_auditId,
    citizen_id: citizenId,
    verifier_org_id: verifier.id,
    verifier_user: verifier.company_name,
    business_type: verifier.business_type,
    purpose: verifier.business_type === 'bank' ? 'KYC identity verification' : verifier.business_type === 'pharmacy' ? 'Restricted drug eligibility check' : 'Age verification',
    fields_accessed: fields,
    decision,
    reason,
    is_suspicious: false,
    timestamp: new Date().toISOString(),
  });
}

export default mock;
