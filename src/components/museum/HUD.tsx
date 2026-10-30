"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeartQR } from "@/components/HeartQR";
import {
  ArrowLeft,
  ArrowRight,
  Close,
  Copy,
  Eye,
  Grid,
  HeartFill,
  MapIcon,
  Music,
  Pause,
  Play,
  Share,
  Volume,
} from "@/components/ui/icons";
import type { PlacedPhoto } from "@/lib/floorplan";
import { videoEmbedUrl } from "@/lib/media";
import { interact, media, teleport, teleportTo, useMuseum, type Panel } from "@/lib/store";
import { ROOMS, type Museum } from "@/lib/types";
import { MobileJoystick } from "./MobileJoystick";

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const on = () => setTouch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return touch;
}

function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4 anim-fade" style={{ background: "var(--overlay)" }} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`anim-pop relative w-full ${wide ? "max-w-4xl" : "max-w-md"} max-h-[86svh] overflow-y-auto overscroll-contain rounded-xl bg-paper text-ink p-6 sm:p-8 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 className="text-3xl sm:text-4xl">{title}</h2>
          <button type="button" onClick={onClose} className="hud-btn shrink-0" aria-label="Close">
            <Close size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function focusPhoto(p: PlacedPhoto) {
  const { slot } = p;
  useMuseum.getState().set({ focusedPhotoId: p.photo.id, panel: null, sitting: false, dancing: false });
  teleportTo(slot.x + slot.nx * 1.5, slot.z + slot.nz * 1.5, Math.atan2(slot.nx, slot.nz));
}

