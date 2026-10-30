"use client";

import { useTexture } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import type { PlacedPhoto } from "@/lib/floorplan";
import { useMuseum } from "@/lib/store";
import type { SceneTheme } from "@/lib/themes";
import { DISPLAY_FONT, UI_FONT, canvasTexture, wrap } from "./canvasText";

const MAX_W = 1.7;
const MAX_H = 1.36;
const MAT = 0.12;
const BORDER = 0.06;

function fit(aspect: number): [number, number] {
  let w = MAX_W;
  let h = w / aspect;
  if (h > MAX_H) {
    h = MAX_H;
    w = h * aspect;
  }
  return [w, h];
}

function Picture({ src, onSize, maxTex }: { src: string; onSize: (a: number) => void; maxTex: number }) {
  const tex = useTexture(src, (t) => {
    const tx = Array.isArray(t) ? t[0] : t;
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    const img = tx.image as { width: number; height: number };
    if (img?.width) onSize(img.width / img.height);
  });
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  // Phone photos can be 4000px+; a dozen of those exhausts GPU memory on mobile.
  const map = useMemo(() => {
    if (!img?.width || Math.max(img.width, img.height) <= maxTex) return tex;
    const k = maxTex / Math.max(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    tex.dispose();
    return t;
  }, [tex, img, maxTex]);
  const [w, h] = fit(img?.width ? img.width / img.height : 4 / 3);
  return (
    <mesh position={[0, 0, 0.032]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} roughness={0.55} />
    </mesh>
  );
}

export function FramedPhoto({ placed, theme, maxTex = 1600 }: { placed: PlacedPhoto; theme: SceneTheme; maxTex?: number }) {
  const { photo, slot } = placed;
  const [aspect, setAspect] = useState(4 / 3);
  const [hover, setHover] = useState(false);
  const [w, h] = fit(aspect);
  const fw = w + MAT * 2;
  const fh = h + MAT * 2;

  const plaque = useMemo(
    () =>
      canvasTexture(640, 300, (ctx, W, H) => {
        ctx.fillStyle = "#fbf9f6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2a2124";
        ctx.font = `600 50px ${DISPLAY_FONT}`;
        ctx.fillText(wrap(ctx, photo.title || "Untitled", W - 64, 1)[0], 32, 72);
        ctx.fillStyle = "#8c6a2f";
        ctx.font = `600 28px ${UI_FONT}`;
        ctx.fillText(photo.date || "", 32, 118);
        ctx.fillStyle = "#4a3d41";
        ctx.font = `400 27px ${UI_FONT}`;
        wrap(ctx, photo.caption || "", W - 64, 4).forEach((l, i) => ctx.fillText(l, 32, 166 + i * 34));
      }),
    [photo.title, photo.date, photo.caption],
  );

  const select = () => useMuseum.getState().set({ focusedPhotoId: photo.id });

  return (
    <group position={[slot.x, slot.y, slot.z]} rotation-y={slot.rotY}>
      <group
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          select();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        {/* frame */}
        <mesh castShadow>
          <boxGeometry args={[fw + BORDER * 2, fh + BORDER * 2, 0.05]} />
          <meshStandardMaterial color={theme.frame} metalness={0.65} roughness={0.32} emissive={hover ? "#5a4320" : "#000000"} />
        </mesh>
        {/* mat */}
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[fw, fh]} />
          <meshStandardMaterial color="#fdfcf9" roughness={0.95} />
        </mesh>
        {photo.src && (
          <Suspense
            fallback={
              <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[w, h]} />
                <meshStandardMaterial color="#e9e2d8" />
              </mesh>
            }
          >
            <Picture src={photo.src} onSize={setAspect} maxTex={maxTex} />
          </Suspense>
        )}
      </group>
      {/* picture light */}
      <mesh position={[0, fh / 2 + BORDER + 0.16, 0.12]}>
        <boxGeometry args={[Math.min(0.9, fw * 0.55), 0.04, 0.05]} />
        <meshStandardMaterial color="#2a2124" emissive={theme.light} emissiveIntensity={0.6} />
      </mesh>
      {/* plaque */}
      <mesh position={[0, -fh / 2 - BORDER - 0.27, 0.01]}>
        <planeGeometry args={[0.64, 0.3]} />
        <meshBasicMaterial map={plaque} toneMapped={false} />
      </mesh>
    </group>
  );
}
