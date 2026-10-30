"use client";

import { create } from "zustand";
import type { Interactable } from "./floorplan";
import { BENCH, SPAWNS } from "./floorplan";
import type { RoomId } from "./types";

export type Panel = null | "map" | "photos" | "share" | "song" | "help";

/**
 * Per-frame simulation state lives outside React (mutated in useFrame) so
 * walking never triggers re-renders. UI-relevant state lives in the store.
 */
export const sim = {
  x: SPAWNS.entrance.x,
  z: SPAWNS.entrance.z,
  avatarYaw: 0,
  camYaw: 0,
  camPitch: -0.12,
  speed: 0,
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  target: null as null | { x: number; z: number },
  partner: { x: SPAWNS.entrance.x + 0.9, z: SPAWNS.entrance.z + 0.3, yaw: 0, speed: 0 },
};

export function teleport(room: RoomId) {
  const s = SPAWNS[room];
  sim.x = s.x;
  sim.z = s.z;
  sim.camYaw = s.yaw;
  sim.avatarYaw = s.yaw;
  sim.target = null;
  sim.partner.x = s.x + Math.cos(s.yaw) * 0.9;
  sim.partner.z = s.z - Math.sin(s.yaw) * 0.9 + 0.3;
}

export function teleportTo(x: number, z: number, yaw: number) {
  sim.x = x;
  sim.z = z;
  sim.camYaw = yaw;
  sim.avatarYaw = yaw;
  sim.target = null;
  sim.partner.x = x + Math.cos(yaw) * 0.9;
  sim.partner.z = z - Math.sin(yaw) * 0.9;
}

/** Shared handles to DOM media so HUD buttons can drive them. */
export const media = {
  video: null as HTMLVideoElement | null,
};

interface MuseumState {
  view: "third" | "first";
  focusedPhotoId: string | null;
  sitting: boolean;
  dancing: boolean;
  letterOpen: boolean;
  near: Interactable | null;
  room: RoomId;
  panel: Panel;
  songPlaying: boolean;
  videoPlaying: boolean;
  videoMuted: boolean;
  /** Which film in the playlist the cinema is showing. */
  videoIndex: number;
  quality: "high" | "low";
  slowWarning: boolean;
  set: (p: Partial<MuseumState>) => void;
  toggleView: () => void;
  closeAll: () => boolean;
  reset: () => void;
}

const initial = {
  view: "third" as const,
  focusedPhotoId: null,
  sitting: false,
  dancing: false,
  letterOpen: false,
  near: null,
  room: "entrance" as RoomId,
  panel: null,
  songPlaying: false,
  videoPlaying: false,
  videoMuted: false,
  videoIndex: 0,
  quality: "high" as const,
  slowWarning: false,
};

export const useMuseum = create<MuseumState>((set, get) => ({
  ...initial,
  set: (p) => set(p),
  toggleView: () => set({ view: get().view === "third" ? "first" : "third" }),
  /** Close whatever is open, innermost first. Returns true if something closed. */
  closeAll: () => {
    const s = get();
    if (s.panel) return set({ panel: null }), true;
    if (s.focusedPhotoId) return set({ focusedPhotoId: null }), true;
    if (s.letterOpen) return set({ letterOpen: false }), true;
    if (s.sitting) return set({ sitting: false }), true;
    if (s.dancing) return set({ dancing: false }), true;
    return false;
  },
  reset: () => {
    set(initial);
    teleport("entrance");
  },
}));

// Standing up from the cinema bench puts you both just in front of it.
useMuseum.subscribe((s, prev) => {
  if (prev.sitting && !s.sitting) {
    sim.x = BENCH.x - 1.1;
    sim.z = BENCH.z - 0.4;
    sim.partner.x = BENCH.x - 1.1;
    sim.partner.z = BENCH.z + 0.5;
    sim.camYaw = sim.avatarYaw = -Math.PI / 2;
  }
});

/** True while the player shouldn't be walking around. */
export function isLocked(s: Pick<MuseumState, "focusedPhotoId" | "sitting" | "dancing" | "letterOpen" | "panel">) {
  return Boolean(s.focusedPhotoId || s.sitting || s.dancing || s.letterOpen || s.panel);
}

/** Step the cinema playlist by +1 / -1 (wraps around). */
export function stepFilm(delta: number, count: number) {
  if (count < 2) return;
  const s = useMuseum.getState();
  s.set({ videoIndex: (s.videoIndex + delta + count) % count });
}

export function interact(target: Interactable | null) {
  const s = useMuseum.getState();
  if (!target) return;
  switch (target.kind) {
    case "bench":
      s.set({ sitting: !s.sitting, dancing: false });
      break;
    case "dance": {
      const dancing = !s.dancing;
      s.set({ dancing, sitting: false, songPlaying: dancing ? true : s.songPlaying });
      break;
    }
    case "letter":
      s.set({ letterOpen: true });
      break;
    case "photo":
      s.set({ focusedPhotoId: target.id });
      break;
  }
}
