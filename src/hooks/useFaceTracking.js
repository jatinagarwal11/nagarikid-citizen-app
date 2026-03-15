import { useState, useEffect, useRef, useCallback } from 'react';

/* ── constants ─────────────────────────────────────────────── */
const AW = 160;                // analysis canvas width
const AH = 120;                // analysis canvas height
const DETECT_MS = 120;         // ms between detection frames
const STABLE_MS = 800;         // ms of stable centering before "aligned"

/* ── canvas-based face-presence heuristic ──────────────────── */
function analyzeOvalRegion(ctx) {
  const cx = AW / 2, cy = AH / 2;
  const rx = AW * 0.28, ry = AH * 0.38;
  const x0 = Math.max(0, Math.floor(cx - rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const w  = Math.min(Math.floor(rx * 2), AW - x0);
  const h  = Math.min(Math.floor(ry * 2), AH - y0);

  const imgData = ctx.getImageData(x0, y0, w, h).data;
  const step = 16;             // sample every 4th pixel (RGBA stride = 4)
  let samples = 0, skinCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  for (let i = 0; i < imgData.length; i += step) {
    const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
    sumR += r; sumG += g; sumB += b;
    samples++;
    // Broad skin-tone check (inclusive across skin colours)
    if (r > 55 && g > 25 && b > 10 && r > b && Math.abs(r - g) < 90) {
      skinCount++;
    }
  }

  if (samples === 0) return { detected: false };

  const avgR = sumR / samples, avgG = sumG / samples, avgB = sumB / samples;
  let variance = 0;
  for (let i = 0; i < imgData.length; i += step) {
    const dr = imgData[i] - avgR, dg = imgData[i + 1] - avgG, db = imgData[i + 2] - avgB;
    variance += dr * dr + dg * dg + db * db;
  }
  variance /= samples;

  return {
    detected: variance > 400 && skinCount / samples > 0.12,
  };
}

/* ── hook ──────────────────────────────────────────────────── */
export const useFaceTracking = (stream, isActive) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignmentPrompt, setAlignmentPrompt] = useState('Position your face in the oval');

  const rafRef = useRef(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const detectorRef = useRef(null);
  const stableRef = useRef(0);
  const lastRef = useRef(0);

  const reset = useCallback(() => {
    setFaceDetected(false);
    setFaceAligned(false);
    stableRef.current = 0;
    setAlignmentPrompt('Position your face in the oval');
  }, []);

  useEffect(() => {
    if (!isActive || !stream) return;
    let alive = true;

    const boot = async () => {
      // hidden video element
      const vid = document.createElement('video');
      vid.playsInline = true;
      vid.muted = true;
      vid.srcObject = stream;
      await vid.play();
      videoRef.current = vid;

      // small analysis canvas
      const cvs = document.createElement('canvas');
      cvs.width = AW;
      cvs.height = AH;
      canvasRef.current = cvs;
      ctxRef.current = cvs.getContext('2d', { willReadFrequently: true });

      // try native FaceDetector (Chrome / Edge)
      if ('FaceDetector' in window) {
        try {
          detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        } catch (_) { /* not available */ }
      }

      /* ── per-frame loop ───────────────────────────────── */
      const tick = async (ts) => {
        if (!alive) return;

        if (ts - lastRef.current < DETECT_MS) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastRef.current = ts;

        const ctx = ctxRef.current;
        const v = videoRef.current;
        if (!ctx || !v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        ctx.drawImage(v, 0, 0, AW, AH);

        let found = false;
        let pos = null;

        /* strategy 1 – native FaceDetector */
        if (detectorRef.current) {
          try {
            const faces = await detectorRef.current.detect(canvasRef.current);
            if (faces && faces.length > 0) {
              const b = faces[0].boundingBox;
              found = true;
              pos = {
                x: (b.x + b.width / 2) / AW,
                y: (b.y + b.height / 2) / AH,
                w: b.width / AW,
              };
            }
          } catch (_) { /* ignore */ }
        }

        /* strategy 2 – canvas pixel heuristic (fallback) */
        if (!found) {
          const r = analyzeOvalRegion(ctx);
          if (r.detected) {
            found = true;
            pos = { x: 0.5, y: 0.5, w: 0.28 };
          }
        }

        if (!alive) return;

        if (found && pos) {
          setFaceDetected(true);

          const centered = Math.abs(pos.x - 0.5) < 0.18 && Math.abs(pos.y - 0.5) < 0.18;
          const sized = pos.w > 0.08 && pos.w < 0.55;

          if (centered && sized) {
            if (stableRef.current === 0) {
              stableRef.current = Date.now();
              setAlignmentPrompt('Hold still…');
            } else if (Date.now() - stableRef.current > STABLE_MS) {
              setFaceAligned(true);
              setAlignmentPrompt('Face aligned!');
            }
          } else {
            stableRef.current = 0;
            setFaceAligned(false);
            if (Math.abs(pos.x - 0.5) > Math.abs(pos.y - 0.5)) {
              setAlignmentPrompt(pos.x < 0.5 ? 'Move right' : 'Move left');
            } else {
              setAlignmentPrompt(pos.y < 0.5 ? 'Move down' : 'Move up');
            }
          }
        } else {
          setFaceDetected(false);
          setFaceAligned(false);
          stableRef.current = 0;
          setAlignmentPrompt('Position your face in the oval');
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    boot().catch((err) => {
      console.error('Face tracking init error:', err);
      if (alive) reset();
    });

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current = null; }
      detectorRef.current = null;
      canvasRef.current = null;
      ctxRef.current = null;
    };
  }, [isActive, stream, reset]);

  useEffect(() => { if (!isActive) reset(); }, [isActive, reset]);

  return { faceDetected, faceAligned, alignmentPrompt };
};