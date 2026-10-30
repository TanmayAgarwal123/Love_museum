"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useMemo } from "react";
import {
  DIVIDERS,
  DOOR_H,
  DOOR_HALF,
  HALF_W,
  WALL_H,
  WALL_T,
  Z_NORTH,
  Z_SOUTH,
} from "@/lib/floorplan";
import { sim } from "@/lib/store";
import type { SceneTheme } from "@/lib/themes";
import { daysTogether, formatLongDate } from "@/lib/media";
import type { Museum } from "@/lib/types";
import { DISPLAY_FONT, UI_FONT, canvasTexture } from "./canvasText";

const LEN = Z_SOUTH - Z_NORTH;
const MID_Z = (Z_SOUTH + Z_NORTH) / 2;

function Wall({ pos, size, color }: { pos: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={pos} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Sign({
  position,
  rotationY = 0,
  width,
  height,
  draw,
}: {
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}) {
  const tex = useMemo(() => canvasTexture(Math.round(width * 256), Math.round(height * 256), draw), [width, height, draw]);
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

export function GalleryRoom({ museum, theme, quality }: { museum: Museum; theme: SceneTheme; quality: "high" | "low" }) {
  const ink = theme.label === "Midnight" ? "#f3ede6" : "#2a2124";
  const soft = theme.label === "Midnight" ? "#c9bfc6" : "#6b5d61";

  const drawTitle = useMemo(
    () => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.textAlign = "center";
      ctx.fillStyle = ink;
      ctx.font = `400 ${h * 0.5}px ${DISPLAY_FONT}`;
      ctx.fillText(museum.title, w / 2, h * 0.56);
      ctx.fillStyle = soft;
      ctx.font = `500 ${h * 0.17}px ${UI_FONT}`;
      ctx.fillText(`${museum.yourName} & ${museum.partnerName}`, w / 2, h * 0.88);
    },
    [museum.title, museum.yourName, museum.partnerName, ink, soft],
  );

  const drawWelcome = useMemo(
    () => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const days = daysTogether(museum.startDate);
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.font = `400 ${h * 0.2}px ${DISPLAY_FONT}`;
      ctx.fillText(museum.occasion, w / 2, h * 0.32);
      ctx.fillStyle = soft;
      ctx.font = `500 ${h * 0.085}px ${UI_FONT}`;
      const since = museum.startDate ? `Together since ${formatLongDate(museum.startDate)}` : "";
      ctx.fillText(since, w / 2, h * 0.55);
      if (days !== null && museum.startDate) {
        ctx.fillStyle = theme.frame;
        ctx.font = `600 ${h * 0.12}px ${UI_FONT}`;
        ctx.fillText(`${days.toLocaleString()} days`, w / 2, h * 0.8);
      }
    },
    [museum.occasion, museum.startDate, ink, soft, theme.frame],
  );

  const signDraw = (text: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = `400 ${h * 0.56}px ${DISPLAY_FONT}`;
    ctx.fillText(text, w / 2, h * 0.68);
  };
  const cinemaSign = useMemo(() => signDraw("Cinema Room"), [ink]); // eslint-disable-line react-hooks/exhaustive-deps
  const danceSign = useMemo(() => signDraw("Dance & Letter Room"), [ink]); // eslint-disable-line react-hooks/exhaustive-deps
  const entranceSign = useMemo(() => signDraw("Entrance Hall"), [ink]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = WALL_T;
  const sideLen = (HALF_W - DOOR_HALF);
  const lintelH = WALL_H - DOOR_H;

  const trackLights = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = Z_SOUTH - 2; z > Z_NORTH + 1; z -= 3.2) out.push([-3.2, z], [3.2, z]);
    return out;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, MID_Z]}
        receiveShadow
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          sim.target = { x: e.point.x, z: e.point.z };
        }}
        name="floor"
      >
        <planeGeometry args={[HALF_W * 2, LEN]} />
        {quality === "high" ? (
          <MeshReflectorMaterial
            color={theme.floor}
            resolution={512}
            blur={[300, 80]}
            mixBlur={1}
            mixStrength={theme.label === "Midnight" ? 2.2 : 1.1}
            mirror={0.5}
            roughness={0.75}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            metalness={0.1}
          />
        ) : (
          <meshStandardMaterial color={theme.floor} roughness={0.4} metalness={0.05} />
        )}
      </mesh>

      {/* Ceiling */}
      <mesh rotation-x={Math.PI / 2} position={[0, WALL_H, MID_Z]}>
        <planeGeometry args={[HALF_W * 2, LEN]} />
        <meshStandardMaterial color={theme.ceiling} roughness={1} />
      </mesh>

      {/* Track lights */}
      {trackLights.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, WALL_H - 0.02, z]}>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.04, 1.6]} />
            <meshStandardMaterial color="#2a2124" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.16, 0.35]} rotation-x={0.4}>
            <cylinderGeometry args={[0.06, 0.08, 0.18, 12]} />
            <meshStandardMaterial color="#2a2124" emissive={theme.light} emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[0, -0.16, -0.35]} rotation-x={-0.4}>
            <cylinderGeometry args={[0.06, 0.08, 0.18, 12]} />
            <meshStandardMaterial color="#2a2124" emissive={theme.light} emissiveIntensity={0.15} />
          </mesh>
        </group>
      ))}

      {/* Outer walls */}
      <Wall pos={[-HALF_W, WALL_H / 2, MID_Z]} size={[t, WALL_H, LEN + t]} color={theme.wall} />
      <Wall pos={[HALF_W, WALL_H / 2, MID_Z]} size={[t, WALL_H, LEN + t]} color={theme.wall} />
      <Wall pos={[0, WALL_H / 2, Z_SOUTH]} size={[HALF_W * 2, WALL_H, t]} color={theme.wall} />
      <Wall pos={[0, WALL_H / 2, Z_NORTH]} size={[HALF_W * 2, WALL_H, t]} color={theme.wall} />

      {/* Divider walls with doorways */}
      {DIVIDERS.map((z) => (
        <group key={z}>
          <Wall pos={[-(DOOR_HALF + sideLen / 2), WALL_H / 2, z]} size={[sideLen, WALL_H, t]} color={theme.wall} />
          <Wall pos={[DOOR_HALF + sideLen / 2, WALL_H / 2, z]} size={[sideLen, WALL_H, t]} color={theme.wall} />
          <Wall pos={[0, DOOR_H + lintelH / 2, z]} size={[DOOR_HALF * 2, lintelH, t]} color={theme.wall} />
          {/* door casing */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * DOOR_HALF, DOOR_H / 2, z]}>
              <boxGeometry args={[0.08, DOOR_H, t + 0.06]} />
              <meshStandardMaterial color={theme.trim} roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, DOOR_H, z]}>
            <boxGeometry args={[DOOR_HALF * 2 + 0.08, 0.08, t + 0.06]} />
            <meshStandardMaterial color={theme.trim} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Skirting along the long walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF_W - t / 2 - 0.02), 0.07, MID_Z]}>
          <boxGeometry args={[0.04, 0.14, LEN]} />
          <meshStandardMaterial color={theme.trim} roughness={0.8} />
        </mesh>
      ))}
      {[...DIVIDERS.flatMap((z) => [z + t / 2 + 0.02, z - t / 2 - 0.02]), Z_SOUTH - t / 2 - 0.02, Z_NORTH + t / 2 + 0.02].map((z) =>
        [-1, 1].map((s) => (
          <mesh key={`${z}:${s}`} position={[s * (DOOR_HALF + sideLen / 2), 0.07, z]}>
            <boxGeometry args={[sideLen, 0.14, 0.04]} />
            <meshStandardMaterial color={theme.trim} roughness={0.8} />
          </mesh>
        )),
      )}

      {/* Title above the first doorway, seen from the entrance */}
      <Sign position={[0, 3.92, t / 2 + 0.02]} width={6.4} height={1.1} draw={drawTitle} />
      {/* Welcome placard on the entrance back wall (behind the spawn) */}
      <Sign position={[0, 2.3, Z_SOUTH - t / 2 - 0.02]} rotationY={Math.PI} width={4.2} height={1.6} draw={drawWelcome} />
      {/* Room signs over the doors */}
      <Sign position={[0, 3.9, -t / 2 - 0.02]} rotationY={Math.PI} width={3} height={0.55} draw={entranceSign} />
      <Sign position={[0, 3.9, -16 + t / 2 + 0.02]} width={3} height={0.55} draw={cinemaSign} />
      <Sign position={[0, 3.9, -28 + t / 2 + 0.02]} width={4.2} height={0.55} draw={danceSign} />
    </group>
  );
}

