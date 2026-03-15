const TYPE_LABELS = {
  bank: 'Bank / KYC',
  pharmacy: 'Pharmacy',
  age_verification: 'Age Check',
};

function AuditTrail({ entries, mode }) {
  if (!entries || !entries.length) {
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
            {entries.map((e, i) => {
              const org = e.verifier_organizations || {};
              const fields = Array.isArray(e.fields_accessed)
                ? e.fields_accessed
                : (() => { try { return JSON.parse(e.fields_accessed); } catch { return []; } })();
              return (
                <tr key={e.id || i} className={e.is_suspicious ? 'audit-suspicious' : ''}>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditTrail;
