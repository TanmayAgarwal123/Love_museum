"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RevealChat } from "@/components/RevealChat";
import { HeartFill } from "@/components/ui/icons";
import { DEMO_MUSEUM } from "@/lib/demo";

export default function Home() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <>
      <RevealChat
        museum={DEMO_MUSEUM}
        shareUrl={`${origin || "https://museumofus.app"}/m/demo`}
        onEnter={() => router.push("/m/demo?enter=1")}
        showMakeLink
      />

      <section className="bg-stone px-[var(--gutter)] py-24 lg:py-36" aria-labelledby="make-heading">
        <div className="max-w-[1320px] mx-auto grid lg:grid-cols-2 gap-14 lg:gap-24 items-start">
          <div>
            <h2 id="make-heading" className="text-[clamp(2.4rem,5vw,4.4rem)]">Make one for your person</h2>
            <p className="mt-8 text-lg max-w-[42ch]">
              Twelve photos on gallery walls, a film on the cinema screen, your song on the dance floor and a letter at the end.
              It takes about ten minutes, and nobody needs an account to visit.
            </p>
            <Link href="/create" className="btn btn-primary mt-10 min-h-[52px] px-7 text-base">
              <HeartFill size={18} /> Start building
            </Link>
          </div>
          <ol className="flex flex-col gap-10 text-lg">
            <li>
              <h3 className="text-3xl">Hang your photos</h3>
              <p className="mt-3 text-ink-soft max-w-[46ch]">Drop in up to twelve, give each a title, a date and a line for the plaque, and choose which room it hangs in.</p>
            </li>
            <li>
              <h3 className="text-3xl">Add the film, the song, the letter</h3>
              <p className="mt-3 text-ink-soft max-w-[46ch]">Upload a short video or paste a YouTube link, pick your song, and write the letter that waits in the last room.</p>
            </li>
            <li>
              <h3 className="text-3xl">Send the heart</h3>
              <p className="mt-3 text-ink-soft max-w-[46ch]">You get a link and a heart-shaped QR code to print, text or hide in a card. They scan it and walk in.</p>
            </li>
          </ol>
        </div>
      </section>

      <footer className="px-[var(--gutter)] pt-20 pb-10 overflow-hidden">
        <p className="display text-[clamp(3rem,13vw,12rem)] leading-none text-blush select-none" aria-hidden>
          Museum of Us
        </p>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
          <Link href="/m/demo" className="underline underline-offset-4 hover:text-ink">Visit the demo museum</Link>
          <Link href="/m/demo/gallery" className="underline underline-offset-4 hover:text-ink">2D gallery version</Link>
          <Link href="/create" className="underline underline-offset-4 hover:text-ink">Build yours</Link>
          <span>Demo photos, film and song are original illustrations made for this site.</span>
        </div>
      </footer>
    </>
  );
}
