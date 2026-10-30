import { Suspense } from "react";
import { MuseumExperience } from "@/components/museum/MuseumExperience";

export default async function MuseumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <MuseumExperience slug={slug} />
    </Suspense>
  );
}
