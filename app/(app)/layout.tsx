"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RedFlagBanner from "@/components/detection/RedFlagBanner";
import LoadingState from "@/components/ui/LoadingState";
import { useStore } from "@/lib/store";

/**
 * Frame for the main tabs and their sub-pages. If no demo astronaut has been
 * chosen yet, the visitor is sent back to the welcome screen.
 *
 * The red-flag banner lives here so that a Layer 1 alert is shown above the
 * content of EVERY route, not only the dashboard.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeId, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !activeId) router.replace("/");
  }, [ready, activeId, router]);

  if (!ready || !activeId) {
    return <LoadingState />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <RedFlagBanner />
      {children}
    </main>
  );
}
