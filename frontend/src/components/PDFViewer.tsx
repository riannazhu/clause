import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL + '/pdf.worker.min.mjs';

const SCALE_STEP = 0.15;
const MIN_SCALE  = 0.5;
const MAX_SCALE  = 3.0;
const DEFAULT_SCALE = 0.9;

interface Props { url: string; filename: string; }

export default function PDFViewer({ url }: Props) {
  const [numPages, setNumPages]     = useState(0);
  const [scale, setScale]           = useState(DEFAULT_SCALE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput]   = useState('1');
  const [scaleInput, setScaleInput] = useState(String(Math.round(DEFAULT_SCALE * 100)));

  const pdfRef       = useRef<any>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const canvasesRef  = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderGenRef = useRef(0);
  const observerRef  = useRef<IntersectionObserver | null>(null);

  // Keep page input in sync with scroll-tracked page
  useEffect(() => { setPageInput(String(currentPage)); }, [currentPage]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        pdfRef.current?.destroy?.();
        pdfRef.current = null;
        setNumPages(0);
        setCurrentPage(1);
        setScale(DEFAULT_SCALE);
        if (wrapperRef.current) wrapperRef.current.scrollTop = 0;

        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [url]);

  // Render all pages whenever numPages or scale changes
  useEffect(() => {
    if (!numPages || !pdfRef.current) return;
    const gen = ++renderGenRef.current;

    async function renderAll() {
      for (let i = 0; i < numPages; i++) {
        if (gen !== renderGenRef.current) return;
        const canvas = canvasesRef.current[i];
        if (!canvas || !pdfRef.current) continue;
        try {
          const page     = await pdfRef.current.getPage(i + 1);
          if (gen !== renderGenRef.current) return;

          const dpr      = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale });
          const cssW     = Math.ceil(viewport.width);
          const cssH     = Math.ceil(viewport.height);

          canvas.width        = cssW * dpr;
          canvas.height       = cssH * dpr;
          canvas.style.width  = `${cssW}px`;
          canvas.style.height = `${cssH}px`;

          const ctx = canvas.getContext('2d')!;
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (e: any) {
          if (e?.name === 'RenderingCancelledException') return;
        }
      }
    }
    renderAll();
  }, [numPages, scale]);

  // IntersectionObserver: track which page is most visible
  useEffect(() => {
    if (!numPages || !wrapperRef.current) return;
    observerRef.current?.disconnect();

    const thresholds = Array.from({ length: 11 }, (_, i) => i * 0.1);
    const observer   = new IntersectionObserver((entries) => {
      let best = { ratio: 0, page: 1 };
      entries.forEach(entry => {
        if (entry.intersectionRatio > best.ratio) {
          best = {
            ratio: entry.intersectionRatio,
            page: parseInt((entry.target as HTMLElement).dataset.page || '1'),
          };
        }
      });
      if (best.ratio > 0) setCurrentPage(best.page);
    }, { root: wrapperRef.current, threshold: thresholds });

    canvasesRef.current.forEach(c => c && observer.observe(c));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [numPages]);

  // Keyboard: arrow keys scroll to prev/next page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        canvasesRef.current[Math.max(0, currentPage - 2)]
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        canvasesRef.current[Math.min(numPages - 1, currentPage)]
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, numPages]);

  // Keep scale input in sync when zoom buttons are used
  useEffect(() => { setScaleInput(String(Math.round(scale * 100))); }, [scale]);

  const zoomOut = () => setScale(s => parseFloat(Math.max(MIN_SCALE, s - SCALE_STEP).toFixed(2)));
  const zoomIn  = () => setScale(s => parseFloat(Math.min(MAX_SCALE, s + SCALE_STEP).toFixed(2)));

  const commitScaleInput = (val: string) => {
    const n = parseInt(val.replace('%', ''), 10);
    if (!isNaN(n) && n >= MIN_SCALE * 100 && n <= MAX_SCALE * 100) {
      setScale(parseFloat((n / 100).toFixed(2)));
    } else {
      setScaleInput(String(Math.round(scale * 100)));
    }
  };

  const commitPageInput = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) {
      canvasesRef.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-group">
          <div className="pdf-page-nav">
            <input
              className="pdf-page-input"
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={() => commitPageInput(pageInput)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  commitPageInput(pageInput);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <span className="pdf-page-sep">/</span>
            <span className="pdf-page-total">{numPages || '—'}</span>
          </div>
        </div>
<div className="pdf-toolbar-group">
          <button className="pdf-btn" onClick={zoomOut} disabled={scale <= MIN_SCALE}>−</button>
          <div className="pdf-scale-input-wrap">
            <input
              className="pdf-page-input pdf-scale-input"
              value={scaleInput}
              onChange={e => setScaleInput(e.target.value.replace('%', ''))}
              onFocus={e => e.target.select()}
              onBlur={() => commitScaleInput(scaleInput)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  commitScaleInput(scaleInput);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <span className="pdf-scale-pct">%</span>
          </div>
          <button className="pdf-btn" onClick={zoomIn}  disabled={scale >= MAX_SCALE}>+</button>
        </div>
      </div>

      <div ref={wrapperRef} className="pdf-canvas-wrapper">
        {Array.from({ length: numPages }, (_, i) => (
          <canvas
            key={i}
            ref={el => { canvasesRef.current[i] = el; }}
            data-page={String(i + 1)}
            className="pdf-canvas"
          />
        ))}
      </div>
    </div>
  );
}
