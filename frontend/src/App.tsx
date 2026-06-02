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
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="15" cy="15" r="15" fill="url(#lg)" />
      {/* Geometric 'c' — radius 6, gap 70° centred on the right */}
      <path
        d="M19.3 11.4 A6 6 0 1 0 19.3 18.6"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
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
        <div className="upload-blob upload-blob--1" aria-hidden="true" />
        <div className="upload-blob upload-blob--2" aria-hidden="true" />
        <div className="upload-blob upload-blob--3" aria-hidden="true" />
        <div className="upload-hero">
          <div className="upload-wordmark">
            <LogoIcon />
            <span className="upload-brand-name">clause</span>
          </div>
          <h1 className="upload-headline">From legalese to legal ease.</h1>
          <p className="upload-tagline">AI-powered contract review · Not legal advice</p>
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
            <div className="dropzone-icon-bg">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 17V7M13 7L8 12M13 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="dropzone-text-group">
              <span className="dropzone-main-text">Drop your contract here</span>
              <span className="dropzone-sub-text">or <span className="dropzone-link">click to browse</span></span>
            </div>
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
          <div className="topbar-name">clause</div>
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
