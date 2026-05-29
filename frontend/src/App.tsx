import React, { useState, useCallback, useRef } from 'react';
import PDFViewer from './components/PDFViewer';
import AnalysisPanel from './components/AnalysisPanel';

export interface Analysis {
  contract_type: string;
  risk_score: number;
  risk_verdict: string;
  risk_categories: Array<{ label: string; level: 'high' | 'medium' | 'ok' }>;
  key_terms: Array<{ label: string; value: string }>;
  flags: Array<{
    severity: 'high' | 'medium' | 'low';
    title: string;
    issue: string;
    standard_practice: string;
    clause_text: string;
  }>;
  suggested_questions: string[];
}

export interface AnalysisResult {
  page_count: number;
  contract_text: string;
  analysis: Analysis;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#6366f1" />
      <path d="M8 7h7.5L20 11.5V21H8V7z" fill="white" fillOpacity="0.95" />
      <path d="M15.5 7v4.5H20" stroke="#6366f1" strokeWidth="1.2" fill="none" />
      <path d="M10 14.5h8M10 17.5h5.5" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    const url = URL.createObjectURL(f);
    setFile(f);
    setFileUrl(url);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed.');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  if (!file) {
    return (
      <div className="upload-page">
        <div className="upload-header">
          <div className="logo">
            <LogoIcon />
            <span className="logo-text">ContractScan</span>
          </div>
          <span className="logo-tagline">AI-powered contract analysis · Not legal advice</span>
        </div>

        <div
          className={`dropzone${dragging ? ' dropzone--active' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Upload PDF contract"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <div className="dropzone-prompt">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="#f3f4f6" />
              <path d="M14 13h11l7 7v11a1 1 0 01-1 1H14a1 1 0 01-1-1V14a1 1 0 011-1z" fill="#9ca3af" />
              <path d="M25 13v7h7" fill="none" stroke="#6b7280" strokeWidth="1.5" />
            </svg>
            <span className="dropzone-main-text">Drop your contract here</span>
            <span className="dropzone-sub-text">or click to browse</span>
            <span className="dropzone-hint">PDF · max 10 MB</span>
          </div>
        </div>

        {error && <div className="upload-error">{error}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div className="analysis-layout">
      <header className="topbar">
        <div className="topbar-logo">
          <LogoIcon />
          <div>
            <div className="topbar-name">ContractScan</div>
            <div className="topbar-tagline">AI-powered contract analysis · Not legal advice</div>
          </div>
        </div>
        <div className="topbar-right">
          {file && (
            <span className="filename-badge">
              {file.name} · {formatSize(file.size)}
            </span>
          )}
          <button className="btn-reset" onClick={reset}>New contract</button>
        </div>
      </header>

      <div className="split-layout">
        <div className="split-left">
          {fileUrl && <PDFViewer url={fileUrl} filename={file.name} />}
        </div>
        <div className="split-right">
          <AnalysisPanel result={result} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}
