import Link from "next/link";
import { Compass } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <GlassPanel eyebrow="Signal lost" title="Page not found" icon={Compass} className="w-full">
        <p className="text-sm text-muted">That page does not exist in this demonstration.</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Back to start
        </Link>
      </GlassPanel>
    </main>
  );
}
