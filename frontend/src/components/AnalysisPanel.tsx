import React, { useState, useEffect } from 'react';
import type { AnalysisResult } from '../App';

const LOADING_MSGS = [
  'Analyzing contract…',
  'Identifying key terms…',
  'Scanning for red flags…',
  'Assessing risk factors…',
  'Reviewing clauses…',
  'Checking standard practices…',
  'Cross-referencing obligations…',
  'Almost there…',
];

interface Props {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onReset: () => void;
}

export default function AnalysisPanel({ result, loading, error, onReset }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

  useEffect(() => {
    if (!loading) { setDisplayed(''); setMsgIdx(0); setPhase('typing'); return; }
    const msg = LOADING_MSGS[msgIdx];

    if (phase === 'typing') {
      if (displayed.length < msg.length) {
        const id = setTimeout(() => setDisplayed(msg.slice(0, displayed.length + 1)), 48);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase('deleting'), 1400);
      return () => clearTimeout(id);
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const id = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 28);
        return () => clearTimeout(id);
      }
      setMsgIdx(i => (i + 1) % LOADING_MSGS.length);
      setPhase('typing');
    }
  }, [loading, displayed, msgIdx, phase]);

  if (loading) {
    return (
      <div
        className="analysis-panel"
        style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}
      >
        <div className="spinner" />
        <p style={{ color: 'var(--text-2)', marginTop: 12, fontSize: 12 }}>
          {displayed}<span className="loading-cursor">|</span>
        </p>
      </div>
    );
  }

  if (error) {
    const message = error.replace(/^Analysis failed:\s*\d+:\s*/i, '');
    return (
      <div className="analysis-panel" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#ef4444" strokeWidth="2" fill="#fee2e2" />
            <path d="M24 14v14" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="33" r="1.5" fill="#ef4444" />
          </svg>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111' }}>{message}</p>
          <button className="btn-reset" style={{ marginTop: 4 }} onClick={onReset}>
            Upload new contract
          </button>
        </div>
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
                  { label: 'high',   color: '#ef4444', count: flags.filter(f => f.severity === 'high').length },
                  { label: 'medium', color: '#f59e0b', count: flags.filter(f => f.severity === 'medium').length },
                  { label: 'low',    color: '#22c55e', count: flags.filter(f => f.severity === 'low').length },
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
                    style={flagBadgeStyle(flag.severity)}
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

function flagBadgeStyle(severity: 'high' | 'medium' | 'low'): React.CSSProperties {
  if (severity === 'high')   return { background: '#fee2e2', color: '#991b1b' };
  if (severity === 'medium') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#dcfce7', color: '#166534' };
}

function pillStyle(level: 'high' | 'medium' | 'ok'): React.CSSProperties {
  if (level === 'high') return { background: '#fee2e2', color: '#991b1b' };
  if (level === 'medium') return { background: '#ffedd5', color: '#9a3412' };
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
          stroke={i < active ? lerpColor(i / N) : '#e5e7eb'}
          strokeWidth={sw}
          strokeLinecap="butt"
        />
      ))}
      <circle cx={indPt.x} cy={indPt.y} r={sw / 2 + 3} fill="white" stroke={indColor} strokeWidth={2.5} />
      <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="central" fontSize="52" fontWeight="700" fill="#1d1d1f" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {score}
      </text>
    </svg>
  );
}
