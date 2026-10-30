"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartQR } from "@/components/HeartQR";
import { Copy, HeartFill } from "@/components/ui/icons";
import { DEMO_MUSEUM } from "@/lib/demo";
import { compressImage, detectSongKind, detectVideoKind } from "@/lib/media";
import { makeSlug, repo } from "@/lib/repo";
import { SCENE_THEMES } from "@/lib/themes";
import type { Museum, Song, ThemeId, MemoryVideo } from "@/lib/types";
import { type DraftPhoto, PhotoUploader } from "./PhotoUploader";

type MediaMode = "none" | "file" | "url";

const SHIRTS = ["#3d5a80", "#e8a0b4", "#a8436a", "#6a8f6b", "#c9a35a", "#2a2124", "#f0e6da", "#7b6bb0"];
const SECTIONS = [
  ["you", "You two"],
  ["photos", "Photos"],
  ["film", "Memory film"],
  ["song", "Our song"],
  ["letter", "Love letter"],
  ["look", "Look & feel"],
] as const;

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-8 py-12 first:pt-0">
      <h2 id={`${id}-h`} className="text-3xl sm:text-4xl">{title}</h2>
      {hint && <p className="mt-2 text-ink-soft max-w-[56ch]">{hint}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function ModeSwitch({ value, onChange, label }: { value: MediaMode; onChange: (m: MediaMode) => void; label: string }) {
  const opts: [MediaMode, string][] = [["file", "Upload a file"], ["url", "Paste a link"], ["none", "Skip"]];
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-stone p-1 gap-1">
      {opts.map(([m, l]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={`rounded-full px-4 min-h-10 text-sm font-semibold transition-colors ${value === m ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function BuilderForm() {
  const [yourName, setYourName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [occasion, setOccasion] = useState("Happy anniversary");
  const [title, setTitle] = useState("The Museum of Us");
  const [passcode, setPasscode] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [videoMode, setVideoMode] = useState<MediaMode>("file");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("Our memory film");
  const [songMode, setSongMode] = useState<MediaMode>("file");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songUrl, setSongUrl] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [letter, setLetter] = useState("");
  const [theme, setTheme] = useState<ThemeId>("classic");
  const [youShirt, setYouShirt] = useState(SHIRTS[0]);
  const [partnerShirt, setPartnerShirt] = useState(SHIRTS[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Museum | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  // Warn before leaving with unsaved work.
  const dirty = !created && (photos.length > 0 || yourName !== "" || partnerName !== "" || letter !== "");
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const fillDemo = () => {
    const d = DEMO_MUSEUM;
    setYourName(d.yourName);
    setPartnerName(d.partnerName);
    setStartDate(d.startDate);
    setOccasion(d.occasion);
    setTitle(d.title);
    setPhotos(d.photos.map((p) => ({ id: `${p.id}-${Date.now()}`, preview: p.src, title: p.title, caption: p.caption, date: p.date, room: p.room })));
    setVideoMode("url");
    setVideoUrl(d.video!.src);
    setVideoTitle(d.video!.title || "");
    setSongMode("url");
    setSongUrl(d.song!.src);
    setSongTitle(d.song!.title);
    setLetter(d.letter);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fail = (msg: string, field: string) => {
      setError(msg);
      document.getElementById(field)?.focus();
    };
    if (!yourName.trim()) return fail("Add your name so it can go on the welcome wall.", "yourName");
    if (!partnerName.trim()) return fail("Add their name so the museum knows who it's for.", "partnerName");
    if (!photos.length) return fail("Add at least one photo for the walls.", "photo-url");
    if (passcode && !/^\d{4}$/.test(passcode)) return fail("Use exactly 4 digits for the passcode, or leave it empty.", "passcode");
    if (videoMode === "file" && videoFile && videoFile.size > 150 * 1024 * 1024) return fail("That film is over 150\u00a0MB. Try a shorter clip, or paste a YouTube link instead.", "videoFile");
    setBusy(true);
    try {
      const savedPhotos = await Promise.all(
        photos.map(async (p, i) => ({
          id: `p${i + 1}`,
          src: p.file ? await repo.putMedia(await compressImage(p.file)) : p.preview,
          title: p.title.trim() || `Memory ${i + 1}`,
          caption: p.caption.trim(),
          date: p.date.trim(),
          room: p.room,
        })),
      );
      let video: MemoryVideo | undefined;
      if (videoMode === "file" && videoFile) video = { src: await repo.putMedia(videoFile), kind: "file", title: videoTitle.trim() };
      else if (videoMode === "url" && videoUrl.trim()) video = { src: videoUrl.trim(), kind: detectVideoKind(videoUrl.trim()), title: videoTitle.trim() };
      let song: Song | undefined;
      if (songMode === "file" && songFile) song = { src: await repo.putMedia(songFile), kind: "audio", title: songTitle.trim() || songFile.name.replace(/\.[^.]+$/, "") };
      else if (songMode === "url" && songUrl.trim()) song = { src: songUrl.trim(), kind: detectSongKind(songUrl.trim()), title: songTitle.trim() || "Our song" };

      const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
      const museum: Museum = {
        slug: makeSlug(yourName, partnerName),
        title: title.trim() || "The Museum of Us",
        yourName: yourName.trim(),
        partnerName: partnerName.trim(),
        occasion: occasion.trim() || "For you",
        startDate,
        passcode: passcode || undefined,
        theme,
        photos: savedPhotos,
        video,
        song,
        letter: letter.trim() || `${partnerName.trim()},\n\nI made this for you.\n\n${yourName.trim()}`,
        avatars: { you: { initials: initials(yourName), shirt: youShirt }, partner: { initials: initials(partnerName), shirt: partnerShirt } },
        createdAt: new Date().toISOString(),
      };
      await repo.save(museum);
      setCreated(museum);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Your browser ran out of storage. Try fewer or smaller files."
          : "Something went wrong saving your museum. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const link = `${origin}/m/${created.slug}`;
    return (
      <main className="min-h-[100svh] bg-paper text-ink px-[var(--gutter)] py-14 sm:py-20" data-theme={created.theme}>
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-[1fr_auto] gap-12 items-center">
          <div className="anim-rise">
            <h1 className="text-[clamp(2.6rem,6vw,5rem)]">Your museum is ready</h1>
            <p className="mt-6 text-lg max-w-[44ch]">
              Send {created.partnerName} the link, or print the heart and hide it somewhere they&apos;ll find it.
              {created.passcode ? ` They'll need the passcode ${created.passcode}.` : ""}
            </p>
            <label htmlFor="new-link" className="label mt-10">Shareable link</label>
            <div className="flex gap-2 max-w-xl">
              <input id="new-link" readOnly value={link} className="field text-sm" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                  } catch {
                    /* field is selectable */
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Copy size={16} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="hint max-w-xl">
              Saved in this browser for now, so the link opens on this device. Connect Supabase or Firebase (see README) to share it across devices.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`/m/${created.slug}`} className="btn btn-primary min-h-[52px] px-7"><HeartFill size={18} /> Open it like they will</Link>
              <Link href={`/m/${created.slug}?enter=1`} className="btn btn-quiet min-h-[52px]">Go straight in</Link>
              <button type="button" className="btn btn-ghost min-h-[52px]" onClick={() => setCreated(null)}>Edit details</button>
            </div>
          </div>
          <HeartQR url={link} size={280} showDownload fileName={`${created.slug}-heart-qr.png`} />
        </div>
      </main>
    );
  }

  return (
    <main id="content" className="px-[var(--gutter)] pb-24">
      <a href="#you" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">Skip to the form</a>
      <header className="flex items-center justify-between py-5 max-w-[1240px] mx-auto">
        <Link href="/" className="display text-xl flex items-center gap-2">
          <HeartFill size={18} className="text-blush" /> Museum of Us
        </Link>
        <Link href="/m/demo" className="btn btn-ghost text-sm">See the demo</Link>
      </header>

      <div className="max-w-[1240px] mx-auto grid lg:grid-cols-[320px_1fr] gap-10 lg:gap-20 pt-8">
        <aside className="lg:sticky lg:top-8 self-start">
          <h1 className="text-[clamp(2.6rem,5vw,4rem)]">Build your museum</h1>
          <p className="mt-5 text-lg">Everything stays in your browser until you share the link.</p>
          <button type="button" className="btn btn-quiet mt-6" onClick={fillDemo}>Fill with demo content</button>
          <nav aria-label="Builder sections" className="hidden lg:block mt-10">
            <ol className="flex flex-col gap-1">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="block rounded-md px-3 py-2 text-ink-soft hover:text-ink hover:bg-stone transition-colors">{label}</a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <form onSubmit={submit} noValidate className="min-w-0 max-w-[760px]">
          <Section id="you" title="You two">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="yourName">Your name</label>
                <input id="yourName" name="yourName" className="field" required autoComplete="given-name" value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Theo…" />
              </div>
              <div>
                <label className="label" htmlFor="partnerName">Their name</label>
                <input id="partnerName" name="partnerName" autoComplete="off" className="field" required value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Maya…" />
              </div>
              <div>
                <label className="label" htmlFor="startDate">Together since</label>
                <input id="startDate" name="startDate" autoComplete="off" type="date" className="field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="occasion">Occasion</label>
                <input id="occasion" name="occasion" autoComplete="off" className="field" list="occasions" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
                <datalist id="occasions">
                  <option value="Happy anniversary" />
                  <option value="Happy birthday" />
                  <option value="Happy Valentine's Day" />
                  <option value="Counting down until I see you" />
                </datalist>
              </div>
              <div>
                <label className="label" htmlFor="title">Museum title</label>
                <input id="title" name="title" autoComplete="off" className="field" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="passcode">Passcode (optional)</label>
                <input id="passcode" name="passcode" autoComplete="off" spellCheck={false} className="field tracking-[0.3em]" inputMode="numeric" maxLength={4} value={passcode} onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))} placeholder="••••" aria-describedby="passcode-hint" />
                <p className="hint" id="passcode-hint">4 digits. Leave empty to let anyone with the link in.</p>
              </div>
            </div>
          </Section>

          <Section id="photos" title="Photos" hint="Each one gets a gold frame and a plaque. Drag to reorder, and choose the room it hangs in.">
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </Section>

          <Section id="film" title="Memory film" hint="Plays on the cinema screen when you sit on the bench together.">
            <ModeSwitch value={videoMode} onChange={setVideoMode} label="Film source" />
            <div className="mt-5 grid gap-5">
              {videoMode === "file" && (
                <div>
                  <label className="label" htmlFor="videoFile">Video file</label>
                  <input id="videoFile" type="file" accept="video/mp4,video/webm,video/quicktime" className="field file:mr-4 file:rounded-full file:border-0 file:bg-stone file:px-4 file:py-2 file:font-semibold" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} aria-describedby="video-hint" />
                  <p className="hint" id="video-hint">MP4 or WebM, up to 150 MB. A minute or two is perfect.</p>
                </div>
              )}
              {videoMode === "url" && (
                <div>
                  <label className="label" htmlFor="videoUrl">Video link</label>
                  <input id="videoUrl" name="videoUrl" type="url" autoComplete="off" spellCheck={false} className="field" placeholder="https://youtube.com/watch?v=… or a direct .mp4 link" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                </div>
              )}
              {videoMode !== "none" && (
                <div>
                  <label className="label" htmlFor="videoTitle">Film title</label>
                  <input id="videoTitle" name="videoTitle" autoComplete="off" className="field" value={videoTitle} maxLength={50} onChange={(e) => setVideoTitle(e.target.value)} />
                </div>
              )}
            </div>
          </Section>

          <Section id="song" title="Our song" hint="Plays from the Song button and on the dance floor.">
            <ModeSwitch value={songMode} onChange={setSongMode} label="Song source" />
            <div className="mt-5 grid gap-5">
              {songMode === "file" && (
                <div>
                  <label className="label" htmlFor="songFile">Audio file</label>
                  <input id="songFile" type="file" accept="audio/*" className="field file:mr-4 file:rounded-full file:border-0 file:bg-stone file:px-4 file:py-2 file:font-semibold" onChange={(e) => setSongFile(e.target.files?.[0] ?? null)} />
                </div>
              )}
              {songMode === "url" && (
                <div>
                  <label className="label" htmlFor="songUrl">Song link</label>
                  <input id="songUrl" name="songUrl" type="url" autoComplete="off" spellCheck={false} className="field" placeholder="YouTube, Spotify, or a direct .mp3 link" value={songUrl} onChange={(e) => setSongUrl(e.target.value)} aria-describedby="song-hint" />
                  <p className="hint" id="song-hint">Spotify plays inside its own player in the museum; YouTube and audio files play with the Song button.</p>
                </div>
              )}
              {songMode !== "none" && (
                <div>
                  <label className="label" htmlFor="songTitle">Song title</label>
                  <input id="songTitle" name="songTitle" autoComplete="off" className="field" value={songTitle} maxLength={60} onChange={(e) => setSongTitle(e.target.value)} placeholder="The one from the kitchen…" />
                </div>
              )}
            </div>
          </Section>

          <Section id="letter" title="Love letter" hint="Framed on the wall of the last room, and opened from the pedestal.">
            <label className="sr-only" htmlFor="letterText">Your letter</label>
            <textarea id="letterText" name="letter" className="field font-[family-name:var(--font-display)] text-lg" rows={10} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder={`${partnerName || "Dear you"},\n\n…`} />
          </Section>

          <Section id="look" title="Look & feel">
            <fieldset>
              <legend className="label">Theme</legend>
              <div className="grid sm:grid-cols-3 gap-3">
                {(Object.keys(SCENE_THEMES) as ThemeId[]).map((id) => {
                  const t = SCENE_THEMES[id];
                  return (
                    <label key={id} className={`cursor-pointer rounded-xl p-4 transition-colors ${theme === id ? "bg-blush-soft ring-2 ring-rose" : "bg-stone hover:bg-stone-2"}`}>
                      <input type="radio" name="theme" value={id} checked={theme === id} onChange={() => setTheme(id)} className="sr-only" />
                      <span className="flex h-16 rounded-md overflow-hidden">
                        <span className="flex-[3]" style={{ background: t.swatch[0] }} />
                        <span className="flex-1" style={{ background: t.swatch[1] }} />
                      </span>
                      <span className="mt-3 block font-semibold">{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              {[
                ["Your shirt", youShirt, setYouShirt],
                ["Their shirt", partnerShirt, setPartnerShirt],
              ].map(([label, value, set]) => (
                <fieldset key={label as string}>
                  <legend className="label">{label as string}</legend>
                  <div className="flex flex-wrap gap-2">
                    {SHIRTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`${label} colour ${c}`}
                        aria-pressed={value === c}
                        onClick={() => (set as (v: string) => void)(c)}
                        className={`w-10 h-10 rounded-full transition-transform ${value === c ? "ring-2 ring-offset-2 ring-rose ring-offset-paper scale-110" : "hover:scale-105"}`}
                        style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Section>

          <div className="sticky bottom-0 -mx-[var(--gutter)] px-[var(--gutter)] py-4 bg-paper" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
            {error && <p role="alert" className="mb-3 font-medium text-rose">{error}</p>}
            <button type="submit" className="btn btn-primary w-full sm:w-auto min-h-[54px] px-8 text-base" disabled={busy}>
              <HeartFill size={18} /> {busy ? "Saving your museum…" : "Create our museum"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
