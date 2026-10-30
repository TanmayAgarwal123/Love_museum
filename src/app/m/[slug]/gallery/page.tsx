import { Gallery2D } from "@/components/Gallery2D";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Gallery2D slug={slug} />;
}
