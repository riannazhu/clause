import React from 'react';
import type { AnalysisResult } from '../App';

interface Props {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export default function AnalysisPanel({ result, loading, error }: Props) {
  if (loading) {
    return (
      <div
        className="analysis-panel"
        style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}
      >
        <div className="spinner" />
        <p style={{ color: '#6b7280', marginTop: 12 }}>Analyzing contract…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-panel">
        <div className="upload-error">{error}</div>
      </div>
    );
  }

  if (!result) return null;

  const { analysis } = result;
  const { risk_score, key_terms, flags } = analysis;
  const trust_score = 100 - risk_score;

  return (
    <div className="analysis-panel">

      {/* Trust Score */}
      <div className="analysis-section">
        <div className="section-title">Trust Score</div>
        <div className="trust-card">
          <div className="trust-body-row">
            <div className="trust-gauge-wrap">
              <TrustGauge score={trust_score} />
            </div>
            <div className="trust-details">
              <div className="trust-verdict" style={{ color: lerpColor(trust_score / 100) }}>
                {trust_score >= 70 ? 'Low Risk' : trust_score >= 40 ? 'Moderate Risk' : 'High Risk'}
              </div>
              <div className="trust-flag-count">
                {flags.length} flag{flags.length !== 1 ? 's' : ''} found
              </div>
              <div className="trust-severity-rows">
                {([
                  { label: 'high', color: '#ef4444', count: flags.filter(f => f.severity === 'high').length },
                  { label: 'medium', color: '#f59e0b', count: flags.filter(f => f.severity === 'medium').length },
                  { label: 'low', color: '#22c55e', count: flags.filter(f => f.severity === 'low').length },
                ] as const).map(({ label, color, count }) => (
                  <div key={label} className="trust-sev-item">
                    <span className="trust-sev-dot" style={{ background: color }} />
                    <span className="trust-sev-text">{count} {label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Terms */}
      <div className="analysis-section">
        <div className="section-title">Key Terms</div>
        <div className="key-terms-grid">
          {key_terms.map((t, i) => (
            <div key={i} className="key-term-card">
              <span className="key-term-label">{t.label}</span>
              <span className="key-term-value">{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="analysis-section">
        <div className="section-title">Flags</div>
        {flags.length === 0 ? (
          <p className="no-flags">No significant issues found.</p>
        ) : (
          <div className="flags-list">
            {flags.map((flag, i) => (
              <div
                key={i}
                className="flag-card"
                style={{ borderLeftColor: severityColor(flag.severity) }}
              >
                <div className="flag-header">
                  <span
                    className="flag-badge"
                    style={{ background: severityColor(flag.severity) }}
                  >
                    {flag.severity}
                  </span>
                  <span className="flag-title">{flag.title}</span>
                </div>
                <p className="flag-issue">{flag.issue}</p>
                <p className="flag-standard">
                  <strong style={{ color: '#374151' }}>Standard practice: </strong>
                  {flag.standard_practice}
                </p>
                {flag.clause_text && (
                  <p className="flag-clause">"{flag.clause_text}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function severityColor(severity: 'high' | 'medium' | 'low'): string {
  if (severity === 'high') return '#ef4444';
  if (severity === 'medium') return '#f59e0b';
  return '#22c55e';
}

function pillStyle(level: 'high' | 'medium' | 'ok'): React.CSSProperties {
  if (level === 'high') return { background: '#fee2e2', color: '#991b1b' };
  if (level === 'medium') return { background: '#fef9c3', color: '#92400e' };
  return { background: '#dcfce7', color: '#166534' };
}

function lerpColor(t: number): string {
  const stops: [number, number, number][] = [
    [220, 38, 38],
    [234, 88, 12],
    [202, 138, 4],
    [22, 163, 74],
  ];
  const pos = Math.min(t, 0.9999) * (stops.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`;
}

function TrustGauge({ score }: { score: number }) {
  const cx = 100, cy = 100, r = 76, sw = 16;
  const START = 150, SWEEP = 240, N = 60;

  function pt(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function segPath(i: number) {
    const a1 = START + (i / N) * SWEEP;
    const a2 = START + ((i + 1) / N) * SWEEP + 0.5;
    const p1 = pt(a1), p2 = pt(a2);
    return `M${p1.x.toFixed(2)},${p1.y.toFixed(2)} A${r},${r} 0 0 1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const active = Math.round((score / 100) * N);
  const indDeg = START + (score / 100) * SWEEP;
  const indPt = pt(indDeg);
  const indColor = lerpColor(score / 100);
  return (
    <svg viewBox="0 0 200 160" width="100%" aria-label={`Trust score: ${score}`}>
      {Array.from({ length: N }, (_, i) => (
        <path
          key={i}
          d={segPath(i)}
          fill="none"
          stroke={i < active ? lerpColor(i / N) : '#eaecef'}
          strokeWidth={sw}
          strokeLinecap="butt"
        />
      ))}
      <circle cx={indPt.x} cy={indPt.y} r={sw / 2 + 3} fill="white" stroke={indColor} strokeWidth={2.5} />
      <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central" fontSize="52" fontWeight="800" fill="#111827" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
        {score}
      </text>
    </svg>
  );
}
