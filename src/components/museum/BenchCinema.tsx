"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BENCH, SCREEN } from "@/lib/floorplan";
import { interact, media, sim, useMuseum } from "@/lib/store";
import type { MemoryVideo } from "@/lib/types";
import { DISPLAY_FONT, UI_FONT, canvasTexture } from "./canvasText";

export function BenchCinema({ video }: { video?: MemoryVideo }) {
  const sitting = useMuseum((s) => s.sitting);
  const isFile = video?.kind === "file" && !!video.src;

  const el = useMemo(() => {
    if (!isFile || !video) return null;
    const v = document.createElement("video");
    const sameOrigin = video.src.startsWith("/") || video.src.startsWith("blob:") || video.src.startsWith(location.origin);
    if (!sameOrigin) v.crossOrigin = "anonymous";
    v.src = video.src;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    return v;
  }, [isFile, video]);

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
        ctx.fillText(video?.title || "Our memory film", w / 2, h / 2 - 10);
        ctx.fillStyle = "#e8a0b4";
        ctx.font = `500 34px ${UI_FONT}`;
        ctx.fillText(video ? "Take a seat on the bench to watch" : "No film added yet", w / 2, h / 2 + 64);
      }),
    [video],
  );

  // Register the element so HUD controls (play/pause/mute) can drive it.
  useEffect(() => {
    if (!el) return;
    media.video = el;
    const s = useMuseum.getState();
    const onPlay = () => s.set({ videoPlaying: true });
    const onPause = () => s.set({ videoPlaying: false });
    const onVol = () => s.set({ videoMuted: el.muted });
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVol);
    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVol);
      if (media.video === el) media.video = null;
    };
  }, [el]);

  useEffect(() => {
    if (!el) return;
    if (sitting) {
      useMuseum.getState().set({ songPlaying: false });
      el.play().catch(() => {
        // Autoplay with sound refused: fall back to muted so the screen still plays.
        el.muted = true;
        el.play().catch(() => undefined);
      });
    } else el.pause();
  }, [sitting, el]);

  const showVideo = sitting && videoTex;

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
