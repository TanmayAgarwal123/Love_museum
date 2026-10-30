"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DANCE_FLOOR, WALL_H } from "@/lib/floorplan";
import { prefersReducedMotion } from "@/lib/media";
import { interact, sim, useMuseum } from "@/lib/store";

const HEARTS = 70;

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.6, 0.2);
  s.bezierCurveTo(-0.6, 0.5, -0.3, 0.6, 0, 0.35);
  s.bezierCurveTo(0.3, 0.6, 0.6, 0.5, 0.6, 0.2);
  s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5);
  return s;
}

function Hearts({ active }: { active: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.ShapeGeometry(heartShape(), 10), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: HEARTS }, () => ({
        a: Math.random() * Math.PI * 2,
        r: 0.4 + Math.random() * (DANCE_FLOOR.r + 0.6),
        speed: 0.35 + Math.random() * 0.5,
        y: Math.random() * WALL_H,
        s: 0.08 + Math.random() * 0.12,
        spin: Math.random() * Math.PI,
      })),
    [],
  );
  const m = useMemo(() => new THREE.Object3D(), []);
  const fade = useRef(0);

  useFrame((state, dt) => {
    const im = mesh.current;
    if (!im) return;
    fade.current += ((active ? 1 : 0) - fade.current) * Math.min(1, dt * 2);
    im.visible = fade.current > 0.01;
    if (!im.visible) return;
    const t = state.clock.elapsedTime;
    seeds.forEach((p, i) => {
      p.y += p.speed * dt;
      if (p.y > WALL_H - 0.2) p.y = 0.2;
      m.position.set(
        DANCE_FLOOR.x + Math.cos(p.a + t * 0.15) * p.r + Math.sin(t + i) * 0.1,
        p.y,
        DANCE_FLOOR.z + Math.sin(p.a + t * 0.15) * p.r,
      );
      m.rotation.set(0, p.spin + t * 0.8, Math.sin(t * 2 + i) * 0.3);
      const sc = p.s * fade.current * Math.min(1, (WALL_H - p.y) * 1.5);
      m.scale.setScalar(sc);
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, HEARTS]} frustumCulled={false}>
      <meshBasicMaterial color="#f29bb7" side={THREE.DoubleSide} transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  );
}

export function DanceFloor() {
  const dancing = useMuseum((s) => s.dancing);
  const spotA = useRef<THREE.SpotLight>(null);
  const spotB = useRef<THREE.SpotLight>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(DANCE_FLOOR.x, 0, DANCE_FLOOR.z);
    return o;
  }, []);

  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2.5);
    const t = state.clock.elapsedTime;
    const on = dancing ? 1 : 0;
    for (const [i, s] of [spotA.current, spotB.current].entries()) {
      if (!s) continue;
      s.intensity += (on * 60 - s.intensity) * k;
      s.position.x = DANCE_FLOOR.x + Math.cos(t * 0.5 + i * Math.PI) * 2.5;
      s.position.z = DANCE_FLOOR.z + Math.sin(t * 0.5 + i * Math.PI) * 2.5;
    }
    if (ring.current) ring.current.emissiveIntensity += ((dancing ? 1.4 : 0.25) - ring.current.emissiveIntensity) * k;
  });

  return (
    <group>
      <primitive object={target} />
      <group
        position={[DANCE_FLOOR.x, 0, DANCE_FLOOR.z]}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const near = Math.hypot(sim.x - DANCE_FLOOR.x, sim.z - DANCE_FLOOR.z) < DANCE_FLOOR.r + 0.6;
          if (near) interact({ id: "dance", kind: "dance", x: 0, z: 0, r: 0, label: "" });
          else sim.target = { x: DANCE_FLOOR.x, z: DANCE_FLOOR.z + DANCE_FLOOR.r - 0.4 };
        }}
      >
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow>
          <circleGeometry args={[DANCE_FLOOR.r, 64]} />
          <meshStandardMaterial color="#f3d6de" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
          <ringGeometry args={[DANCE_FLOOR.r - 0.08, DANCE_FLOOR.r, 96]} />
          <meshStandardMaterial ref={ring} color="#c9a35a" emissive="#e8a0b4" emissiveIntensity={0.25} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <spotLight ref={spotA} position={[2, WALL_H - 0.3, DANCE_FLOOR.z]} angle={0.55} penumbra={0.8} color="#ff8fb1" intensity={0} distance={10} decay={1.2} target={target} />
      <spotLight ref={spotB} position={[-2, WALL_H - 0.3, DANCE_FLOOR.z]} angle={0.55} penumbra={0.8} color="#ffc2d4" intensity={0} distance={10} decay={1.2} target={target} />
      {!prefersReducedMotion() && <Hearts active={dancing} />}
    </group>
  );
}
