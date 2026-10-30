import { museumConfig as c } from "@/content/museum.config";
import generated from "@/content/media.generated.json";
import { DEMO_MUSEUM } from "./demo";
import { defaultRoom } from "./floorplan";
import type { MemoryVideo, Museum, Photo, Song } from "./types";

/** Written by scripts/build-manifest.mjs from the files in public/museum/. */
const media = generated as { photos: { file: string; src: string }[]; videos: string[]; song: string | null };

/** The museum built from src/content/museum.config.ts + the files in public/museum/. */
export const OUR_SLUG = "us";

const enc = (dir: string, file: string) => `/museum/${dir}/${encodeURIComponent(file)}`;
const encPath = (rel: string) => `/museum/${rel.split("/").map(encodeURIComponent).join("/")}`;

function photos(): Photo[] {
  if (media.photos.length) {
    const n = media.photos.length;
    return media.photos.map(({ file, src }, i) => {
      const meta = c.photos[file] ?? {};
      return {
        id: `p${i + 1}`,
        src: encPath(src),
        title: meta.title || `Memory ${i + 1}`,
        date: meta.date ?? "",
        caption: meta.caption ?? "",
        room: meta.room ?? defaultRoom(i, n),
      };
    });
  }
  // No photos added yet: show the placeholder art so the museum still works.
  return DEMO_MUSEUM.photos.map((p, i) => ({ ...p, title: `Memory ${i + 1}`, date: "", caption: "Add your photos to public/museum/photos/" }));
}

function videos(): MemoryVideo[] {
  if (!media.videos.length) return [{ ...DEMO_MUSEUM.video!, title: "Add your videos to public/museum/video/" }];
  return media.videos.map((file, i) => ({
    src: enc("video", file),
    kind: "file",
    title: c.videos[file]?.title || `Film ${i + 1}`,
  }));
}

function song(): Song {
  if (media.song) return { src: enc("song", media.song), kind: "audio", title: c.song.title, artist: c.song.artist };
  return { src: c.song.spotify, kind: "spotify", title: c.song.title, artist: c.song.artist };
}

export const OUR_MUSEUM: Museum = {
  slug: OUR_SLUG,
  title: c.title,
  yourName: c.yourName,
  partnerName: c.partnerName,
  occasion: c.occasion,
  startDate: c.startDate,
  passcode: /^\d{4}$/.test(c.passcode) ? c.passcode : undefined,
  theme: c.theme,
  photos: photos(),
  videos: videos(),
  song: song(),
  letter: c.letter,
  avatars: c.avatars,
  createdAt: "2026-10-30T00:00:00.000Z",
};
