# Museum of Us

> I was making something for you.

A little 3D museum for Lakshmi, for our 5-month anniversary (153 days, since 30 May 2026). She opens the link or scans the heart-shaped QR code, reads a little chat reveal, and walks through the gallery with Tanmay as two small avatars: photos on the walls, our video on the cinema screen, "Yellow" on the dance floor, and a letter in the last room.

Built with Next.js 16, TypeScript, Tailwind CSS v4, React Three Fiber, drei and Zustand.

## Make it yours: where to put photos, video, words

You only touch **three folders and one file**:

```
public/museum/photos/        ← your photos (up to 12)
public/museum/video/         ← one video
public/museum/song/          ← optional MP3 (otherwise Spotify "Yellow" is used)
src/content/museum.config.ts ← names, date, captions, the letter
```

### 1. Add your photos

1. Put up to **12 photos** in `public/museum/photos/` (JPG, PNG or WEBP).
2. Name them in the order you want them hung: `01.jpg`, `02.jpg`, `03.jpg` … `12.jpg`.
   - Photos 1–2 go in the Entrance Hall, 3–9 in the Photo Gallery, 10 in the Cinema Room and 11–12 in the Dance & Letter Room. You can change any photo's room in step 4.
3. **iPhone users:** HEIC photos don't show in browsers. Export or convert them to JPG first. On a Mac, open them in Preview and use File › Export › JPEG. You can also set Settings › Camera › Formats › Most Compatible on the phone.
4. Big photos are fine; they're shrunk automatically for the 3D view.

### 2. Add your video

1. Put **one** video in `public/museum/video/`. Any file name works, for example `our-video.mp4`.
2. Use **MP4 (H.264)**. iPhone `.mov` files often won't play in Chrome or on Android. Convert them with iMovie / QuickTime (File › Export › 1080p) or [HandBrake](https://handbrake.fr), choosing the "Fast 1080p30" preset.
3. Keep it **under about 90 MB**, because GitHub rejects files over 100 MB. One to three minutes is perfect.

### 3. The song

"Yellow" is already set up from Spotify. The Song button and the dance floor start it.

- People logged in to Spotify in that browser hear the full song. Everyone else hears Spotify's 30-second preview.
- If the browser blocks autoplay, a small Spotify player appears; one tap on ▶ starts it.
- If you'd rather use an MP3 you own, drop it in `public/museum/song/`. It's then used instead of Spotify, plays in full and starts instantly.

### 4. Edit the words: `src/content/museum.config.ts`

Open that file in any text editor. It's already filled in with:

| Setting | Current value |
| --- | --- |
| `yourName` / `partnerName` | Tanmay / Lakshmi |
| `occasion` | Happy 5 months, Lakshmi |
| `startDate` | `2026-05-30` (the day counter shows 153 days on 30 Oct 2026 and keeps counting) |
| `song` | Yellow, Coldplay (your Spotify link) |
| `passcode` | `""` (no passcode). Put 4 digits, like `"3005"`, to make her type one. |
| `theme` | `"classic"`, `"blush"` or `"midnight"` |

Then give each photo a title, date and caption. These are matched by **file name**, exactly as in the photos folder:

```ts
photos: {
  "01.jpg": { title: "Where it started", date: "May 2026", caption: "The day you said yes to coffee." },
  "02.jpg": { title: "Our first date", date: "June 2026", caption: "…" },
  "03.jpg": { title: "…", date: "…", caption: "…", room: "dance" },   // room is optional
},
```

Photos without an entry are still hung, titled "Memory 3" and so on.

Finally, **rewrite the `letter`**. There's a draft in there, but it'll mean more in your own words.

### 5. Check it, then put it online

```bash
npm install
npm run dev          # open http://localhost:3000
```

The terminal prints what it found, for example `[museum] 9 photo(s), video: our-video.mp4`. It also warns you about HEIC photos, `.mov` videos or files that are too big. Then:

```bash
git add -A
git commit -m "Add our photos and video"
git push
```

If the project is connected to Vercel (below), the new version goes live automatically in about a minute. Send her the link, or download the heart QR from the Share button and print it or hide it in a card.

> Your museum is the home page (`/`), so the link to send is just your site address, like `https://love-museum.vercel.app`. It's built into the site, so it works on her phone and any other device.

## Put it online (Vercel, free)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import **Love_museum**. Leave every setting as it is and press **Deploy**.
3. A minute later you get a link like `https://love-museum-xyz.vercel.app`. That's what you send her. You can rename the project in Vercel settings to change the link.
4. Every `git push` to `main` updates the site.

Or from the terminal: `npx vercel --prod`.

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
| `/` | **Your museum** (from `src/content/museum.config.ts` + `public/museum/`) |
| `/create` | The builder |
| `/m/[slug]` | Reveal → passcode → the 3D museum |
| `/m/[slug]/gallery` | 2D gallery (fallback for low-end devices, no WebGL) |

The original sample museum (Theo & Maya) is still at **`/m/demo`**, passcode **1234**. The builder at `/create` makes extra museums that are saved only in the browser that created them (see Storage).

## Controls

| | Desktop | Phone |
| --- | --- | --- |
| Walk | `WASD` (`Shift` to hurry), or click the floor | Joystick, bottom left |
| Turn / look | Drag the mouse, `←` `→` | Drag anywhere on the scene |
| Interact | `E` or the on-screen button | The on-screen button |
| View | `V` toggles first/third person | Eye button |
| Back | `Esc` | Close buttons |

Walk up to a frame (or click it) to view a photo, sit on the cinema bench to watch the film, step onto the pink dance floor to dance, and go to the pedestal to read the letter. The HUD has Song, Map (teleport between rooms), Photos (2D grid of every frame) and Share (link + heart QR).

## The sample museum and the builder

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
public/museum/           YOUR photos / video / song files
src/content/             museum.config.ts (your words) + media.generated.json (auto)
src/app/                 routes (/, /create, /m/[slug], /m/[slug]/gallery)
src/components/          RevealChat, HeartQR, PasscodeGate, Gallery2D
src/components/builder/  BuilderForm, PhotoUploader
src/components/museum/   MuseumCanvas, GalleryRoom, FramedPhoto, Avatar, BenchCinema,
                         DanceFloor, LoveLetter, PlayerController, HUD, MobileJoystick,
                         SongPlayer, LoadingScreen, MuseumExperience
src/lib/                 types, demo data, repository, floor plan + collision, store, themes
```

## Known limitations

- Museums made in `/create` are stored per browser (see Storage above). Your main museum isn't affected; it's built into the site.
- Spotify plays the full song only for visitors logged in to Spotify in that browser; others hear a 30-second preview. Drop an MP3 in `public/museum/song/` to avoid this. A YouTube film plays in an overlay player while you sit, not as a texture on the 3D screen.
- Remote video files need CORS headers to appear on the 3D screen. Uploaded files and same-origin files always work.
