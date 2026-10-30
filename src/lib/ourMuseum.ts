import { museumConfig as c } from "@/content/museum.config";
import media from "@/content/media.generated.json";
import { DEMO_MUSEUM } from "./demo";
import { defaultRoom } from "./floorplan";
import type { Museum, Photo, Song } from "./types";

/** The museum built from src/content/museum.config.ts + the files in public/museum/. */
export const OUR_SLUG = "us";

const enc = (dir: string, file: string) => `/museum/${dir}/${encodeURIComponent(file)}`;

function photos(): Photo[] {
  if (media.photos.length) {
    return media.photos.map((file, i) => {
      const meta = c.photos[file] ?? {};
      return {
        id: `p${i + 1}`,
        src: enc("photos", file),
        title: meta.title || `Memory ${i + 1}`,
        date: meta.date ?? "",
        caption: meta.caption ?? "",
        room: meta.room ?? defaultRoom(i),
      };
    });
  }
  // No photos added yet: show the placeholder art so the museum still works.
  return DEMO_MUSEUM.photos.map((p, i) => ({ ...p, title: `Memory ${i + 1}`, date: "", caption: "Add your photos to public/museum/photos/" }));
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
  video: media.video
    ? { src: enc("video", media.video), kind: "file", title: c.video.title }
    : { ...DEMO_MUSEUM.video!, title: c.video.title },
  song: song(),
  letter: c.letter,
  avatars: c.avatars,
  createdAt: "2026-10-30T00:00:00.000Z",
};
