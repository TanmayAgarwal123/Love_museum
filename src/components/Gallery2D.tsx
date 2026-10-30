"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { daysTogether, formatLongDate, spotifyEmbed, videoEmbedUrl, youtubeId } from "@/lib/media";
import { ROOMS, museumVideos } from "@/lib/types";
import { isUnlocked, markUnlocked, useMuseumData } from "@/lib/useMuseumData";
import { PasscodeGate } from "./PasscodeGate";
import { HeartFill, Pause, Play } from "./ui/icons";

export function Gallery2D({ slug }: { slug: string }) {
  const data = useMuseumData(slug);
  const [unlocked, setUnlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => setUnlocked(isUnlocked(slug)), [slug]);

  if (data.status === "loading") {
    return (
      <main className="min-h-[100svh] grid place-items-center" role="status">
        <HeartFill size={44} className="text-blush anim-beat" />
        <span className="sr-only">Loading</span>
      </main>
    );
  }
  if (data.status === "missing") {
    return (
      <main className="min-h-[100svh] grid place-items-center px-[var(--gutter)] text-center">
        <div>
          <h1 className="text-4xl">This museum isn&apos;t here</h1>
          <Link href="/create" className="btn btn-primary mt-8">Build a museum</Link>
        </div>
      </main>
    );
  }

  const m = data.museum;
  if (m.passcode && !unlocked) {
    return (
      <div data-theme={m.theme} className="bg-paper text-ink">
        <PasscodeGate
          expected={m.passcode}
          partnerName={m.partnerName}
          isDemo={m.isDemo}
          onUnlock={() => {
            markUnlocked(slug);
            setUnlocked(true);
          }}
        />
      </div>
    );
  }

  const days = daysTogether(m.startDate);
  const song = m.song;
  const toggle = () => {
    if (!audio.current) return;
    if (audio.current.paused) audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else {
      audio.current.pause();
      setPlaying(false);
    }
  };
  const films = museumVideos(m);

  return (
    <div data-theme={m.theme} id="content" className="bg-paper text-ink min-h-[100svh] pb-28">
      <a href="#first-room" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">Skip to the photos</a>
      <header className="flex items-center justify-between gap-4 px-[var(--gutter)] pt-5">
        <span className="display text-xl flex items-center gap-2">
          <HeartFill size={18} className="text-blush" /> Museum of Us
        </span>
        <Link href={`/m/${slug}?enter=1`} className="btn btn-quiet text-sm">Walk the 3D museum</Link>
      </header>

      <section className="px-[var(--gutter)] pt-14 pb-16 sm:pt-20 max-w-[1320px] mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="text-ink-soft text-lg">{m.yourName} &amp; {m.partnerName} · {m.occasion}</p>
          <h1 className="mt-4 text-[clamp(2.75rem,7vw,6.4rem)] font-normal max-w-[14ch]">{m.title}</h1>
          {m.startDate && (
            <p className="mt-8 text-xl">
              Together since {formatLongDate(m.startDate)}
              {days !== null && <span className="text-gold font-semibold"> · {days.toLocaleString()} days</span>}
            </p>
          )}
          <p className="mt-4 text-lg text-ink-soft">{m.photos.length} photos{films.length > 1 ? `, ${films.length} films` : films.length ? ", a film" : ""}{m.song ? ", our song" : ""} and a letter.</p>
        </div>
        {m.photos[0] && (
          <figure className="hidden lg:block">
            <div className="p-[10px] bg-gold">
              <div className="p-7 bg-[#fdfcf9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.photos[0].src} alt={m.photos[0].title} width={1200} height={900} fetchPriority="high" className="w-full h-auto block bg-stone" />
              </div>
            </div>
            <figcaption className="mt-3 text-sm text-ink-soft">{m.photos[0].title} · {m.photos[0].date}</figcaption>
          </figure>
        )}
      </section>

      <div id="first-room" />
      {ROOMS.map((room) => {
        const photos = m.photos.filter((p) => p.room === room.id);
        if (!photos.length) return null;
        return (
          <section key={room.id} aria-labelledby={`room-${room.id}`} className="px-[var(--gutter)] py-16 sm:py-24 max-w-[1320px] mx-auto">
            <h2 id={`room-${room.id}`} className="text-[clamp(2rem,4.5vw,3.6rem)] mb-12 sm:mb-16">{room.name}</h2>
            <ol className="flex flex-col gap-16 sm:gap-24">
              {photos.map((p, i) => (
                <li key={p.id} className={`grid md:grid-cols-[1.4fr_1fr] gap-6 md:gap-14 items-end ${i % 2 ? "md:grid-cols-[1fr_1.4fr]" : ""}`}>
                  <figure className={`${i % 2 ? "md:order-2" : ""}`}>
                    <div className="p-[10px] bg-gold">
                      <div className="p-[clamp(14px,3vw,32px)] bg-[#fdfcf9]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt={p.title} loading="lazy" width={1200} height={900} className="w-full h-auto block bg-stone" />
                      </div>
                    </div>
                  </figure>
                  <div className={`plaque max-w-md ${i % 2 ? "md:order-1 md:justify-self-end" : ""}`}>
                    <p className="text-sm font-semibold text-gold">{p.date}</p>
                    <h3 className="mt-2 text-3xl sm:text-4xl">{p.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed">{p.caption}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {films.length > 0 && (
        <section aria-labelledby="cinema" className="bg-[#16121a] text-[#f6efe8] px-[var(--gutter)] py-20 sm:py-28 mt-10">
          <div className="max-w-[1100px] mx-auto">
            <h2 id="cinema" className="text-[clamp(2rem,4.5vw,3.6rem)]">
              {films.length > 1 ? "Our films" : films[0].title || "Our memory film"}
            </h2>
            <ol className="mt-10 flex flex-col gap-14">
              {films.map((v, i) => {
                const embed = v.kind !== "file" ? videoEmbedUrl(v.kind, v.src, false) : null;
                return (
                  <li key={`${v.src}-${i}`}>
                    {films.length > 1 && <h3 className="text-2xl sm:text-3xl mb-5">{v.title || `Film ${i + 1}`}</h3>}
                    <div className="aspect-video w-full bg-black">
                      {embed ? (
                        <iframe src={embed} title={v.title || `Film ${i + 1}`} allow="encrypted-media; fullscreen" allowFullScreen className="w-full h-full" loading="lazy" />
                      ) : (
                        <video src={v.src} poster={v.poster} controls playsInline preload="metadata" className="w-full h-full" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <section aria-labelledby="letter" className="px-[var(--gutter)] py-20 sm:py-28">
        <article className="max-w-2xl mx-auto bg-[#fdf9f3] text-[#2a2124] px-6 py-12 sm:px-14 sm:py-16 rounded-md">
          <HeartFill size={28} className="text-[#e8a0b4]" />
          <h2 id="letter" className="mt-4 text-4xl sm:text-5xl">For {m.partnerName}</h2>
          <div className="mt-8 font-[family-name:var(--font-display)] italic text-[1.2rem] sm:text-[1.3rem] leading-[1.75] whitespace-pre-line">{m.letter}</div>
        </article>
      </section>

      {song?.src && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-stone px-[var(--gutter)] py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="max-w-[1320px] mx-auto flex items-center gap-4">
            {song.kind === "audio" && (
              <>
                <audio ref={audio} src={song.src} loop onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
                <button type="button" onClick={toggle} className="btn btn-primary w-12 h-12 p-0 shrink-0" aria-label={playing ? "Pause our song" : "Play our song"}>
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{song.title}</p>
                  <p className="text-sm text-ink-soft truncate">{song.artist || "Our song"}</p>
                </div>
              </>
            )}
            {song.kind === "spotify" && spotifyEmbed(song.src) && (
              <iframe title="Our song on Spotify" src={spotifyEmbed(song.src)!} height="80" className="w-full rounded-lg" allow="encrypted-media" />
            )}
            {song.kind === "youtube" && youtubeId(song.src) && (
              <a href={song.src} target="_blank" rel="noreferrer" className="btn btn-primary">Play “{song.title}” on YouTube</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
