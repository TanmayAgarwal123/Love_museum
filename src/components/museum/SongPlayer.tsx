"use client";

import { useEffect, useRef, useState } from "react";
import { Close, Music } from "@/components/ui/icons";
import { spotifyEmbed, spotifyUri, youtubeId } from "@/lib/media";
import { useMuseum } from "@/lib/store";
import type { Song } from "@/lib/types";

/**
 * Keeps "our song" playing across the whole visit. `songPlaying` in the store
 * is the single source of truth: audio files, YouTube and Spotify (via the
 * Spotify iFrame API) all follow it.
 */
export function SongPlayer({ song }: { song?: Song }) {
  const playing = useMuseum((s) => s.songPlaying);
  const audio = useRef<HTMLAudioElement>(null);
  const yt = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!song) return;
    if (song.kind === "audio" && audio.current) {
      if (playing) audio.current.play().catch(() => useMuseum.getState().set({ songPlaying: false }));
      else audio.current.pause();
    }
    if (song.kind === "youtube" && yt.current?.contentWindow) {
      yt.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: playing ? "playVideo" : "pauseVideo", args: [] }),
        "*",
      );
    }
  }, [playing, song]);

  if (!song?.src) return null;
  if (song.kind === "audio") {
    return <audio ref={audio} src={song.src} loop preload="auto" />;
  }
  if (song.kind === "youtube") {
    const id = youtubeId(song.src);
    if (!id) return null;
    return (
      <iframe
        ref={yt}
        title="Our song (YouTube)"
        src={`https://www.youtube.com/embed/${id}?enablejsapi=1&loop=1&playlist=${id}&controls=0&playsinline=1`}
        allow="autoplay; encrypted-media"
        className="fixed -left-[9999px] top-0 w-[200px] h-[120px]"
        tabIndex={-1}
        aria-hidden
      />
    );
  }
  return <SpotifyMini song={song} />;
}

// ---------------- Spotify ----------------

interface SpotifyController {
  play(): void;
  resume(): void;
  pause(): void;
  destroy(): void;
  addListener(event: "playback_update" | "ready", cb: (e: { data: { isPaused: boolean } }) => void): void;
}
interface SpotifyIFrameAPI {
  createController(el: HTMLElement, opts: { uri: string; width?: string | number; height?: number }, cb: (c: SpotifyController) => void): void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    __spotifyApi?: Promise<SpotifyIFrameAPI>;
  }
}

function loadSpotifyApi(): Promise<SpotifyIFrameAPI> {
  if (window.__spotifyApi) return window.__spotifyApi;
  window.__spotifyApi = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    s.onerror = () => reject(new Error("Spotify API failed to load"));
    document.body.appendChild(s);
    setTimeout(() => reject(new Error("Spotify API timed out")), 10000);
  });
  window.__spotifyApi.catch(() => (window.__spotifyApi = undefined));
  return window.__spotifyApi;
}

/**
 * A small floating Spotify player. The Song button and the dance floor start
 * and stop it. If the browser blocks autoplay, the card is on screen so one
 * tap on its play button starts the song. (Visitors who aren't logged in to
 * Spotify in that browser hear Spotify's 30-second preview.)
 */
function SpotifyMini({ song }: { song: Song }) {
  const playing = useMuseum((s) => s.songPlaying);
  const panel = useMuseum((s) => s.panel);
  const host = useRef<HTMLDivElement>(null);
  const ctrl = useRef<SpotifyController | null>(null);
  const started = useRef(false);
  const paused = useRef(true);
  const [failed, setFailed] = useState(false);
  const uri = spotifyUri(song.src);

  useEffect(() => {
    if (!uri) return;
    let dead = false;
    loadSpotifyApi()
      .then((api) => {
        if (dead || !host.current) return;
        const el = document.createElement("div");
        host.current.appendChild(el);
        api.createController(el, { uri, width: "100%", height: 80 }, (c) => {
          if (dead) return c.destroy();
          ctrl.current = c;
          c.addListener("playback_update", (e) => {
            const was = paused.current;
            paused.current = e.data.isPaused;
            // Reflect presses on Spotify's own play/pause button in the HUD.
            if (was !== e.data.isPaused) useMuseum.getState().set({ songPlaying: !e.data.isPaused });
          });
          if (useMuseum.getState().songPlaying) {
            c.play();
            started.current = true;
          }
        });
      })
      .catch(() => !dead && setFailed(true));
    return () => {
      dead = true;
      ctrl.current?.destroy();
      ctrl.current = null;
      started.current = false;
    };
  }, [uri]);

  useEffect(() => {
    const c = ctrl.current;
    if (!c) return;
    if (playing) {
      if (!started.current) {
        c.play();
        started.current = true;
      } else if (paused.current) c.resume();
    } else if (!paused.current) c.pause();
  }, [playing]);

  const visible = playing || panel === "song";
  const embed = spotifyEmbed(song.src);
  if (!uri && !embed) return null;

  return (
    <div
      role="region"
      aria-label={`Our song: ${song.title}`}
      aria-hidden={!visible}
      className={`fixed z-30 inset-x-3 top-[68px] sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:w-[340px] rounded-xl bg-[#fbf9f6] text-[#2a2124] shadow-2xl p-2 transition-[opacity,transform] duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none -translate-y-2 sm:translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <Music size={16} />
        <p className="text-sm font-semibold flex-1 min-w-0 truncate">
          {song.title}
          {song.artist ? ` · ${song.artist}` : ""}
        </p>
        <button
          type="button"
          className="hud-btn min-h-8 min-w-8 px-0 bg-[#f1ebe4]"
          aria-label="Hide and pause the song"
          tabIndex={visible ? 0 : -1}
          onClick={() => useMuseum.getState().set({ songPlaying: false, panel: null })}
        >
          <Close size={14} />
        </button>
      </div>
      <div ref={host} className="rounded-lg overflow-hidden min-h-[80px] bg-[#f1ebe4]">
        {failed && embed && (
          <iframe title={`${song.title} on Spotify`} src={embed} width="100%" height="80" allow="autoplay; encrypted-media" className="block" />
        )}
      </div>
      <p className="px-2 pt-1.5 text-xs text-[#66575c]">If it doesn&apos;t start, tap ▶ on the player.</p>
    </div>
  );
}
