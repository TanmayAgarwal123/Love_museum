import type { Metadata, Viewport } from "next";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { museumConfig } from "@/content/museum.config";

export const metadata: Metadata = {
  title: `For ${museumConfig.partnerName} · ${museumConfig.title}`,
  description: `I was making something for you. A little museum of our photos, our film, our song and a letter, from ${museumConfig.yourName}.`,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
