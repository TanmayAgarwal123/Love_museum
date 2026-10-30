import { Suspense } from "react";
import { MuseumExperience } from "@/components/museum/MuseumExperience";
import { OUR_SLUG } from "@/lib/ourMuseum";

// The home page is your museum (set up in src/content/museum.config.ts).
// The builder is still at /create and the original demo at /m/demo.
export default function Home() {
  return (
    <Suspense>
      <MuseumExperience slug={OUR_SLUG} sharePath="/" />
    </Suspense>
  );
}
