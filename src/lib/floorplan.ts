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

/** Suggest a room for photo i of n so the set spreads evenly through every room. */
export function defaultRoom(i: number, n = 12): RoomId {
  const k = Math.min(FRAME_SLOTS.length - 1, Math.floor((i * FRAME_SLOTS.length) / Math.max(n, 1)));
  return FRAME_SLOTS[k].room;
}

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

// Frames on an east-west wall (divider faces, the back wall, the letter wall).
// faceSouth: the picture faces +z (it hangs on the south face of a wall).
const FACE = t + 0.04;
const across = (room: RoomId, x: number, wallZ: number, faceSouth: boolean): FrameSlot => ({
  room,
  x,
  z: wallZ + (faceSouth ? FACE : -FACE),
  y: 1.78,
  rotY: faceSouth ? 0 : Math.PI,
  nx: 0,
  nz: faceSouth ? 1 : -1,
});
const pair = (room: RoomId, wallZ: number, faceSouth: boolean, x = 4.3) => [
  across(room, -x, wallZ, faceSouth),
  across(room, x, wallZ, faceSouth),
];

/** 41 places to hang a photo, listed in the order a visitor walks past them. */
export const FRAME_SLOTS: FrameSlot[] = [
  // Entrance Hall (10)
  west("entrance", 6.8), east("entrance", 6.8), west("entrance", 3.2), east("entrance", 3.2),
  ...pair("entrance", 0, true), west("entrance", 10.4), east("entrance", 10.4),
  ...pair("entrance", Z_SOUTH, false, 4.6),
  // Photo Gallery (14)
  west("gallery", -2.4), east("gallery", -2.4), west("gallery", -5.2), east("gallery", -5.2),
  west("gallery", -8), east("gallery", -8), west("gallery", -10.8), east("gallery", -10.8),
  west("gallery", -13.6), east("gallery", -13.6),
  ...pair("gallery", -16, true), ...pair("gallery", 0, false),
  // Cinema Room (7): the east wall is the screen
  west("cinema", -18.6), west("cinema", -22), west("cinema", -25.4),
  ...pair("cinema", -28, true), ...pair("cinema", -16, false),
  // Dance & Letter Room (10)
  west("dance", -30.8), east("dance", -30.8), west("dance", -34.4), east("dance", -34.4),
  west("dance", -38), east("dance", -38),
  ...pair("dance", Z_NORTH, true, 4.1), ...pair("dance", -28, false),
];

export const MAX_PHOTOS = FRAME_SLOTS.length;

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