export function HUD({ museum, placed, shareUrl }: { museum: Museum; placed: PlacedPhoto[]; shareUrl: string }) {
  const s = useMuseum();
  const touch = useIsTouch();
  const [roomToast, setRoomToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const firstRoom = useRef(true);

  useEffect(() => {
    if (firstRoom.current) {
      firstRoom.current = false;
      return;
    }
    const name = ROOMS.find((r) => r.id === s.room)?.name ?? null;
    setRoomToast(name);
    const t = setTimeout(() => setRoomToast(null), 2200);
    return () => clearTimeout(t);
  }, [s.room]);

  const focusedIndex = placed.findIndex((p) => p.photo.id === s.focusedPhotoId);
  const focused = focusedIndex >= 0 ? placed[focusedIndex] : null;
  const embedUrl = useMemo(
    () => (museum.video && museum.video.kind !== "file" ? videoEmbedUrl(museum.video.kind, museum.video.src) : null),
    [museum.video],
  );

  const togglePanel = (p: Panel) => s.set({ panel: s.panel === p ? null : p });
  const toggleSong = () => s.set({ songPlaying: !s.songPlaying });

  const busy = s.sitting || s.dancing || !!focused || s.letterOpen;
  const prompt = !busy && s.near ? s.near : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-[#2a2124]">
      {/* top bar */}
      <div className="absolute top-0 inset-x-0 flex items-start justify-between gap-3 p-3 sm:p-5" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <div className="pointer-events-auto min-w-0 flex-1 sm:flex-none rounded-xl bg-[rgba(251,249,246,0.92)] px-3 sm:px-4 py-2 sm:py-2.5 sm:max-w-sm">
          <p className="display text-base sm:text-2xl leading-tight truncate">{museum.title}</p>
          <p className="text-xs sm:text-sm text-[#66575c] truncate">
            {museum.yourName} &amp; {museum.partnerName}
            <span className="hidden sm:inline"> · {ROOMS.find((r) => r.id === s.room)?.name}</span>
          </p>
        </div>
        <nav aria-label="Museum controls" className="pointer-events-auto flex shrink-0 justify-end gap-1.5 sm:gap-2">
          {museum.song && (
            <button type="button" className="hud-btn" onClick={toggleSong} aria-pressed={s.songPlaying} aria-label={s.songPlaying ? "Pause our song" : "Play our song"}>
              {s.songPlaying ? <Pause size={16} /> : <Music size={16} />}
              <span className="hidden md:inline">{s.songPlaying ? "Pause song" : "Our song"}</span>
            </button>
          )}
          <button type="button" className="hud-btn" onClick={() => togglePanel("map")} aria-label="Map" aria-pressed={s.panel === "map"}>
            <MapIcon size={16} /> <span className="hidden md:inline">Map</span>
          </button>
          <button type="button" className="hud-btn" onClick={() => togglePanel("photos")} aria-label="All photos" aria-pressed={s.panel === "photos"}>
            <Grid size={16} /> <span className="hidden md:inline">Photos</span>
          </button>
          <button type="button" className="hud-btn" onClick={() => togglePanel("share")} aria-label="Share" aria-pressed={s.panel === "share"}>
            <Share size={16} /> <span className="hidden md:inline">Share</span>
          </button>
          <button type="button" className="hud-btn" onClick={s.toggleView} aria-label={s.view === "third" ? "Switch to first-person view" : "Switch to third-person view"}>
            <Eye size={16} /> <span className="hidden md:inline">{s.view === "third" ? "1st person" : "3rd person"}</span>
          </button>
        </nav>
      </div>

      {/* room toast */}
      <div aria-live="polite" className="absolute top-24 sm:top-24 inset-x-0 flex justify-center">
        {roomToast && !busy && (
          <p key={roomToast} className="anim-rise display text-2xl sm:text-4xl text-[#2a2124] bg-[rgba(251,249,246,0.86)] rounded-full px-6 py-2">
            {roomToast}
          </p>
        )}
      </div>

      {/* slow device warning */}
      {s.slowWarning && (
        <div className="pointer-events-auto absolute top-24 left-1/2 -translate-x-1/2 w-[min(92vw,460px)] rounded-xl bg-[#fbf9f6] px-4 py-3 shadow-lg flex items-center gap-3 anim-rise">
          <p className="text-sm flex-1">Running slowly on this device? The 2D gallery has everything too.</p>
          <Link href={`/m/${museum.slug}/gallery`} className="btn btn-primary min-h-9 px-4 text-sm">View 2D</Link>
          <button type="button" className="hud-btn" aria-label="Dismiss" onClick={() => s.set({ slowWarning: false })}>
            <Close size={16} />
          </button>
        </div>
      )}

      {/* bottom area */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 flex items-end justify-between gap-3" style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}>
        <div className="pointer-events-auto">
          {touch && !busy ? (
            <MobileJoystick />
          ) : (
            !busy && (
              <p className="hidden sm:block rounded-xl bg-[rgba(251,249,246,0.86)] px-4 py-2.5 text-sm text-[#4a3d41] max-w-md">
                <kbd className="font-semibold">WASD</kbd> walk · <kbd className="font-semibold">←→</kbd> turn · drag to look · click the floor to walk there · <kbd className="font-semibold">E</kbd> interact · <kbd className="font-semibold">V</kbd> view · <kbd className="font-semibold">Esc</kbd> back
              </p>
            )
          )}
        </div>

        <div className={`pointer-events-auto flex flex-col items-end gap-2 ${touch ? "" : "absolute left-1/2 -translate-x-1/2 bottom-5 items-center"}`}>
          {prompt && (
            <button type="button" className="btn btn-primary min-h-[52px] px-6 text-base shadow-lg anim-pop" onClick={() => interact(prompt)}>
              {prompt.label}
              {!touch && <kbd className="ml-1 rounded bg-white/25 px-2 py-0.5 text-sm">E</kbd>}
            </button>
          )}
          {s.sitting && (
            <div className="flex flex-wrap justify-center gap-2 anim-pop">
              {museum.video?.kind === "file" && (
                <>
                  <button type="button" className="hud-btn min-h-12 px-5" onClick={() => (media.video?.paused ? media.video.play() : media.video?.pause())}>
                    {s.videoPlaying ? <Pause size={16} /> : <Play size={16} />} {s.videoPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="hud-btn min-h-12 px-5"
                    aria-label={s.videoMuted ? "Unmute film" : "Mute film"}
                    onClick={() => media.video && (media.video.muted = !media.video.muted)}
                  >
                    <Volume size={16} muted={s.videoMuted} /> {s.videoMuted ? "Sound on" : "Mute"}
                  </button>
                </>
              )}
              <button type="button" className="btn btn-primary min-h-12" onClick={() => s.set({ sitting: false })}>
                Stand up {!touch && <kbd className="rounded bg-white/25 px-2 py-0.5 text-sm">E</kbd>}
              </button>
            </div>
          )}
          {s.dancing && (
            <div className="flex flex-wrap justify-center gap-2 anim-pop">
              {museum.song && (
                <button type="button" className="hud-btn min-h-12 px-5" onClick={toggleSong}>
                  {s.songPlaying ? <Pause size={16} /> : <Play size={16} />} {s.songPlaying ? "Pause song" : "Play song"}
                </button>
              )}
              <button type="button" className="btn btn-primary min-h-12" onClick={() => s.set({ dancing: false })}>
                Stop dancing {!touch && <kbd className="rounded bg-white/25 px-2 py-0.5 text-sm">E</kbd>}
              </button>
            </div>
          )}
        </div>
        <div className="hidden sm:block w-10" />
      </div>

      {/* embedded film (YouTube / Vimeo) while sitting */}
      {s.sitting && embedUrl && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] w-[min(92vw,960px)] aspect-video rounded-lg overflow-hidden shadow-2xl bg-black anim-pop">
          <iframe src={embedUrl} title={museum.video?.title || "Our memory film"} allow="autoplay; encrypted-media; fullscreen" allowFullScreen className="w-full h-full" />
        </div>
      )}

      {/* focused photo card */}
      {focused && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label={focused.photo.title}
          className="pointer-events-auto absolute anim-rise bg-[#fbf9f6] text-[#2a2124] shadow-2xl inset-x-3 bottom-3 rounded-xl max-h-[62svh] overflow-y-auto overscroll-contain sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-[380px] sm:max-h-[calc(100svh-8rem)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={focused.photo.src} alt={focused.photo.title} width={1200} height={900} className="w-full aspect-[4/3] object-cover rounded-t-xl bg-[#efe8df]" />
          <div className="p-5">
            <p className="text-sm font-semibold text-[#8c6a2f]">{focused.photo.date}</p>
            <h2 className="mt-1 text-3xl">{focused.photo.title}</h2>
            <p className="mt-3 text-[1.02rem] leading-relaxed">{focused.photo.caption}</p>
            <div className="mt-5 flex items-center gap-2">
              <button type="button" className="hud-btn bg-[#f1ebe4]" aria-label="Previous photo" onClick={() => focusPhoto(placed[(focusedIndex - 1 + placed.length) % placed.length])}>
                <ArrowLeft size={18} />
              </button>
              <span className="text-sm text-[#66575c] tabular-nums">
                {focusedIndex + 1} of {placed.length}
              </span>
              <button type="button" className="hud-btn bg-[#f1ebe4]" aria-label="Next photo" onClick={() => focusPhoto(placed[(focusedIndex + 1) % placed.length])}>
                <ArrowRight size={18} />
              </button>
              <button type="button" className="btn btn-primary ml-auto min-h-10" onClick={() => s.set({ focusedPhotoId: null })} autoFocus>
                Back to walking
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* letter */}
      {s.letterOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center p-3 sm:p-6 anim-fade" style={{ background: "var(--overlay)" }} onClick={() => s.set({ letterOpen: false })}>
          <article
            role="dialog"
            aria-modal="true"
            aria-label={`A letter for ${museum.partnerName}`}
            onClick={(e) => e.stopPropagation()}
            className="anim-pop relative w-full max-w-2xl max-h-[88svh] overflow-y-auto overscroll-contain rounded-md bg-[#fdf9f3] text-[#2a2124] px-6 py-10 sm:px-14 sm:py-14 shadow-2xl"
          >
            <button type="button" onClick={() => s.set({ letterOpen: false })} className="hud-btn absolute right-4 top-4 bg-[#f1ebe4]" aria-label="Close letter" autoFocus>
              <Close size={18} />
            </button>
            <HeartFill size={28} className="text-[#e8a0b4]" />
            <h2 className="mt-4 text-4xl sm:text-5xl">For {museum.partnerName}</h2>
            <div className="mt-8 font-[family-name:var(--font-display)] italic text-[1.2rem] sm:text-[1.3rem] leading-[1.75] whitespace-pre-line">
              {museum.letter}
            </div>
          </article>
        </div>
      )}

      {/* panels */}
      <div className="pointer-events-auto">
        {s.panel === "map" && (
          <Dialog title="Map" onClose={() => s.set({ panel: null })}>
            <ol className="flex flex-col gap-2">
              {ROOMS.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      s.set({ panel: null, room: r.id, sitting: false, dancing: false });
                      teleport(r.id);
                    }}
                    className={`w-full text-left rounded-lg px-4 py-3.5 transition-colors ${s.room === r.id ? "bg-blush-soft" : "bg-stone hover:bg-stone-2"}`}
                  >
                    <span className="display text-2xl block">{r.name}</span>
                    <span className="text-sm text-ink-soft">
                      {s.room === r.id ? "You are here" : r.blurb}
                      {` · ${placed.filter((p) => p.slot.room === r.id).length} photos`}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Dialog>
        )}
        {s.panel === "photos" && (
          <Dialog title="All photos" onClose={() => s.set({ panel: null })} wide>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {placed.map((p) => (
                <li key={p.photo.id}>
                  <button type="button" onClick={() => focusPhoto(p)} className="group w-full text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo.src} alt="" loading="lazy" width={400} height={300} className="w-full aspect-[4/3] object-cover rounded-md bg-stone transition-transform duration-200 group-hover:scale-[1.02]" />
                    <span className="mt-2 block font-semibold leading-tight">{p.photo.title}</span>
                    <span className="text-sm text-ink-soft">{p.photo.date}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link href={`/m/${museum.slug}/gallery`} className="btn btn-quiet mt-6">Open the full 2D gallery</Link>
          </Dialog>
        )}
        {s.panel === "share" && (
          <Dialog title="Share" onClose={() => s.set({ panel: null })}>
            <HeartQR url={shareUrl} size={220} showDownload fileName={`${museum.slug}-heart-qr.png`} />
            <label className="label mt-6" htmlFor="share-link">Link</label>
            <div className="flex gap-2">
              <input id="share-link" readOnly value={shareUrl} className="field text-sm" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                  } catch {
                    /* clipboard blocked: the field is selectable */
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Copy size={16} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {!museum.isDemo && (
              <p className="hint">This museum is saved in this browser. Connect a database (see the README) to open it on other devices.</p>
            )}
          </Dialog>
        )}
      </div>
    </div>
  );
}
