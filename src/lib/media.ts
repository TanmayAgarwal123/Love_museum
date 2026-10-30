import type { SongKind, VideoKind } from "./types";

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function spotifyEmbed(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null;
}

export function spotifyUri(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

export function detectVideoKind(url: string): VideoKind {
  if (youtubeId(url)) return "youtube";
  if (vimeoId(url)) return "vimeo";
  return "file";
}

export function detectSongKind(url: string): SongKind {
  if (youtubeId(url)) return "youtube";
  if (spotifyEmbed(url)) return "spotify";
  return "audio";
}

export function videoEmbedUrl(kind: VideoKind, src: string, autoplay = true): string | null {
  if (kind === "youtube") {
    const id = youtubeId(src);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&playsinline=1&rel=0&enablejsapi=1` : null;
  }
  if (kind === "vimeo") {
    const id = vimeoId(src);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=${autoplay ? 1 : 0}` : null;
  }
  return null;
}

/** Downscale an uploaded image so a dozen photos stay light in IndexedDB and as GPU textures. */
export async function compressImage(file: Blob, max = 1600, quality = 0.86): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
  );
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function formatLongDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function daysTogether(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}
