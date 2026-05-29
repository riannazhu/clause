import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL + '/pdf.worker.min.mjs';

const SCALE_STEP = 0.15;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const DEFAULT_SCALE = 1.2;

interface Props {
  url: string;
  filename: string;
}

export default function PDFViewer({ url, filename }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [rendering, setRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const prevUrlRef = useRef('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeCanvas = canvas as HTMLCanvasElement;
    let cancelled = false;

    async function go() {
      setRendering(true);
      try {
        if (url !== prevUrlRef.current) {
          pdfRef.current?.destroy?.();
          pdfRef.current = null;
          prevUrlRef.current = url;
          setPage(1);
          setScale(DEFAULT_SCALE);
          setNumPages(0);
        }

        if (!pdfRef.current) {
          const pdf = await pdfjsLib.getDocument(url).promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
        }

        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch {}
        }

        const safePage = Math.min(page, pdfRef.current.numPages || 1);
        const p = await pdfRef.current.getPage(safePage);
        if (cancelled) return;

        const viewport = p.getViewport({ scale });
        const ctx = safeCanvas.getContext('2d')!;
        safeCanvas.height = viewport.height;
        safeCanvas.width = viewport.width;

        const task = p.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (e: any) {
        if (!cancelled && e?.name !== 'RenderingCancelledException') setRendering(false);
      }
    }

    go();
    return () => { cancelled = true; };
  }, [url, page, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = () => setPage(p => Math.max(1, p - 1));
  const next = () => setPage(p => Math.min(numPages, p + 1));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, parseFloat((s - SCALE_STEP).toFixed(2))));
  const zoomIn = () => setScale(s => Math.min(MAX_SCALE, parseFloat((s + SCALE_STEP).toFixed(2))));

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button className="pdf-btn" onClick={prev} disabled={page <= 1}>‹</button>
        <span className="pdf-page-info">{page} / {numPages || '…'}</span>
        <button className="pdf-btn" onClick={next} disabled={page >= numPages}>›</button>

        <div className="pdf-toolbar-spacer" />

        <button className="pdf-btn" onClick={zoomOut} disabled={scale <= MIN_SCALE}>−</button>
        <span className="pdf-scale-label">{Math.round(scale * 100)}%</span>
        <button className="pdf-btn" onClick={zoomIn} disabled={scale >= MAX_SCALE}>+</button>

        <div className="pdf-toolbar-spacer" />

        <a href={url} download={filename} className="pdf-btn pdf-download" title="Download PDF">↓</a>
      </div>

      <div className="pdf-canvas-wrapper">
        <canvas ref={canvasRef} className="pdf-canvas" />
        {rendering && (
          <div className="pdf-rendering-overlay">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
}
