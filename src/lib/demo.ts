import type { Museum } from "./types";

/**
 * The seeded demo museum. Edit this file to personalise the demo without the
 * builder: swap the `src` paths for your own files in /public, or paste any
 * image URL (https://picsum.photos/id/1011/1200/900 works too).
 */
export const DEMO_MUSEUM: Museum = {
  slug: "demo",
  title: "The Museum of Us",
  yourName: "Theo",
  partnerName: "Maya",
  occasion: "Our third anniversary",
  startDate: "2023-11-04",
  passcode: "1234",
  theme: "classic",
  isDemo: true,
  createdAt: "2026-10-21T00:00:00.000Z",
  avatars: {
    you: { initials: "T", shirt: "#3d5a80" },
    partner: { initials: "M", shirt: "#e8a0b4" },
  },
  photos: [
    { id: "p1", src: "/demo/photo-01.jpg", room: "entrance", title: "The night we met", date: "4 Nov 2023", caption: "You laughed at my terrible joke about the string lights. I decided right there." },
    { id: "p2", src: "/demo/photo-12.jpg", room: "entrance", title: "Our rooftop", date: "Summer 2024", caption: "The roof we were definitely not allowed on. Best view in the city." },
    { id: "p3", src: "/demo/photo-02.jpg", room: "gallery", title: "First road trip", date: "Mar 2024", caption: "Nine hours, one playlist, zero arguments about directions. Mostly." },
    { id: "p4", src: "/demo/photo-03.jpg", room: "gallery", title: "Golden hour", date: "Jun 2024", caption: "Sand in everything. You said it was the best day of the summer." },
    { id: "p5", src: "/demo/photo-05.jpg", room: "gallery", title: "Picnic on the hill", date: "Aug 2024", caption: "You brought the pink blanket. I brought too many strawberries." },
    { id: "p6", src: "/demo/photo-04.jpg", room: "gallery", title: "Our first snow", date: "Dec 2024", caption: "We walked home at midnight and didn't feel the cold at all." },
    { id: "p7", src: "/demo/photo-07.jpg", room: "gallery", title: "Rainy Sunday", date: "Feb 2025", caption: "One umbrella between two people is a design flaw I'm happy to keep." },
    { id: "p8", src: "/demo/photo-11.jpg", room: "gallery", title: "Cherry blossoms", date: "Apr 2025", caption: "You had petals in your hair for an hour and I didn't tell you." },
    { id: "p9", src: "/demo/photo-08.jpg", room: "gallery", title: "The summit", date: "Jul 2025", caption: "You made it up first and waited for me with a sandwich." },
    { id: "p10", src: "/demo/photo-06.jpg", room: "cinema", title: "The ferris wheel", date: "Sep 2025", caption: "Stuck at the very top for ten minutes. Ten of my favourite minutes." },
    { id: "p11", src: "/demo/photo-09.jpg", room: "dance", title: "Lantern festival", date: "Jan 2026", caption: "We wrote the same wish on our lanterns without telling each other." },
    { id: "p12", src: "/demo/photo-10.jpg", room: "dance", title: "Under the stars", date: "Aug 2026", caption: "Three years in and you still point out the same constellation. I still pretend I can see it." },
  ],
  video: { src: "/demo/memory.mp4", kind: "file", poster: "/demo/memory-poster.jpg", title: "Three years in five scenes" },
  song: { src: "/demo/our-song.mp3", kind: "audio", title: "Music Box Waltz", artist: "Our song" },
  letter: `Maya,

Three years ago you laughed at a joke that didn't deserve it, and I have been trying to earn that laugh ever since.

I built this little museum because I wanted somewhere to keep the days I never want to forget: the road trip, the snow, the rooftop, the umbrella that was never big enough. Every room is a part of us.

Thank you for the ordinary Tuesdays and the extraordinary summers. Thank you for waiting at the top of the mountain with a sandwich.

Walk through it slowly. Then come find me, because I'd like a dance.

Always yours,
Theo`,
};
