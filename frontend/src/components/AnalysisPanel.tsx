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
  const { risk_score, risk_verdict, contract_type, risk_categories, key_terms, flags, suggested_questions } = analysis;

  return (
    <div className="analysis-panel">

      {/* Risk Assessment */}
      <div className="analysis-section">
        <div className="section-title">Risk Assessment</div>
        <div className="risk-section-body">
          <div className="risk-ring-container">
            <RiskRing score={risk_score} />
            <span className="risk-verdict-label" style={{ color: scoreColor(risk_score) }}>
              {contract_type}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 10 }}>
              {risk_verdict}
            </div>
            <div className="risk-categories">
              {risk_categories.map((cat, i) => (
                <span key={i} className="risk-pill" style={pillStyle(cat.level)}>
                  {cat.label}
                </span>
              ))}
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

      {/* Suggested Questions */}
      {suggested_questions.length > 0 && (
        <div className="analysis-section">
          <div className="section-title">Questions to Ask</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggested_questions.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#0369a1',
                  lineHeight: 1.5,
                }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return '#dc2626';
  if (score >= 40) return '#d97706';
  return '#16a34a';
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

function RiskRing({ score }: { score: number }) {
  const r = 32;
  const cx = 40;
  const cy = 40;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="20" fontWeight="700">
        {score}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill={color} fontSize="10">
        /100
      </text>
    </svg>
  );
}
