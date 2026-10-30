"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import { PasscodeGate } from "@/components/PasscodeGate";
import { RevealChat } from "@/components/RevealChat";
import { HeartFill } from "@/components/ui/icons";
import { hangPhotos } from "@/lib/floorplan";
import { interact, sim, useMuseum } from "@/lib/store";
import { isUnlocked, markUnlocked, useMuseumData } from "@/lib/useMuseumData";
import type { Museum } from "@/lib/types";
import { HUD } from "./HUD";
import { LoadingScreen } from "./LoadingScreen";
import { SongPlayer } from "./SongPlayer";

const MuseumCanvas = dynamic(() => import("./MuseumCanvas"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Fallback2D({ museum, reason }: { museum: Museum; reason: string }) {
  return (
    <main className="min-h-[100svh] grid place-items-center px-[var(--gutter)] text-center">
      <div className="max-w-md">
        <HeartFill size={40} className="mx-auto text-blush" />
        <h1 className="mt-6 text-4xl">{museum.title}</h1>
        <p className="mt-4 text-ink-soft">{reason}</p>
        <Link href={`/m/${museum.slug}/gallery`} className="btn btn-primary mt-8">View as 2D gallery</Link>
      </div>
    </main>
  );
}

function useKeyboard(museum: Museum | null) {
  useEffect(() => {
    if (!museum) return;
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const s = useMuseum.getState();
      if (e.code === "Escape") {
        if (s.closeAll()) e.preventDefault();
        return;
      }
      if (e.code === "KeyE" || (e.code === "Enter" && e.target === document.body)) {
        if (s.sitting) s.set({ sitting: false });
        else if (s.dancing) s.set({ dancing: false });
        else if (s.focusedPhotoId) s.set({ focusedPhotoId: null });
        else if (!s.panel && !s.letterOpen) interact(s.near);
        return;
      }
      if (e.code === "KeyV" && !s.panel) s.toggleView();
      if (e.code === "KeyM") s.set({ panel: s.panel === "map" ? null : "map" });
      if (e.code.startsWith("Arrow") || e.code === "Space") {
        if (e.target === document.body) e.preventDefault();
      }
      sim.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => sim.keys.delete(e.code);
    const blur = () => sim.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [museum]);
}

function Museum3D({ museum, shareUrl }: { museum: Museum; shareUrl: string }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const placed = useMemo(() => hangPhotos(museum.photos), [museum.photos]);
  useKeyboard(museum);

  useEffect(() => {
    useMuseum.getState().reset();
    setWebgl(hasWebGL());
    // Handle for automated browser checks (see README › Testing).
    (window as unknown as { __museum: unknown }).__museum = { sim, store: useMuseum };
    // Plaques and signs are drawn with the web fonts, so wait for them.
    Promise.race([
      Promise.all([
        document.fonts.load('400 48px "Playfair Display"'),
        document.fonts.load('600 48px "Playfair Display"'),
        document.fonts.load('italic 400 48px "Playfair Display"'),
        document.fonts.load('500 24px "Inter Variable"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).finally(() => setFontsReady(true));
    return () => {
      sim.keys.clear();
      useMuseum.getState().reset();
    };
  }, []);

  if (webgl === false) return <Fallback2D museum={museum} reason="This device can't show the 3D museum, but every photo, the film, the song and the letter are waiting in the gallery." />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-paper anim-fade" data-theme={museum.theme}>
      <CanvasBoundary fallback={<Fallback2D museum={museum} reason="The 3D view stopped working on this device. The 2D gallery has everything." />}>
        {webgl && fontsReady && <MuseumCanvas museum={museum} />}
        <HUD museum={museum} placed={placed} shareUrl={shareUrl} />
      </CanvasBoundary>
      <SongPlayer song={museum.song} />
      <LoadingScreen started={!!(webgl && fontsReady)} />
    </div>
  );
}

export function MuseumExperience({ slug }: { slug: string }) {
  const data = useMuseumData(slug);
  const params = useSearchParams();
  const [phase, setPhase] = useState<"reveal" | "gate" | "museum">(params.get("enter") ? "gate" : "reveal");
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => setShareUrl(`${window.location.origin}/m/${slug}`), [slug]);

  const museum = data.status === "ready" ? data.museum : null;
  useEffect(() => {
    if (museum && phase === "gate" && (!museum.passcode || isUnlocked(museum.slug))) setPhase("museum");
  }, [museum, phase]);

  if (data.status === "loading") {
    return (
      <main className="min-h-[100svh] grid place-items-center" role="status">
        <HeartFill size={44} className="text-blush anim-beat" />
        <span className="sr-only">Loading</span>
      </main>
    );
  }
  if (data.status === "missing" || !museum) {
    return (
      <main className="min-h-[100svh] grid place-items-center px-[var(--gutter)] text-center">
        <div className="max-w-md">
          <h1 className="text-4xl sm:text-5xl">This museum isn&apos;t here</h1>
          <p className="mt-5 text-ink-soft">
            Museums are saved in the browser they were made in. Open the link on the same device, or build a new one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="btn btn-primary">Build a museum</Link>
            <Link href="/m/demo" className="btn btn-quiet">Visit the demo</Link>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "reveal") {
    return (
      <div data-theme={museum.theme} className="bg-paper text-ink min-h-[100svh]">
        <RevealChat museum={museum} shareUrl={shareUrl} onEnter={() => setPhase("gate")} />
      </div>
    );
  }
  if (phase === "gate" && museum.passcode && !isUnlocked(museum.slug)) {
    return (
      <div data-theme={museum.theme} className="bg-paper text-ink">
        <PasscodeGate
          expected={museum.passcode}
          partnerName={museum.partnerName}
          isDemo={museum.isDemo}
          onUnlock={() => {
            markUnlocked(museum.slug);
            setPhase("museum");
          }}
        />
      </div>
    );
  }
  if (phase !== "museum") return null;
  return <Museum3D museum={museum} shareUrl={shareUrl} />;
}
