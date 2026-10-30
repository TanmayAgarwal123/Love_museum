"use client";

import { useEffect, useRef } from "react";
import { spotifyEmbed, youtubeId } from "@/lib/media";
import { useMuseum } from "@/lib/store";
import type { Song } from "@/lib/types";

/**
 * Keeps "our song" playing across the whole visit. `songPlaying` in the store
 * is the single source of truth; audio files and YouTube are driven directly,
 * Spotify shows its own embed in the Song panel (Spotify doesn't allow
 * scripted playback).
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
    return (
      <audio
        ref={audio}
        src={song.src}
        loop
        preload="auto"
        onEnded={() => useMuseum.getState().set({ songPlaying: false })}
      />
    );
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
  return null;
}

export function SpotifyEmbed({ song }: { song: Song }) {
  const src = spotifyEmbed(song.src);
  if (!src) return null;
  return (
    <iframe
      title="Our song on Spotify"
      src={src}
      width="100%"
      height="152"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="rounded-xl"
    />
  );
}
