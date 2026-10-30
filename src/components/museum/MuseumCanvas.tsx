"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WALL_H, buildInteractables, hangPhotos } from "@/lib/floorplan";
import { sim, useMuseum } from "@/lib/store";
import { SCENE_THEMES } from "@/lib/themes";
import { museumVideos, type Museum } from "@/lib/types";
import { BenchCinema } from "./BenchCinema";
import { DanceFloor } from "./DanceFloor";
import { FramedPhoto } from "./FramedPhoto";
import { GalleryRoom } from "./GalleryRoom";
import { LoveLetter } from "./LoveLetter";
import { PlayerController } from "./PlayerController";

const ROOM_LIGHTS: [number, number][] = [
  [0, 9],
  [0, 3.5],
  [0, -4],
  [0, -11.5],
  [0, -22],
  [0, -32],
  [0, -38.5],
];

function Lighting({ color, ambient }: { color: string; ambient: number }) {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  useFrame((_, dt) => {
    const s = useMuseum.getState();
    const k = Math.min(1, dt * 2);
    lights.current.forEach((l, i) => {
      if (!l) return;
      const z = ROOM_LIGHTS[i][1];
      let f = 1;
      if (s.sitting && z < -16 && z > -28) f = 0.08;
      else if (s.sitting) f = 0.4;
      if (s.dancing && z < -28) f = 0.3;
      l.intensity += (14 * f - l.intensity) * k;
    });
    const g = s.sitting ? 0.25 : s.dancing ? 0.55 : 1;
    if (amb.current) amb.current.intensity += (ambient * g - amb.current.intensity) * k;
    if (hemi.current) hemi.current.intensity += (0.7 * g - hemi.current.intensity) * k;
  });
  return (
    <>
      <ambientLight ref={amb} intensity={ambient} color={color} />
      <hemisphereLight ref={hemi} args={[color, "#c9b8aa", 0.7]} />
      {ROOM_LIGHTS.map(([x, z], i) => (
        <pointLight
          key={z}
          ref={(el) => {
            lights.current[i] = el;
          }}
          position={[x, WALL_H - 0.5, z]}
          intensity={14}
          distance={14}
          decay={1.3}
          color={color}
        />
      ))}
    </>
  );
}

/** Time-based FPS check: drop to low quality, then offer the 2D gallery if it's still slow. */
function FpsGuard() {
  const t0 = useRef<number | null>(null);
  const frames = useRef(0);
  const stage = useRef<"warmup" | "high" | "low" | "done">("warmup");
  useFrame(() => {
    const now = performance.now();
    if (t0.current === null) t0.current = now;
    frames.current++;
    const elapsed = now - t0.current;
    if (stage.current === "warmup" && elapsed > 2000) {
      stage.current = "high";
      t0.current = now;
      frames.current = 0;
    } else if ((stage.current === "high" || stage.current === "low") && elapsed > 3000) {
      const fps = (frames.current * 1000) / elapsed;
      const st = useMuseum.getState();
      if (fps < 24 && st.quality === "high") {
        st.set({ quality: "low" });
        stage.current = "low";
      } else if (fps < 20) {
        st.set({ slowWarning: true });
        stage.current = "done";
      } else stage.current = "done";
      t0.current = now;
      frames.current = 0;
    }
  });
  return null;
}

export default function MuseumCanvas({ museum }: { museum: Museum }) {
  const quality = useMuseum((s) => s.quality);
  const theme = SCENE_THEMES[museum.theme] ?? SCENE_THEMES.classic;
  const placed = useMemo(() => hangPhotos(museum.photos), [museum.photos]);
  const interactables = useMemo(() => buildInteractables(placed), [placed]);
  const films = useMemo(() => museumVideos(museum), [museum]);
  // Keep GPU memory in check: smaller textures on phones and in big museums.
  const maxTex = useMemo(() => {
    const phone = window.matchMedia("(pointer: coarse)").matches;
    if (placed.length > 20) return phone ? 768 : 1200;
    return phone ? 1024 : 1600;
  }, [placed.length]);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; touch: boolean } | null>(null);

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onPointerDown={(e) => {
        if (drag.current) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === "touch" };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        d.moved = true;
        d.x = e.clientX;
        d.y = e.clientY;
        const s = useMuseum.getState();
        if (s.focusedPhotoId || s.sitting || s.dancing || s.letterOpen) return;
        const sens = d.touch ? 0.0075 : 0.0045;
        sim.camYaw -= dx * sens;
        sim.camPitch = Math.max(-0.85, Math.min(0.45, sim.camPitch - dy * sens));
      }}
      onPointerUp={(e) => {
        if (drag.current?.id === e.pointerId) drag.current = null;
      }}
      onPointerCancel={() => (drag.current = null)}
    >
      <Canvas
        dpr={quality === "high" ? [1, 2] : [0.75, 1]}
        camera={{ fov: 55, near: 0.1, far: 80, position: [0, 2.8, 12.4] }}
        gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          scene.background = new THREE.Color(theme.sky);
        }}
        aria-label={`3D museum: ${museum.title}`}
      >
        <PerformanceMonitor
          onDecline={() => useMuseum.getState().set({ quality: "low", slowWarning: true })}
          flipflops={2}
        />
        <FpsGuard />
        <Lighting color={theme.light} ambient={theme.ambient} />
        <GalleryRoom museum={museum} theme={theme} quality={quality} />
        {placed.map((p) => (
          <FramedPhoto key={p.photo.id} placed={p} theme={theme} maxTex={maxTex} />
        ))}
        <BenchCinema videos={films} />
        <DanceFloor />
        <LoveLetter letter={museum.letter} partnerName={museum.partnerName} theme={theme} />
        <PlayerController museum={museum} placed={placed} interactables={interactables} />
      </Canvas>
    </div>
  );
}

