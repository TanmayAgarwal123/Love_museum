"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Download } from "./ui/icons";

const HEART_FILL = "#e8a0b4";
const HEART_EDGE = "#d9849c";
const MODULE = "#4a1630";

function heartPath(ctx: CanvasRenderingContext2D, S: number) {
  // Classic parametric heart, scaled to fill the canvas.
  const sx = S / 36;
  const cx = S / 2;
  const cy = S * 0.45;
  ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const px = cx + x * sx;
    const py = cy - y * sx;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Draws a real, scannable QR code (error correction H) inside a pink heart.
 * The heart frames the code rather than cutting into it, so the finder
 * patterns stay intact and phones read it reliably.
 */
export function drawHeartQR(canvas: HTMLCanvasElement, text: string, S: number) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = S;
  canvas.height = S;
  ctx.clearRect(0, 0, S, S);

  heartPath(ctx, S);
  ctx.fillStyle = HEART_FILL;
  ctx.fill();
  ctx.lineWidth = S * 0.012;
  ctx.strokeStyle = HEART_EDGE;
  ctx.stroke();

  // Largest square (centred on x) that fits fully inside the heart.
  const cx = S / 2;
  const inset = S * 0.012;
  const fits = (cy: number, h: number) =>
    [
      [cx - h - inset, cy - h - inset],
      [cx + h + inset, cy - h - inset],
      [cx - h - inset, cy + h + inset],
      [cx + h + inset, cy + h + inset],
      [cx, cy - h - inset], // the dip between the lobes
    ].every(([x, y]) => ctx.isPointInPath(x, y));
  let half = 0;
  let cy = S * 0.44;
  for (let c = 0.34; c <= 0.58; c += 0.005) {
    let lo = 0;
    let hi = S / 2;
    for (let k = 0; k < 20; k++) {
      const h = (lo + hi) / 2;
      if (fits(S * c, h)) lo = h;
      else hi = h;
    }
    if (lo > half) {
      half = lo;
      cy = S * c;
    }
  }

  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const quiet = 2;
  const cell = (half * 2) / (n + quiet * 2);
  const x0 = cx - half;
  const y0 = cy - half;

  ctx.fillStyle = "#ffffff";
  const r = cell * 1.6;
  ctx.beginPath();
  ctx.roundRect(x0, y0, half * 2, half * 2, r);
  ctx.fill();

  ctx.fillStyle = MODULE;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(
          Math.floor(x0 + (col + quiet) * cell),
          Math.floor(y0 + (row + quiet) * cell),
          Math.ceil(cell),
          Math.ceil(cell),
        );
      }
    }
  }
}

export function HeartQR({
  url,
  size = 220,
  showDownload = false,
  fileName = "museum-of-us-heart-qr.png",
  className = "",
}: {
  url: string;
  size?: number;
  showDownload?: boolean;
  fileName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current || !url) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    drawHeartQR(ref.current, url, Math.round(size * dpr));
    setReady(true);
  }, [url, size]);

  const download = () => {
    const c = document.createElement("canvas");
    drawHeartQR(c, url, 1200);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = fileName;
    a.click();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <canvas
        ref={ref}
        role="img"
        aria-label={`Heart-shaped QR code linking to ${url}`}
        style={{ width: size, height: size, opacity: ready ? 1 : 0, transition: "opacity 300ms" }}
      />
      {showDownload && (
        <button type="button" onClick={download} className="btn btn-quiet">
          <Download size={16} /> Download heart QR (PNG)
        </button>
      )}
    </div>
  );
}
