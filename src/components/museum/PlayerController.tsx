"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BENCH,
  DANCE_FLOOR,
  EYE,
  type Interactable,
  type PlacedPhoto,
  SCREEN,
  WALL_H,
  isFree,
  moveWithCollision,
  roomAt,
} from "@/lib/floorplan";
import { prefersReducedMotion } from "@/lib/media";
import { isLocked, sim, useMuseum } from "@/lib/store";
import type { Museum } from "@/lib/types";
import { Avatar, type AvatarPose } from "./Avatar";

const WALK = 3.0;
const RUN = 5.2;
const TURN = 2.2; // rad/s for arrow keys

const lookDir = (yaw: number, pitch: number, out: THREE.Vector3) =>
  out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

export function PlayerController({
  museum,
  placed,
  interactables,
}: {
  museum: Museum;
  placed: PlacedPhoto[];
  interactables: Interactable[];
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 2.8, 12.4));
  const camLook = useRef(new THREE.Vector3(0, 1.5, 0));
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), want: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  const marker = useRef<THREE.Mesh>(null);
  const danceAngle = useRef(0);
  const view = useMuseum((s) => s.view);
  const focused = useMuseum((s) => s.focusedPhotoId);
  const letterOpen = useMuseum((s) => s.letterOpen);

  const pose = useRef<{ me: AvatarPose; partner: AvatarPose }>({
    me: { x: sim.x, z: sim.z, yaw: 0, speed: 0, mode: "walk", side: 1, phase: 0 },
    partner: { x: sim.partner.x, z: sim.partner.z, yaw: 0, speed: 0, mode: "walk", side: -1, phase: 0.7 },
  });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useMuseum.getState();
    const me = pose.current.me;
    const pt = pose.current.partner;

    // ---------- movement ----------
    if (s.sitting) {
      sim.x = BENCH.x + 0.05;
      sim.z = BENCH.z - 0.42;
      sim.avatarYaw = -Math.PI / 2;
      sim.partner.x = BENCH.x + 0.05;
      sim.partner.z = BENCH.z + 0.42;
      sim.partner.yaw = -Math.PI / 2;
      sim.speed = sim.partner.speed = 0;
      me.mode = pt.mode = "sit";
      me.side = 1;
      pt.side = -1;
    } else if (s.dancing) {
      danceAngle.current += dt * 0.7;
      const a = danceAngle.current;
      const r = 0.6;
      const cx = DANCE_FLOOR.x;
      const cz = DANCE_FLOOR.z;
      const k = Math.min(1, dt * 3);
      sim.x += (cx + Math.cos(a) * r - sim.x) * k;
      sim.z += (cz + Math.sin(a) * r - sim.z) * k;
      sim.partner.x += (cx - Math.cos(a) * r - sim.partner.x) * k;
      sim.partner.z += (cz - Math.sin(a) * r - sim.partner.z) * k;
      sim.avatarYaw = Math.atan2(-(sim.partner.x - sim.x), -(sim.partner.z - sim.z));
      sim.partner.yaw = Math.atan2(-(sim.x - sim.partner.x), -(sim.z - sim.partner.z));
      sim.speed = sim.partner.speed = 0;
      me.mode = pt.mode = "dance";
    } else {
      me.mode = pt.mode = "walk";
      const locked = isLocked(s);
      let fwd = 0;
      let str = 0;
      let turn = 0;
      if (!locked) {
        const k = sim.keys;
        if (k.has("KeyW") || k.has("ArrowUp")) fwd += 1;
        if (k.has("KeyS") || k.has("ArrowDown")) fwd -= 1;
        if (k.has("KeyD")) str += 1;
        if (k.has("KeyA")) str -= 1;
        if (k.has("ArrowLeft")) turn += 1;
        if (k.has("ArrowRight")) turn -= 1;
        fwd += sim.joy.y;
        str += sim.joy.x;
      }
      sim.camYaw += turn * TURN * dt;
      const fx = -Math.sin(sim.camYaw);
      const fz = -Math.cos(sim.camYaw);
      const rx = Math.cos(sim.camYaw);
      const rz = -Math.sin(sim.camYaw);
      let mx = fx * fwd + rx * str;
      let mz = fz * fwd + rz * str;
      let mag = Math.hypot(mx, mz);
      const run = sim.keys.has("ShiftLeft") || sim.keys.has("ShiftRight");
      let speed = run ? RUN : WALK;

      if (mag > 0.01) {
        sim.target = null;
        if (mag > 1) {
          mx /= mag;
          mz /= mag;
          mag = 1;
        }
        speed *= mag;
      } else if (sim.target && !locked) {
        const dx = sim.target.x - sim.x;
        const dz = sim.target.z - sim.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) {
          sim.target = null;
        } else {
          mx = dx / d;
          mz = dz / d;
          mag = 1;
          speed = Math.min(WALK, d * 3 + 0.6);
          // let the camera drift behind the walker
          let dy = Math.atan2(-mx, -mz) - sim.camYaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          sim.camYaw += dy * Math.min(1, dt * 1.6);
        }
      } else mag = 0;

      if (mag > 0.01) {
        const [nx, nz] = moveWithCollision(sim.x, sim.z, mx * speed * dt, mz * speed * dt);
        const moved = Math.hypot(nx - sim.x, nz - sim.z);
        if (sim.target && moved < speed * dt * 0.2) sim.target = null; // blocked
        sim.x = nx;
        sim.z = nz;
        sim.avatarYaw = Math.atan2(-mx, -mz);
        sim.speed += (moved / dt - sim.speed) * Math.min(1, dt * 10);
      } else sim.speed += (0 - sim.speed) * Math.min(1, dt * 10);

      // ---------- partner follows, walking beside you ----------
      const P = sim.partner;
      const ay = sim.avatarYaw;
      const wantX = sim.x + Math.cos(ay) * 0.85 + Math.sin(ay) * 0.3;
      const wantZ = sim.z - Math.sin(ay) * 0.85 + Math.cos(ay) * 0.3;
      let dx = wantX - P.x;
      let dz = wantZ - P.z;
      let d = Math.hypot(dx, dz);
      if (d > 5) {
        P.x = sim.x + Math.cos(ay) * 0.8;
        P.z = sim.z - Math.sin(ay) * 0.8;
        if (!isFree(P.x, P.z, 0.28)) {
          P.x = sim.x;
          P.z = sim.z + 0.6;
        }
        dx = dz = d = 0;
      }
      if (d > 0.08) {
        const v = Math.min(RUN, d * 4);
        const step = Math.min(d, v * dt);
        const [px, pz] = moveWithCollision(P.x, P.z, (dx / d) * step, (dz / d) * step, 0.28);
        const moved = Math.hypot(px - P.x, pz - P.z);
        P.x = px;
        P.z = pz;
        P.speed += (moved / dt - P.speed) * Math.min(1, dt * 10);
        P.yaw = moved > 0.002 ? Math.atan2(-dx, -dz) : P.yaw;
      } else {
        P.speed += (0 - P.speed) * Math.min(1, dt * 10);
        P.yaw = sim.avatarYaw;
      }
    }

    me.x = sim.x;
    me.z = sim.z;
    me.yaw = sim.avatarYaw;
    me.speed = sim.speed;
    pt.x = sim.partner.x;
    pt.z = sim.partner.z;
    pt.yaw = sim.partner.yaw;
    pt.speed = sim.partner.speed;

    // ---------- camera ----------
    const { dir, want, look } = tmp;
    let smooth = 10;
    const fp = placed.find((p) => p.photo.id === s.focusedPhotoId);
    if (fp) {
      const { slot } = fp;
      // On wide screens, slide the view so the frame sits left of the info card.
      const shift = state.size.width / state.size.height > 1.2 ? 0.95 : 0;
      const rx = slot.nz * shift;
      const rz = -slot.nx * shift;
      const back = state.size.width / state.size.height > 1.2 ? 2.25 : 3.1;
      want.set(slot.x + slot.nx * back + rx, slot.y - 0.08 - (shift ? 0 : 0.55), slot.z + slot.nz * back + rz);
      look.set(slot.x + rx, slot.y - 0.08 - (shift ? 0 : 0.55), slot.z + rz);
      smooth = 4;
    } else if (s.letterOpen) {
      want.set(0, 2.0, -38.4);
      look.set(0, 2.0, -42);
      smooth = 4;
    } else if (s.sitting) {
      want.set(BENCH.x - 3.3, 2.15, BENCH.z);
      look.set(SCREEN.x, SCREEN.y - 0.15, SCREEN.z);
      smooth = 3;
    } else if (s.dancing) {
      const a = prefersReducedMotion() ? 1.2 : state.clock.elapsedTime * 0.16;
      want.set(DANCE_FLOOR.x + Math.cos(a) * 5.2, 2.7, DANCE_FLOOR.z + Math.sin(a) * 5.2);
      look.set(DANCE_FLOOR.x, 1.2, DANCE_FLOOR.z);
      smooth = 3;
    } else if (s.view === "first") {
      lookDir(sim.camYaw, sim.camPitch, dir);
      want.set(sim.x, EYE, sim.z);
      look.copy(want).addScaledVector(dir, 3);
      smooth = 18;
    } else {
      lookDir(sim.camYaw, sim.camPitch, dir);
      const target = look.set(sim.x, 1.55, sim.z);
      // pull the camera in if a wall is behind us
      const hx = -Math.sin(sim.camYaw);
      const hz = -Math.cos(sim.camYaw);
      const D = 4.1;
      let dist = 0;
      for (let d = 0.2; d <= D; d += 0.1) {
        if (!isFree(sim.x - hx * d, sim.z - hz * d, 0.22)) break;
        dist = d;
      }
      want.set(
        sim.x - hx * dist * Math.cos(sim.camPitch),
        Math.min(WALL_H - 0.25, Math.max(0.5, 1.55 + 0.55 - Math.sin(sim.camPitch) * dist)),
        sim.z - hz * dist * Math.cos(sim.camPitch),
      );
      look.copy(target).addScaledVector(dir, 2).setY(target.y + 0.15 + dir.y * 2);
    }
    const a = 1 - Math.exp(-dt * smooth);
    camPos.current.lerp(want, a);
    camLook.current.lerp(look, a);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);

    // ---------- click-to-move marker ----------
    if (marker.current) {
      marker.current.visible = !!sim.target;
      if (sim.target) {
        marker.current.position.set(sim.target.x, 0.02, sim.target.z);
        const sc = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.08;
        marker.current.scale.set(sc, sc, sc);
      }
    }

    // ---------- proximity + room (only push to React when it changes) ----------
    if (!isLocked(s)) {
      let best: Interactable | null = null;
      let bestD = Infinity;
      for (const it of interactables) {
        const d = Math.hypot(it.x - sim.x, it.z - sim.z);
        if (d < it.r && d < bestD) {
          best = it;
          bestD = d;
        }
      }
      if ((best?.id ?? null) !== (s.near?.id ?? null)) s.set({ near: best });
    }
    const room = roomAt(sim.z);
    if (room !== s.room) s.set({ room });
  });

  const hideMe = view === "first" && !focused;
  return (
    <>
      <Avatar look={museum.avatars.you} hair="short" getPose={() => pose.current.me} hidden={hideMe || !!focused || letterOpen} />
      <Avatar look={museum.avatars.partner} hair="bun" getPose={() => pose.current.partner} hidden={!!focused || letterOpen} />
      <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.18, 0.26, 32]} />
        <meshBasicMaterial color="#e8a0b4" transparent opacity={0.9} toneMapped={false} />
      </mesh>
    </>
  );
}

