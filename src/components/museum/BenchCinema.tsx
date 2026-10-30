"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BENCH, SCREEN } from "@/lib/floorplan";
import { interact, media, sim, stepFilm, useMuseum } from "@/lib/store";
import type { MemoryVideo } from "@/lib/types";
import { DISPLAY_FONT, UI_FONT, canvasTexture } from "./canvasText";


export function BenchCinema({ videos }: { videos: MemoryVideo[] }) {
  const sitting = useMuseum((s) => s.sitting);
  const index = useMuseum((s) => s.videoIndex) % Math.max(videos.length, 1);
  const current = videos[index];
  const hasFiles = videos.some((v) => v.kind === "file");

  // One <video> element for the whole playlist; its source changes per film.
  const el = useMemo(() => {
    if (!hasFiles) return null;
    const v = document.createElement("video");
    v.playsInline = true;
    v.preload = "metadata";
    return v;
  }, [hasFiles]);

  const videoTex = useMemo(() => {
    if (!el) return null;
    const t = new THREE.VideoTexture(el);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [el]);

  const idleTex = useMemo(
    () =>
      canvasTexture(1240, 650, (ctx, w, h) => {
        ctx.fillStyle = "#16121a";
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.fillStyle = "#f6efe8";
        ctx.font = `400 84px ${DISPLAY_FONT}`;
        const title = videos.length > 1 ? `${videos.length} films for you` : videos[0]?.title || "Our memory film";
        ctx.fillText(title, w / 2, h / 2 - 10);
        ctx.fillStyle = "#e8a0b4";
        ctx.font = `500 34px ${UI_FONT}`;
        ctx.fillText(videos.length ? "Take a seat on the bench to watch" : "No film added yet", w / 2, h / 2 + 64);
      }),
    [videos],
  );

  // Register the element so HUD controls (play/pause/mute) can drive it.
  useEffect(() => {
    if (!el) return;
    media.video = el;
    const s = useMuseum.getState();
    const onPlay = () => s.set({ videoPlaying: true });
    const onPause = () => s.set({ videoPlaying: false });
    const onVol = () => s.set({ videoMuted: el.muted });
    // When a film ends, roll on to the next one (and loop back to the first).
    const onEnded = () => {
      if (videos.length > 1) stepFilm(1, videos.length);
      else el.play().catch(() => undefined);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVol);
    el.addEventListener("ended", onEnded);
    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVol);
      el.removeEventListener("ended", onEnded);
      if (media.video === el) media.video = null;
    };
  }, [el, videos.length]);

  // Load the current film, and play it while sitting.
  useEffect(() => {
    if (!el) return;
    if (!current || current.kind !== "file") {
      el.pause();
      return;
    }
    if (el.dataset.src !== current.src) {
      const sameOrigin = current.src.startsWith("/") || current.src.startsWith("blob:") || current.src.startsWith(location.origin);
      if (sameOrigin) el.removeAttribute("crossorigin");
      else el.crossOrigin = "anonymous";
      el.dataset.src = current.src;
      el.src = current.src;
      el.load();
    }
    if (sitting) {
      useMuseum.getState().set({ songPlaying: false });
      el.play().catch(() => {
        // Autoplay with sound refused: fall back to muted so the screen still plays.
        el.muted = true;
        el.play().catch(() => undefined);
      });
    } else el.pause();
  }, [sitting, el, current]);

  const showVideo = sitting && videoTex && current?.kind === "file";

  return (
    <group>
      {/* screen on the east wall */}
      <group position={[SCREEN.x, SCREEN.y, SCREEN.z]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[SCREEN.w + 0.24, SCREEN.h + 0.24, 0.06]} />
          <meshStandardMaterial color="#141016" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[SCREEN.w, SCREEN.h]} />
          <meshBasicMaterial map={showVideo ? videoTex : idleTex} toneMapped={false} />
        </mesh>
      </group>

      {/* bench */}
      <group
        position={[BENCH.x, 0, BENCH.z]}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const near = Math.hypot(sim.x - BENCH.x, sim.z - BENCH.z) < 2.6;
          if (near) interact({ id: "bench", kind: "bench", x: BENCH.x, z: BENCH.z, r: 2, label: "" });
          else sim.target = { x: BENCH.x - 1.1, z: BENCH.z };
        }}
      >
        <mesh position={[0, BENCH.seatH - 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[BENCH.w, 0.08, BENCH.l]} />
          <meshStandardMaterial color="#9a6b46" roughness={0.55} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, (BENCH.seatH - 0.08) / 2, s * (BENCH.l / 2 - 0.15)]}>
            <boxGeometry args={[BENCH.w - 0.06, BENCH.seatH - 0.08, 0.06]} />
            <meshStandardMaterial color="#2a2124" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
