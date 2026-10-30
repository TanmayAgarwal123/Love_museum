// Scans public/museum/ for your photos, videos and (optional) song file, makes
// web-sized copies of the photos, and writes src/content/media.generated.json.
// Runs automatically before `npm run dev` and `npm run build`, so you only
// ever drop files into folders.
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PUB = path.join(ROOT, "public", "museum");
const WEB = path.join(PUB, "_web", "photos"); // generated, not committed
const MAX_PHOTOS = 41; // frames on the walls
const MAX_VIDEOS = 8;
const WEB_SIZE = 1600; // longest edge of the web copy, px

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const list = (dir, exts) => {
  const d = path.join(PUB, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => !f.startsWith(".") && exts.includes(path.extname(f).toLowerCase()))
    .sort(byName);
};
const warn = (m) => console.warn(`\x1b[33m[museum]\x1b[0m ${m}`);
const mb = (dir, f) => statSync(path.join(PUB, dir, f)).size / 1e6;

const photos = list("photos", [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);
const videos = list("video", [".mp4", ".webm", ".m4v", ".mov"]);
const songs = list("song", [".mp3", ".m4a", ".aac", ".ogg", ".wav"]);

const heic = existsSync(path.join(PUB, "photos")) ? readdirSync(path.join(PUB, "photos")).filter((f) => /\.(heic|heif)$/i.test(f)) : [];
if (heic.length) warn(`Browsers can't show HEIC photos. Export these as JPG: ${heic.join(", ")}`);
if (!photos.length) warn("No photos in public/museum/photos/ yet. Using placeholder art for now.");
if (photos.length > MAX_PHOTOS) warn(`Found ${photos.length} photos; the walls hold ${MAX_PHOTOS}. The first ${MAX_PHOTOS} by file name are hung.`);
if (!videos.length) warn("No videos in public/museum/video/ yet. Using the placeholder film for now.");
if (videos.length > MAX_VIDEOS) warn(`Found ${videos.length} videos; using the first ${MAX_VIDEOS}.`);
for (const v of videos) {
  const size = mb("video", v);
  if (size > 95) warn(`${v} is ${size.toFixed(0)} MB. GitHub refuses files over 100 MB; export a smaller MP4.`);
  else if (size > 60) warn(`${v} is ${size.toFixed(0)} MB. It works, but a smaller file starts faster on a phone.`);
  if (/\.mov$/i.test(v)) warn(`${v} is a .mov. Chrome and Android often can't play these; export it as MP4 (H.264).`);
}

// Web-sized copies: auto-rotated (phone EXIF), max 1600px, JPEG. Cached by mtime.
let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  warn("Image resizing unavailable (sharp not installed); using original photos.");
}
mkdirSync(WEB, { recursive: true });
const hung = photos.slice(0, MAX_PHOTOS);
const out = [];
for (const file of hung) {
  const src = path.join(PUB, "photos", file);
  const webName = `${file.replace(/\.[^.]+$/, "")}.jpg`;
  const dst = path.join(WEB, webName);
  let web = null;
  if (sharp) {
    try {
      if (!existsSync(dst) || statSync(dst).mtimeMs < statSync(src).mtimeMs) {
        await sharp(src).rotate().resize(WEB_SIZE, WEB_SIZE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(dst);
      }
      web = `_web/photos/${webName}`;
    } catch (e) {
      warn(`Couldn't resize ${file} (${e.message}); using the original.`);
    }
  }
  out.push({ file, src: web ?? `photos/${file}` });
}
// Remove web copies of photos that were deleted or renamed.
const keep = new Set(out.map((p) => path.basename(p.src)));
for (const f of readdirSync(WEB)) if (!keep.has(f)) rmSync(path.join(WEB, f));

const manifest = {
  photos: out,
  videos: videos.slice(0, MAX_VIDEOS),
  song: songs[0] ?? null,
};
writeFileSync(path.join(ROOT, "src/content/media.generated.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[museum] ${manifest.photos.length} photo(s), ${manifest.videos.length} video(s)${manifest.videos.length ? ` (${manifest.videos.join(", ")})` : ""}, song file: ${manifest.song ?? "none (Spotify)"}`,
);
