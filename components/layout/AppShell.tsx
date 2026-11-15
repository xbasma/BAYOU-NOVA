"use client";

import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import AppRail from "@/components/layout/AppRail";
import DemoBanner from "@/components/layout/DemoBanner";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";

/** Chooses the frame: the welcome screen is full-bleed; every other screen gets the side rail. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { activeId, ready } = useStore();
  const withRail = ready && !!activeId;
  return (
    <div className={withRail ? "md:pl-64" : ""}>
      <AppRail />
      <div className="flex min-h-screen flex-col">
        <DemoBanner />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
}
