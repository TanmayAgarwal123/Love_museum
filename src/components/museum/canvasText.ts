import * as THREE from "three";

export const DISPLAY_FONT = '"Playfair Display", Georgia, serif';
export const UI_FONT = '"Inter Variable", Inter, system-ui, sans-serif';

/** Draw onto an offscreen canvas and wrap it as a texture (used for plaques, signs, letters). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Word-wrap text into at most `maxLines` lines, adding an ellipsis if it overflows. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = Infinity) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    cut[maxLines - 1] = `${last.trimEnd()}…`;
    return cut;
  }
  return out;
}
