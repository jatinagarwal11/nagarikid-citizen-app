import { useState } from 'react';

const COLORS = {
  identity: '#171717',
  kyc: '#2563eb',
  address: '#059669',
  prescriptions: '#d97706',
  vehicles: '#7c3aed',
  audit: '#dc2626',
};

const LABELS = {
  identity: 'Identity',
  kyc: 'KYC',
  address: 'Address',
  prescriptions: '💊',
  vehicles: 'Vehicles',
  audit: 'Audit',
};

const CX = 200;
const CY = 180;
const R = 120;

function nodePositions(nodes) {
  const satellites = nodes.filter(n => n.id !== 'identity');
  const step = (2 * Math.PI) / satellites.length;
  const positions = { identity: { x: CX, y: CY } };
  satellites.forEach((n, i) => {
    const angle = -Math.PI / 2 + i * step;
    positions[n.id] = {
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    };
  });
  return positions;
}

function KnowledgeGraph({ data }) {
  const [selected, setSelected] = useState(null);

  if (!data || !data.nodes) {
    return <p className="kg-empty">No knowledge graph data available.</p>;
  }

  const pos = nodePositions(data.nodes);
  const selectedNode = data.nodes.find(n => n.id === selected);

  return (
    <div className="kg-container">
      <svg viewBox="0 0 400 360" className="kg-svg">
        {/* edges */}
        {(data.edges || []).map(e => (
          <line
            key={`${e.from}-${e.to}`}
            x1={pos[e.from].x} y1={pos[e.from].y}
            x2={pos[e.to].x} y2={pos[e.to].y}
            stroke="var(--border)"
            strokeWidth="1.5"
          />
        ))}
        {/* nodes */}
        {data.nodes.map(n => {
          const p = pos[n.id];
          const isCenter = n.id === 'identity';
          const r = isCenter ? 32 : 24;
          const isActive = selected === n.id;
          return (
            <g key={n.id} onClick={() => setSelected(isActive ? null : n.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={p.x} cy={p.y} r={r}
                fill={isActive ? COLORS[n.id] : 'var(--background)'}
                stroke={COLORS[n.id]}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <text
                x={p.x} y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? '#fff' : COLORS[n.id]}
                fontSize={isCenter ? 11 : 9}
                fontWeight={600}
                fontFamily="inherit"
              >
                {LABELS[n.id] || n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedNode && (
        <div className="kg-detail">
          <h4>{selectedNode.label}</h4>
          <dl>
            {Object.entries(selectedNode.data || {}).map(([k, v]) => (
              <div key={k} className="kg-detail-row">
                <dt>{k.replace(/_/g, ' ')}</dt>
                <dd>{v === true ? 'Yes' : v === false ? 'No' : v == null ? '—' : String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraph;
