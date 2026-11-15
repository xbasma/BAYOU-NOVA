"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, Radar } from "lucide-react";
import { usePathname } from "next/navigation";
import NovaOrb from "@/components/brand/NovaOrb";
import AstronautSwitcher from "@/components/layout/AstronautSwitcher";
import { NAV_ITEMS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { currentMissionDay, STATUS_META, toneClass } from "@/lib/health";

/**
 * Navigation. On desktop it is a dark side rail in the logo's own void colour; on
 * phones it is a compact top bar (the tab bar lives in MobileNav).
 * The orb's ring shows the astronaut's overall status.
 */
export default function AppRail() {
  const { activeId, data, detection } = useStore();
  const pathname = usePathname();

  // Status comes from the detection engine, including anything reported in
  // this demo session, so the orb ring turns red the moment Layer 1 is met.
  const view = useMemo(() => {
    if (!data || !detection) return null;
    return { status: detection.status, day: currentMissionDay(data), role: data.profile.role };
  }, [data, detection]);

  if (!activeId || !view) return null;
  const tone = toneClass(view.status);

  return (
    <>
      {/* Phones: compact top bar */}
      <header className="void-surface sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="BAYOU-NOVA dashboard">
          <NovaOrb size={44} status={view.status} tone="dark" spin={false} />
          <span className="font-wordmark text-[12px] tracking-[0.26em] text-champagne">BAYOU-NOVA</span>
        </Link>
        <AstronautSwitcher />
      </header>

      {/* Desktop: side rail */}
      <aside className="void-surface fixed inset-y-0 left-0 z-40 hidden w-64 flex-col px-5 py-7 md:flex">
        <Link href="/dashboard" className="flex flex-col items-center text-center" aria-label="BAYOU-NOVA dashboard">
          <NovaOrb size={148} status={view.status} tone="dark" priority />
          <span className="mt-4 font-wordmark text-[15px] tracking-[0.3em] text-champagne">BAYOU-NOVA</span>
          <span className="mt-1.5 text-xs text-champagne/60">Astronaut health monitoring</span>
        </Link>

        <div className="mt-6 rounded-2xl border border-champagne/15 bg-white/[0.04] p-3.5">
          <AstronautSwitcher className="w-full justify-between" />
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-champagne/60">Mission day</dt>
              <dd className="font-semibold text-champagne" style={{ fontStretch: "118%" }}>{view.day}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-champagne/60">Overall</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-champagne">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.hex }} aria-hidden="true" />
                {STATUS_META[view.status].label}
              </dd>
            </div>
          </dl>
          <Link
            href="/alerts"
            aria-current={pathname.startsWith("/alerts") ? "page" : undefined}
            className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              pathname.startsWith("/alerts")
                ? "border-champagne/40 bg-champagne/12 text-champagne"
                : "border-champagne/15 text-champagne/75 hover:border-champagne/40 hover:text-champagne"
            }`}
          >
            <span className="flex items-center gap-2">
              <Radar className="h-4 w-4" aria-hidden="true" />
              Early detection
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/actions"
            aria-current={pathname.startsWith("/actions") ? "page" : undefined}
            className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              pathname.startsWith("/actions")
                ? "border-champagne/40 bg-champagne/12 text-champagne"
                : "border-champagne/15 text-champagne/75 hover:border-champagne/40 hover:text-champagne"
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Action and follow-up
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="mt-6 flex-1">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active ? "bg-champagne/12 text-champagne" : "text-champagne/65 hover:bg-white/5 hover:text-champagne"
                    }`}
                  >
                    <span
                      className={`absolute -left-5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-ember transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-champagne/15 pt-4 text-xs leading-relaxed text-champagne/55">
          <p>Simulated demonstration data. Not a medical device.</p>
          <Link href="/about" className="mt-1.5 inline-block text-champagne/80 underline-offset-4 hover:text-champagne hover:underline">
            Methods and sources
          </Link>
        </div>
      </aside>
    </>
  );
}
