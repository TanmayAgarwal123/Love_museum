import type { Metadata } from "next";
import { BuilderForm } from "@/components/builder/BuilderForm";

export const metadata: Metadata = { title: "Build your museum · Museum of Us" };

export default function CreatePage() {
  return <BuilderForm />;
}
