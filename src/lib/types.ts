export type RoomId = "entrance" | "gallery" | "cinema" | "dance";
export type ThemeId = "classic" | "blush" | "midnight";

/**
 * A media reference. Either a URL (`/demo/x.jpg`, `https://…`) or a
 * repository-owned blob reference (`idb:<key>` for the local MVP). Resolve it
 * with `repo.resolveMedia()` before rendering.
 */
export type MediaRef = string;

export interface Photo {
  id: string;
  src: MediaRef;
  title: string;
  caption: string;
  date: string; // free text or ISO date, shown on the plaque
  room: RoomId;
}

export type VideoKind = "file" | "youtube" | "vimeo";
export interface MemoryVideo {
  src: MediaRef;
  kind: VideoKind;
  poster?: MediaRef;
  title?: string;
}

export type SongKind = "audio" | "youtube" | "spotify";
export interface Song {
  src: MediaRef;
  kind: SongKind;
  title: string;
  artist?: string;
}

export interface AvatarLook {
  initials: string;
  shirt: string;
}

export interface Museum {
  slug: string;
  title: string;
  yourName: string;
  partnerName: string;
  occasion: string;
  startDate: string; // ISO yyyy-mm-dd
  passcode?: string; // 4 digits, optional
  theme: ThemeId;
  photos: Photo[];
  /** Films for the cinema, played in order. */
  videos?: MemoryVideo[];
  /** @deprecated single film; read films with museumVideos() */
  video?: MemoryVideo;
  song?: Song;
  letter: string;
  avatars: { you: AvatarLook; partner: AvatarLook };
  createdAt: string;
  isDemo?: boolean;
}

/** All of a museum's films (supports the older single `video` field). */
export function museumVideos(m: Pick<Museum, "videos" | "video">): MemoryVideo[] {
  if (m.videos?.length) return m.videos.filter((v) => v.src);
  return m.video?.src ? [m.video] : [];
}

export const ROOMS: { id: RoomId; name: string; blurb: string }[] = [
  { id: "entrance", name: "Entrance Hall", blurb: "Where it begins" },
  { id: "gallery", name: "Photo Gallery", blurb: "Our favourite days" },
  { id: "cinema", name: "Cinema Room", blurb: "Sit and watch" },
  { id: "dance", name: "Dance & Letter Room", blurb: "Our song, and a letter" },
];
