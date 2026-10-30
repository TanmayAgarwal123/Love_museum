"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatLongDate } from "@/lib/media";
import type { Museum } from "@/lib/types";
import { HeartQR } from "./HeartQR";
import { HeartFill } from "./ui/icons";

type Msg = { text: string; delay: number };

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return r;
}

export function RevealChat({
  museum,
  shareUrl,
  onEnter,
  showMakeLink = false,
}: {
  museum: Museum;
  shareUrl: string;
  onEnter: () => void;
  showMakeLink?: boolean;
}) {
  const reduced = useReducedMotion();
  const messages: Msg[] = [
    { text: `hey ${museum.partnerName.toLowerCase()}`, delay: 500 },
    { text: "I was making something…", delay: 1500 },
    { text: "for you. scan it, or just tap the button", delay: 1300 },
  ];
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const done = shown >= messages.length;
  const [qrSize, setQrSize] = useState(228);
  useEffect(() => {
    if (window.innerHeight < 900 && window.innerWidth < 640) setQrSize(168);
  }, []);

  useEffect(() => {
    if (reduced) {
      setShown(messages.length);
      return;
    }
    if (shown >= messages.length) {
      setTyping(false);
      return;
    }
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setShown((s) => s + 1);
    }, messages[shown].delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reduced]);

  return (
    <main id="content" className="min-h-[100svh] flex flex-col">
      <header className="flex items-center justify-between px-[var(--gutter)] pt-5">
        <span className="display text-xl flex items-center gap-2 whitespace-nowrap">
          <HeartFill size={18} className="text-blush" /> Museum of Us
        </span>
        {showMakeLink && (
          <Link href="/create" className="btn btn-ghost text-sm whitespace-nowrap">
            <span className="sm:hidden">Make yours</span>
            <span className="hidden sm:inline">Make one for your person</span>
          </Link>
        )}
      </header>

      <section className="flex-1 grid lg:grid-cols-[1.05fr_1fr] gap-6 sm:gap-10 lg:gap-16 items-center px-[var(--gutter)] pt-6 pb-8 sm:py-10 lg:py-6 max-w-[1320px] w-full mx-auto">
        <div className="anim-rise order-1">
          <p className="text-ink-soft text-base sm:text-lg mb-3 sm:mb-5">
            {museum.yourName} &amp; {museum.partnerName} · {museum.occasion}
          </p>
          <h1 className="text-[clamp(2.5rem,7.4vw,6.6rem)] font-normal">{museum.title}</h1>
          <p className="hidden sm:block mt-8 text-lg sm:text-xl max-w-[34ch] leading-relaxed">
            For {museum.partnerName}: a small museum of our photos, our film, our song and a letter. Walk through it together.
          </p>
          {museum.startDate && (
            <p className="mt-3 sm:mt-4 text-ink-soft">Together since {formatLongDate(museum.startDate)}</p>
          )}
        </div>

        <div className="order-2 w-full max-w-[440px] lg:justify-self-end mx-auto lg:mx-0">
          <div className="rounded-[28px] bg-stone p-3 sm:p-5" aria-live="polite">
            <div className="flex items-center gap-3 px-1 pb-3 sm:pb-4">
              <span className="grid place-items-center w-10 h-10 rounded-full bg-blush text-[#2a2124] font-semibold">
                {museum.avatars.you.initials || museum.yourName[0]}
              </span>
              <div className="leading-tight">
                <p className="font-semibold">{museum.yourName}</p>
                <p className="text-sm text-ink-soft">{done ? "sent just now" : typing ? "typing…" : "online"}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 min-h-[120px] sm:min-h-[132px]">
              {messages.slice(0, shown).map((m) => (
                <li key={m.text} className="anim-pop self-start max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-4 py-2.5 text-[1.02rem]">
                  {m.text}
                </li>
              ))}
              {typing && (
                <li className="self-start rounded-2xl rounded-bl-md bg-paper px-4 py-3.5 flex gap-1.5" aria-label="typing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot block w-2 h-2 rounded-full bg-ink-soft" style={{ animationDelay: `${i * 160}ms` }} />
                  ))}
                </li>
              )}
            </ul>

            <div className={`mt-4 flex flex-col items-center gap-4 rounded-2xl bg-paper px-4 pt-4 sm:pt-6 pb-4 sm:pb-5 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0 pointer-events-none"}`} aria-hidden={!done}>
              <HeartQR url={shareUrl} size={qrSize} />
              <button type="button" onClick={onEnter} className="btn btn-primary w-full text-base min-h-[54px]" tabIndex={done ? 0 : -1}>
                <HeartFill size={18} /> Enter our museum
              </button>
              {museum.isDemo && museum.passcode && (
                <p className="text-sm text-ink-soft">Demo passcode: <strong className="text-ink tracking-wider">{museum.passcode}</strong></p>
              )}
            </div>
          </div>
          {!done && (
            <button type="button" onClick={() => setShown(messages.length)} className="mt-3 w-full text-center text-sm text-ink-soft underline underline-offset-4 py-2">
              Skip the intro
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
