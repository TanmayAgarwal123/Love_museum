# Museum of Us

> I was making something for you.

A personalised 3D museum you build for your partner. They open a link or scan a heart-shaped QR code, read a little chat reveal, and walk through white gallery rooms with you as two small avatars: framed photos with museum plaques, a cinema bench where your memory film plays, a dance floor for your song, and a love letter in the last room.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, React Three Fiber, drei, and Zustand.

## Run it locally

```bash
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Routes:

| Route | What it is |
| --- | --- |
| `/` | Reveal for the demo museum, plus "make one for your person" |
| `/create` | The builder |
| `/m/[slug]` | Reveal → passcode → the 3D museum |
| `/m/[slug]/gallery` | 2D gallery (fallback for low-end devices, no WebGL) |

The demo lives at **`/m/demo`**. Its passcode is **1234**, and the demo shows it on screen.

## Controls

| | Desktop | Phone |
| --- | --- | --- |
| Walk | `WASD` (`Shift` to hurry), or click the floor | Joystick, bottom left |
| Turn / look | Drag the mouse, `←` `→` | Drag anywhere on the scene |
| Interact | `E` or the on-screen button | The on-screen button |
| View | `V` toggles first/third person | Eye button |
| Back | `Esc` | Close buttons |

Walk up to a frame (or click it) to view a photo, sit on the cinema bench to watch the film, step onto the pink dance floor to dance, and go to the pedestal to read the letter. The HUD has Song, Map (teleport between rooms), Photos (2D grid of every frame) and Share (link + heart QR).

## Personalise the demo

Two options:

1. **Use the builder** at `/create`. Add your names, date, up to 12 photos (each with a title, date, caption and room), a film (upload, or paste a YouTube/Vimeo/MP4 link), your song (upload an MP3, or paste a YouTube/Spotify/audio link), a letter, a theme and shirt colours. You get a unique link and a downloadable heart QR PNG.
2. **Edit the seeded demo**: open `src/lib/demo.ts`. Put your files in `public/` (for example `public/us/beach.jpg`) and reference them as `/us/beach.jpg`, or paste any image URL. The demo always reflects that file.

The demo photos, film and song in `public/demo/` are original illustrations and a music-box waltz made by `scripts/generate-demo-assets.py` (`npm run demo:assets`). Nothing is hotlinked.

## Storage, and moving to a real backend

For the MVP, museums are saved **in the browser that created them**: JSON in `localStorage`, and uploaded photos, video and audio as blobs in IndexedDB. **A link you create therefore opens only in that browser.** To share across devices you need a backend. The demo works everywhere because it's bundled with the app.

All persistence goes through one interface, `MuseumRepository`, in `src/lib/repo.ts`:

```ts
interface MuseumRepository {
  list(): Promise<Museum[]>;
  get(slug: string): Promise<Museum | null>;
  save(museum: Museum): Promise<void>;
  remove(slug: string): Promise<void>;
  putMedia(blob: Blob): Promise<MediaRef>;      // returns a ref stored in the Museum
  resolveMedia(ref: MediaRef): Promise<string>; // ref -> loadable URL
}
```

To switch to Supabase: create a `museums` table (`slug text primary key, data jsonb`) and a public storage bucket. Then implement `get`/`save` with `from("museums")`, make `putMedia` upload to the bucket and return the public URL, and let `resolveMedia` return URLs unchanged. Export your implementation as `repo`. Firebase works the same way with Firestore and Storage. Nothing else in the app needs to change.

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo. The framework is detected as Next.js, and no settings or environment variables are needed.
3. Deploy. Your demo is at `https://<project>.vercel.app/m/demo`.

Or from the terminal: `npx vercel` and then `npx vercel --prod`.

## Performance and fallbacks

- If WebGL is unavailable or the 3D view crashes, the visitor is offered the 2D gallery.
- Device pixel ratio is capped at 2. A time-based FPS check (plus drei's `PerformanceMonitor`) switches to low quality (no floor reflections, lower DPR) under 24 fps. If it's still under 20 fps, a banner offers the 2D gallery.
- Photo textures load lazily per frame behind Suspense. The loading screen shows texture progress.
- The floating hearts, the floating envelope and the dance camera orbit stop under `prefers-reduced-motion`.

## Testing

`scripts/e2e.mjs` drives the whole acceptance flow in Chromium at 1440×900 and 390×844. It checks: the reveal, a wrong and a right passcode, walking with the keyboard and the joystick, wall collision, mouse look, clicking frames, focusing 3 photos, the map, sitting with video play/pause, dancing with music, the letter, decoding the heart QR, creating a museum in `/create` and opening it from its link, plus overflow and console errors. It saves screenshots along the way.

```bash
npm run build && npm start &
npm i --no-save jsqr pngjs        # QR decoding for the test
node scripts/e2e.mjs http://localhost:3000 e2e-shots
```

The page exposes `window.__museum` (the simulation and store) so the test can wait on state. That matters because a headless software renderer can run at only a few frames per second.

## Project layout

```
src/app/                 routes (/, /create, /m/[slug], /m/[slug]/gallery)
src/components/          RevealChat, HeartQR, PasscodeGate, Gallery2D
src/components/builder/  BuilderForm, PhotoUploader
src/components/museum/   MuseumCanvas, GalleryRoom, FramedPhoto, Avatar, BenchCinema,
                         DanceFloor, LoveLetter, PlayerController, HUD, MobileJoystick,
                         SongPlayer, LoadingScreen, MuseumExperience
src/lib/                 types, demo data, repository, floor plan + collision, store, themes
```

## Known limitations

- Created museums are stored per browser (see Storage above).
- Spotify doesn't allow scripted playback, so a Spotify song plays from its own embedded player in the Song panel. A YouTube film plays in an overlay player while you sit, not as a texture on the 3D screen.
- Remote video files need CORS headers to appear on the 3D screen. Uploaded files and same-origin files always work.
