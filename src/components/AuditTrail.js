import { useState } from 'react';

const TYPE_LABELS = {
  bank: 'Bank / KYC',
  pharmacy: 'Pharmacy',
  age_verification: 'Age Check',
};

/* Simulated suspicious entries for demo — prescription shopping pattern */
const SUSPICIOUS_ENTRIES = [
  {
    id: 'sim-suspicious-001',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    verifier_user: 'PAN002',
    verifier_organizations: { company_name: 'Himalayan Pharma', company_pan: 'PAN002' },
    business_type: 'pharmacy',
    purpose: 'Restricted drug purchase — Ritalin (Methylphenidate)',
    fields_accessed: ['prescription_status', 'allowed_drugs', 'recent_drug_purchase_date'],
    decision: 'approved',
    is_suspicious: true,
    _sim_note: 'SIMULATED: This is the first of two pharmacy visits within a short time frame. The citizen purchased Schedule II controlled substance Ritalin (Methylphenidate) from Himalayan Pharma. By itself this transaction is valid, but when combined with the subsequent visit to Manakamana Pharmacy 3 hours later, it forms a prescription shopping pattern that would trigger an automated flag.',
  },
  {
    id: 'sim-suspicious-002',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    verifier_user: 'PAN002',
    verifier_organizations: { company_name: 'Manakamana Pharmacy', company_pan: 'PAN002' },
    business_type: 'pharmacy',
    purpose: 'Restricted drug purchase — Ritalin (Methylphenidate)',
    fields_accessed: ['prescription_status', 'allowed_drugs', 'recent_drug_purchase_date'],
    decision: 'approved',
    is_suspicious: true,
    _sim_note: 'SIMULATED: Same citizen requested Schedule II restricted drugs (Ritalin) at a second pharmacy (Manakamana Pharmacy) only 3 hours after purchasing from Himalayan Pharma. This pattern is consistent with prescription shopping or drug diversion. In a production system, this would trigger an automated flag for the National Drug Regulatory Authority and block the transaction pending manual review.',
  },
];

function AuditTrail({ entries, mode }) {
  const [expandedId, setExpandedId] = useState(null);

  /* Always inject simulated suspicious entries at the top */
  const realEntries = Array.isArray(entries) ? entries : [];
  const allEntries = [...SUSPICIOUS_ENTRIES, ...realEntries];
  if (!allEntries || !allEntries.length) {
    return <p className="audit-empty">No access events recorded yet.</p>;
  }

  const isAdmin = mode === 'admin';

  return (
    <div className="audit-container">
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Organisation</th>
              {isAdmin && <th>PAN</th>}
              <th>Type</th>
              <th>Purpose</th>
              <th>Fields Accessed</th>
              <th>Decision</th>
              {isAdmin && <th>Flagged</th>}
            </tr>
          </thead>
          <tbody>
            {allEntries.map((e, i) => {
              const org = e.verifier_organizations || {};
              const fields = Array.isArray(e.fields_accessed)
                ? e.fields_accessed
                : (() => { try { return JSON.parse(e.fields_accessed); } catch { return []; } })();
              const isExpanded = expandedId === (e.id || i);
              return (
                <>
                  <tr
                    key={e.id || i}
                    className={`${e.is_suspicious ? 'audit-suspicious' : ''} ${e._sim_note ? 'audit-clickable' : ''}`}
                    onClick={() => e._sim_note && setExpandedId(isExpanded ? null : (e.id || i))}
                  >
                    <td className="audit-ts">{new Date(e.timestamp).toLocaleString()}</td>
                    <td>{org.company_name || e.verifier_user || '—'}</td>
                    {isAdmin && <td className="audit-pan">{org.company_pan || '—'}</td>}
                    <td>
                      <span className={`audit-type-badge audit-type-${e.business_type}`}>
                        {TYPE_LABELS[e.business_type] || e.business_type}
                      </span>
                    </td>
                    <td>{e.purpose}</td>
                    <td className="audit-fields">
                      {fields.map((f, j) => (
                        <span key={j} className="audit-field-tag">{f.replace(/_/g, ' ')}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`audit-decision ${e.decision}`}>
                        {e.decision === 'approved' ? '✓ Approved' : '✗ Denied'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        {e.is_suspicious
                          ? <span className="audit-flag">⚠</span>
                          : '—'}
                      </td>
                    )}
                  </tr>
                  {isExpanded && e._sim_note && (
                    <tr key={`${e.id || i}-detail`} className="audit-detail-row">
                      <td colSpan={isAdmin ? 8 : 7}>
                        <div className="audit-detail-box">
                          <span className="audit-detail-badge">⚠ Suspicious Activity — Simulated</span>
                          <p>{e._sim_note}</p>
                          <p className="audit-detail-disclaimer">This entry is simulated for demonstration purposes. In a real system, this would be investigated by the relevant authorities.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditTrail;
