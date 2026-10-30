// Scans public/museum/ for your photos, video and (optional) song file and
// writes src/content/media.generated.json. Runs automatically before
// `npm run dev` and `npm run build`, so you only ever drop files in folders.
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PUB = path.join(ROOT, "public", "museum");
const list = (dir, exts) => {
  const d = path.join(PUB, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => !f.startsWith(".") && exts.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
};

const photoExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];
const photos = list("photos", photoExts);
const videos = list("video", [".mp4", ".webm", ".m4v", ".mov"]);
const songs = list("song", [".mp3", ".m4a", ".aac", ".ogg", ".wav"]);

const warn = (m) => console.warn(`\x1b[33m[museum]\x1b[0m ${m}`);
const unsupported = existsSync(path.join(PUB, "photos"))
  ? readdirSync(path.join(PUB, "photos")).filter((f) => /\.(heic|heif)$/i.test(f))
  : [];
if (unsupported.length) warn(`Browsers can't show HEIC photos. Export these as JPG: ${unsupported.join(", ")}`);
if (!photos.length) warn("No photos in public/museum/photos/ yet. Using placeholder art for now.");
if (photos.length > 12) warn(`Found ${photos.length} photos. Only the first 12 (by file name) are hung.`);
if (videos.length > 1) warn(`Found ${videos.length} videos. Using ${videos[0]}.`);
for (const v of videos) {
  const mb = statSync(path.join(PUB, "video", v)).size / 1e6;
  if (mb > 95) warn(`${v} is ${mb.toFixed(0)} MB. GitHub refuses files over 100 MB; export a smaller MP4.`);
  if (/\.mov$/i.test(v)) warn(`${v} is a .mov. Chrome and Android often can't play these; export it as MP4 (H.264).`);
}
for (const p of photos) {
  const mb = statSync(path.join(PUB, "photos", p)).size / 1e6;
  if (mb > 15) warn(`${p} is ${mb.toFixed(0)} MB. It will work, but a smaller export loads faster.`);
}

const out = {
  photos: photos.slice(0, 12),
  video: videos[0] ?? null,
  song: songs[0] ?? null,
};
writeFileSync(path.join(ROOT, "src/content/media.generated.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`[museum] ${out.photos.length} photo(s), video: ${out.video ?? "none (placeholder)"}, song file: ${out.song ?? "none"}`);
