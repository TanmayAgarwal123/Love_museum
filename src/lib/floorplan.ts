import type { Photo, RoomId } from "./types";

/**
 * The museum floor plan, in metres. The visitor walks "north" towards -z:
 *
 *   z =  13 ┌───────────────┐
 *           │ Entrance Hall │  spawn
 *   z =   0 ├──── door ─────┤
 *           │ Photo Gallery │
 *   z = -16 ├──── door ─────┤
 *           │  Cinema Room  │  screen on the east wall, bench facing it
 *   z = -28 ├──── door ─────┤
 *           │ Dance+Letter  │  dance floor, pedestal, letter on north wall
 *   z = -42 └───────────────┘
 */
export const HALF_W = 7;
export const WALL_H = 4.6;
export const WALL_T = 0.3;
export const DOOR_HALF = 1.6;
export const DOOR_H = 3.2;
export const Z_NORTH = -42;
export const Z_SOUTH = 13;
export const DIVIDERS = [0, -16, -28];
export const EYE = 1.62;
export const PLAYER_R = 0.32;

export const ROOM_BOUNDS: Record<RoomId, [number, number]> = {
  entrance: [0, 13],
  gallery: [-16, 0],
  cinema: [-28, -16],
  dance: [-42, -28],
};

export const SPAWNS: Record<RoomId, { x: number; z: number; yaw: number }> = {
  entrance: { x: 0, z: 8.6, yaw: 0 },
  gallery: { x: 0, z: -1.6, yaw: 0 },
  cinema: { x: -1.5, z: -17.6, yaw: 0.6 },
  dance: { x: 0, z: -29.6, yaw: 0 },
};

export function roomAt(z: number): RoomId {
  if (z > 0) return "entrance";
  if (z > -16) return "gallery";
  if (z > -28) return "cinema";
  return "dance";
}

/** Axis-aligned boxes on the floor plane: [minX, maxX, minZ, maxZ]. */
export type Box = [number, number, number, number];

export const BENCH = { x: 2.3, z: -22, w: 0.62, l: 2.4, seatH: 0.46 };
export const SCREEN = { x: HALF_W - WALL_T / 2 - 0.02, z: -22, w: 6.2, h: 3.25, y: 2.25 };
export const DANCE_FLOOR = { x: 0, z: -34.4, r: 2.6 };
export const PEDESTAL = { x: 0, z: -39.4, size: 0.62, h: 1.05 };
export const LETTER_FRAME = { x: 0, y: 2.05, z: Z_NORTH + WALL_T / 2 + 0.03, w: 1.5, h: 1.95 };

const t = WALL_T / 2;
export const COLLIDERS: Box[] = [
  [-HALF_W - t, -HALF_W + t, Z_NORTH - t, Z_SOUTH + t],
  [HALF_W - t, HALF_W + t, Z_NORTH - t, Z_SOUTH + t],
  [-HALF_W, HALF_W, Z_SOUTH - t, Z_SOUTH + t],
  [-HALF_W, HALF_W, Z_NORTH - t, Z_NORTH + t],
  ...DIVIDERS.flatMap((z): Box[] => [
    [-HALF_W, -DOOR_HALF, z - t, z + t],
    [DOOR_HALF, HALF_W, z - t, z + t],
  ]),
  [BENCH.x - BENCH.w / 2, BENCH.x + BENCH.w / 2, BENCH.z - BENCH.l / 2, BENCH.z + BENCH.l / 2],
  [PEDESTAL.x - PEDESTAL.size / 2, PEDESTAL.x + PEDESTAL.size / 2, PEDESTAL.z - PEDESTAL.size / 2, PEDESTAL.z + PEDESTAL.size / 2],
];

function hits(x: number, z: number, r: number) {
  for (const [a, b, c, d] of COLLIDERS) {
    if (x + r > a && x - r < b && z + r > c && z - r < d) return true;
  }
  return false;
}

/** Move a circle by (dx, dz), sliding along walls. Returns the new position. */
export function moveWithCollision(x: number, z: number, dx: number, dz: number, r = PLAYER_R): [number, number] {
  let nx = x + dx;
  if (hits(nx, z, r)) nx = x;
  let nz = z + dz;
  if (hits(nx, nz, r)) nz = z;
  return [nx, nz];
}

export function isFree(x: number, z: number, r = 0.2) {
  return !hits(x, z, r);
}

export interface FrameSlot {
  room: RoomId;
  x: number;
  z: number;
  y: number;
  rotY: number; // rotation so the picture faces into the room
  nx: number; // wall normal (into the room)
  nz: number;
}

const WX = HALF_W - t - 0.04;
const west = (room: RoomId, z: number): FrameSlot => ({ room, x: -WX, z, y: 1.78, rotY: Math.PI / 2, nx: 1, nz: 0 });
const east = (room: RoomId, z: number): FrameSlot => ({ room, x: WX, z, y: 1.78, rotY: -Math.PI / 2, nx: -1, nz: 0 });

export const FRAME_SLOTS: FrameSlot[] = [
  west("entrance", 7.4), east("entrance", 7.4), west("entrance", 3.2), east("entrance", 3.2),
  west("gallery", -2.8), east("gallery", -2.8), west("gallery", -6.4), east("gallery", -6.4),
  west("gallery", -10), east("gallery", -10), west("gallery", -13.4), east("gallery", -13.4),
  west("cinema", -19.4), west("cinema", -24.6),
  west("dance", -31.6), east("dance", -31.6), west("dance", -36.8), east("dance", -36.8),
];

export interface PlacedPhoto {
  photo: Photo;
  slot: FrameSlot;
  index: number;
}

/** Hang photos in their chosen rooms; overflow spills into the next free wall. */
export function hangPhotos(photos: Photo[]): PlacedPhoto[] {
  const free = [...FRAME_SLOTS];
  const placed: PlacedPhoto[] = [];
  const overflow: { photo: Photo; index: number }[] = [];
  photos.forEach((photo, index) => {
    const i = free.findIndex((s) => s.room === photo.room);
    if (i >= 0) placed.push({ photo, slot: free.splice(i, 1)[0], index });
    else overflow.push({ photo, index });
  });
  const order: RoomId[] = ["gallery", "entrance", "dance", "cinema"];
  for (const o of overflow) {
    const i = free.findIndex((s) => s.room === order.find((r) => free.some((f) => f.room === r)));
    if (i < 0) break;
    placed.push({ ...o, slot: free.splice(i, 1)[0] });
  }
  return placed.sort((a, b) => a.index - b.index);
}

export type InteractKind = "photo" | "bench" | "dance" | "letter";
export interface Interactable {
  id: string;
  kind: InteractKind;
  x: number;
  z: number;
  r: number;
  label: string;
}

export function buildInteractables(placed: PlacedPhoto[]): Interactable[] {
  return [
    { id: "bench", kind: "bench", x: BENCH.x - 1, z: BENCH.z, r: 2.4, label: "Sit & watch" },
    { id: "dance", kind: "dance", x: DANCE_FLOOR.x, z: DANCE_FLOOR.z, r: DANCE_FLOOR.r + 0.4, label: "Dance" },
    { id: "letter", kind: "letter", x: PEDESTAL.x, z: PEDESTAL.z + 0.6, r: 1.9, label: "Read the letter" },
    ...placed.map(
      (p): Interactable => ({
        id: p.photo.id,
        kind: "photo",
        x: p.slot.x + p.slot.nx * 1.3,
        z: p.slot.z + p.slot.nz * 1.3,
        r: 1.5,
        label: "View photo",
      }),
    ),
  ];
}
