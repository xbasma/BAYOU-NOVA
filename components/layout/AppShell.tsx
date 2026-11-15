"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import AppRail from "@/components/layout/AppRail";
import DemoBanner from "@/components/layout/DemoBanner";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import ViewSwitch, { isSimplifiable } from "@/components/layout/ViewSwitch";

/** Chooses the frame: the welcome screen is full-bleed; every other screen gets the side rail. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { activeId, ready } = useStore();
  const withRail = ready && !!activeId;
  const pathname = usePathname();
  return (
    <div className={withRail ? "md:pl-64" : ""}>
      <AppRail />
      <div className="flex min-h-screen flex-col">
        <DemoBanner />
        <div className="flex flex-1 flex-col" data-simplify={isSimplifiable(pathname) ? "" : undefined}>
          {children}
        </div>
        <Footer />
      </div>
      <MobileNav />
      {withRail && <ViewSwitch />}
    </div>
  );
}
