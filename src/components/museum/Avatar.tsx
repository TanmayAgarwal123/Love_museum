"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AvatarLook } from "@/lib/types";
import { UI_FONT, canvasTexture } from "./canvasText";

export type AvatarMode = "walk" | "sit" | "dance";
export interface AvatarPose {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  mode: AvatarMode;
  /** -1 = partner is on my left, 1 = on my right (for hand holding) */
  side: number;
  phase: number; // offset so the two don't move in lockstep
}

const SKIN = "#f0c6a6";
const TROUSERS = "#3b3442";
const HIP_Y = 0.8;
const SEAT_Y = 0.48;

/**
 * A charming capsule-style figure. Model faces -z; rotation.y = yaw.
 * All animation is procedural: walk cycle, idle breathing, sitting, dancing.
 */
export function Avatar({
  look,
  hair,
  getPose,
  hidden = false,
}: {
  look: AvatarLook;
  hair: "short" | "bun";
  getPose: () => AvatarPose;
  hidden?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const walkPhase = useRef(0);

  const label = useMemo(
    () =>
      canvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = "#fbf9f6";
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = look.shirt;
        ctx.stroke();
        ctx.fillStyle = "#2a2124";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${look.initials.length > 1 ? 46 : 60}px ${UI_FONT}`;
        ctx.fillText(look.initials.slice(0, 2).toUpperCase(), w / 2, h / 2 + 3);
      }),
    [look.initials, look.shirt],
  );

  useFrame((state, dt) => {
    const p = getPose();
    const g = root.current;
    if (!g || !body.current) return;
    const t = state.clock.elapsedTime + p.phase;
    g.position.set(p.x, 0, p.z);
    // shortest-path yaw smoothing
    let d = p.yaw - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 10);

    const k = Math.min(1, dt * 12);
    const lerp = (obj: THREE.Object3D | null, axis: "x" | "y" | "z", v: number) => {
      if (obj) obj.rotation[axis] += (v - obj.rotation[axis]) * k;
    };

    if (p.mode === "sit") {
      body.current.position.y += (SEAT_Y - HIP_Y - body.current.position.y) * k;
      body.current.rotation.z += (0 - body.current.rotation.z) * k;
      lerp(legL.current, "x", Math.PI / 2);
      lerp(legR.current, "x", Math.PI / 2);
      // inner hand reaches for the partner's
      const inner = p.side > 0 ? armR.current : armL.current;
      const outer = p.side > 0 ? armL.current : armR.current;
      lerp(inner, "x", 0.55);
      lerp(inner, "z", p.side * 0.62);
      lerp(outer, "x", 0.7);
      lerp(outer, "z", 0);
      lerp(head.current, "y", p.side * 0.12 + Math.sin(t * 0.6) * 0.05);
    } else if (p.mode === "dance") {
      const beat = t * 4.4;
      body.current.position.y += (Math.abs(Math.sin(beat)) * 0.07 - body.current.position.y) * k;
      body.current.rotation.z = Math.sin(beat / 2) * 0.12;
      lerp(legL.current, "x", Math.sin(beat) * 0.35);
      lerp(legR.current, "x", -Math.sin(beat) * 0.35);
      lerp(armL.current, "x", 2.3 + Math.sin(beat) * 0.5);
      lerp(armR.current, "x", 2.3 - Math.sin(beat) * 0.5);
      lerp(armL.current, "z", -0.35);
      lerp(armR.current, "z", 0.35);
      lerp(head.current, "y", Math.sin(beat / 2) * 0.25);
    } else {
      const s = Math.min(1, p.speed / 3);
      walkPhase.current += dt * (4 + p.speed * 2.6) * (s > 0.05 ? 1 : 0);
      const ph = walkPhase.current;
      const swing = Math.sin(ph) * 0.65 * s;
      const breathe = Math.sin(t * 1.8) * 0.012;
      body.current.position.y += (Math.abs(Math.sin(ph)) * 0.05 * s + breathe - body.current.position.y) * k;
      body.current.rotation.z += (0 - body.current.rotation.z) * k;
      lerp(legL.current, "x", swing);
      lerp(legR.current, "x", -swing);
      lerp(armL.current, "x", -swing * 0.8 + (1 - s) * Math.sin(t * 1.2) * 0.04);
      lerp(armR.current, "x", swing * 0.8 - (1 - s) * Math.sin(t * 1.2) * 0.04);
      lerp(armL.current, "z", -0.08);
      lerp(armR.current, "z", 0.08);
      lerp(head.current, "y", (1 - s) * Math.sin(t * 0.5) * 0.18);
    }
  });

  const shirt = look.shirt;
  const hairColor = hair === "bun" ? "#5a3a2e" : "#3a2a24";

  return (
    <group ref={root} visible={!hidden}>
      {/* soft blob shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={body}>
        {/* legs (pivot at hip) */}
        {[
          [legL, -0.11],
          [legR, 0.11],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, HIP_Y, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.52, 4, 10]} />
              <meshStandardMaterial color={TROUSERS} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.74, -0.05]}>
              <boxGeometry args={[0.14, 0.08, 0.24]} />
              <meshStandardMaterial color="#2a2124" roughness={0.6} />
            </mesh>
          </group>
        ))}
        {/* torso */}
        <mesh position={[0, 1.14, 0]} castShadow>
          <capsuleGeometry args={[0.23, 0.42, 6, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.75} />
        </mesh>
        {hair === "bun" && (
          <mesh position={[0, 0.86, 0]}>
            <cylinderGeometry args={[0.25, 0.33, 0.32, 18]} />
            <meshStandardMaterial color={shirt} roughness={0.75} />
          </mesh>
        )}
        {/* arms (pivot at shoulder) */}
        {[
          [armL, -0.31],
          [armR, 0.31],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 1.36, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <capsuleGeometry args={[0.065, 0.4, 4, 10]} />
              <meshStandardMaterial color={shirt} roughness={0.75} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color={SKIN} roughness={0.7} />
            </mesh>
          </group>
        ))}
        {/* head */}
        <group ref={head} position={[0, 1.66, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.21, 24, 20]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.05, 0.02]} scale={[1.04, 0.9, 1.04]}>
            <sphereGeometry args={[0.21, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          {hair === "bun" && (
            <mesh position={[0, 0.17, 0.14]}>
              <sphereGeometry args={[0.09, 14, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
          )}
          {[-0.075, 0.075].map((x) => (
            <mesh key={x} position={[x, 0.0, -0.19]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#2a2124" />
            </mesh>
          ))}
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, -0.06, -0.165]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshStandardMaterial color="#e8a0b4" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
        {/* initials */}
        <sprite position={[0, 2.14, 0]} scale={[0.24, 0.24, 0.24]}>
          <spriteMaterial map={label} toneMapped={false} depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}
