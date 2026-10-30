/**
 * ─────────────────────────────────────────────────────────────────────────
 *  YOUR MUSEUM: edit the words here. Photos and video go in folders:
 *
 *    public/museum/photos/   ← up to 12 photos (JPG / PNG / WEBP)
 *    public/museum/video/    ← one video (MP4)
 *    public/museum/song/     ← optional: an MP3 to use instead of Spotify
 *
 *  Photos are hung in file-name order: 01.jpg first, then 02.jpg, …
 *  Full step-by-step instructions are in README.md › "Make it yours".
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { RoomId } from "@/lib/types";

export const museumConfig = {
  yourName: "Tanmay",
  partnerName: "Lakshmi",
  title: "The Museum of Us",
  occasion: "Happy 5 months, Lakshmi",
  /** The day it all started (year-month-day). 30 May 2026 → 153 days on 30 Oct 2026. */
  startDate: "2026-05-30",
  /** Optional 4-digit passcode she has to type to get in. Leave "" for none. */
  passcode: "",
  /** "classic" (white gallery), "blush" (pink walls) or "midnight" (dark). */
  theme: "classic" as "classic" | "blush" | "midnight",

  avatars: {
    you: { initials: "T", shirt: "#3d5a80" },
    partner: { initials: "L", shirt: "#e8a0b4" },
  },

  song: {
    title: "Yellow",
    artist: "Coldplay",
    /** Spotify track link. Ignored if you put an MP3 in public/museum/song/. */
    spotify: "https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg",
  },

  video: {
    title: "Our five months",
  },

  /**
   * One entry per photo, matched by FILE NAME (exactly as it is in
   * public/museum/photos/). Anything you leave out gets a gentle default.
   * room: "entrance" | "gallery" | "cinema" | "dance" (optional; photos are
   * spread across the rooms automatically if you don't set it).
   */
  photos: {
    "01.jpg": { title: "Where it started", date: "May 2026", caption: "Write a line about this photo here." },
    "02.jpg": { title: "Our first date", date: "June 2026", caption: "" },
    // "03.jpg": { title: "…", date: "…", caption: "…", room: "gallery" },
  } as Record<string, { title?: string; date?: string; caption?: string; room?: RoomId }>,

  letter: `Lakshmi,

Five months. 153 days. It doesn't sound like much written down, but it already holds so many of my favourite memories.

I built this little museum so we'd have somewhere to keep them: every photo on these walls is a day I never want to forget. Walk through it slowly, and when you get to the dance floor, our song is waiting.

Thank you for every call, every laugh, and every ordinary day you've made feel special.

Here's to many more months, and many more rooms to fill.

Always yours,
Tanmay`,
};
