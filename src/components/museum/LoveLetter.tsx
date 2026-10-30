"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { LETTER_FRAME, PEDESTAL } from "@/lib/floorplan";
import { prefersReducedMotion } from "@/lib/media";
import { sim, useMuseum } from "@/lib/store";
import type { SceneTheme } from "@/lib/themes";
import { DISPLAY_FONT, canvasTexture, wrap } from "./canvasText";

export function LoveLetter({ letter, partnerName, theme }: { letter: string; partnerName: string; theme: SceneTheme }) {
  const envelope = useRef<THREE.Group>(null);

  const paper = useMemo(
    () =>
      canvasTexture(768, 1000, (ctx, w, h) => {
        ctx.fillStyle = "#fdf9f3";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#2a2124";
        ctx.font = `italic 400 34px ${DISPLAY_FONT}`;
        const lines = wrap(ctx, letter, w - 120, 22);
        lines.forEach((l, i) => ctx.fillText(l, 60, 100 + i * 46));
        ctx.fillStyle = "#e8a0b4";
        ctx.beginPath();
        ctx.arc(w - 80, h - 80, 26, 0, Math.PI * 2);
        ctx.fill();
      }),
    [letter],
  );

  const plaque = useMemo(
    () =>
      canvasTexture(640, 140, (ctx, w, h) => {
        ctx.fillStyle = "#fbf9f6";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#2a2124";
        ctx.textAlign = "center";
        ctx.font = `400 54px ${DISPLAY_FONT}`;
        ctx.fillText(`A letter for ${partnerName}`, w / 2, h * 0.64);
      }),
    [partnerName],
  );

  useFrame((state) => {
    const e = envelope.current;
    if (!e || prefersReducedMotion()) return;
    const t = state.clock.elapsedTime;
    e.position.y = PEDESTAL.h + 0.18 + Math.sin(t * 1.6) * 0.04;
    e.rotation.y = Math.sin(t * 0.5) * 0.35;
  });

  const open = (e: { delta: number; stopPropagation: () => void }) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    if (Math.hypot(sim.x - PEDESTAL.x, sim.z - PEDESTAL.z) < 3.2) useMuseum.getState().set({ letterOpen: true });
    else sim.target = { x: PEDESTAL.x, z: PEDESTAL.z + 1.1 };
  };

  return (
    <group>
      {/* framed letter on the north wall */}
      <group position={[LETTER_FRAME.x, LETTER_FRAME.y, LETTER_FRAME.z]} onClick={open}>
        <mesh>
          <boxGeometry args={[LETTER_FRAME.w + 0.14, LETTER_FRAME.h + 0.14, 0.05]} />
          <meshStandardMaterial color={theme.frame} metalness={0.65} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[LETTER_FRAME.w, LETTER_FRAME.h]} />
          <meshStandardMaterial map={paper} roughness={0.9} />
        </mesh>
        <mesh position={[0, -LETTER_FRAME.h / 2 - 0.32, 0.0]}>
          <planeGeometry args={[1.1, 0.24]} />
          <meshBasicMaterial map={plaque} toneMapped={false} />
        </mesh>
      </group>

      {/* pedestal with a floating envelope */}
      <group position={[PEDESTAL.x, 0, PEDESTAL.z]} onClick={open}>
        <mesh position={[0, PEDESTAL.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[PEDESTAL.size, PEDESTAL.h, PEDESTAL.size]} />
          <meshStandardMaterial color="#f7f4ef" roughness={0.6} />
        </mesh>
        <mesh position={[0, PEDESTAL.h + 0.01, 0]}>
          <boxGeometry args={[PEDESTAL.size + 0.04, 0.02, PEDESTAL.size + 0.04]} />
          <meshStandardMaterial color={theme.frame} metalness={0.6} roughness={0.35} />
        </mesh>
        <group ref={envelope} position={[0, PEDESTAL.h + 0.18, 0]}>
          <mesh rotation-x={-0.25}>
            <boxGeometry args={[0.36, 0.24, 0.02]} />
            <meshStandardMaterial color="#f6dfe5" roughness={0.7} />
          </mesh>
          <mesh rotation-x={-0.25} position={[0, 0.02, 0.012]} rotation-z={Math.PI / 4} scale={[1, 1, 1]}>
            <planeGeometry args={[0.17, 0.17]} />
            <meshStandardMaterial color="#efc8d3" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation-x={-0.25} position={[0, -0.01, 0.024]}>
            <circleGeometry args={[0.035, 20]} />
            <meshStandardMaterial color="#a8436a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
