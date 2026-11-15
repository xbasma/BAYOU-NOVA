"use client";

import Link from "next/link";
import { WORKFLOW_STAGES } from "@/lib/nav";
import { useStore } from "@/lib/store";

/**
 * Footer. Five icons, one per stage of the core workflow (Monitor, Detect,
 * Investigate, Act, Follow Up). Once a demo profile is chosen they link to the
 * screen where that stage happens, which also gives phone users a way to the
 * Early detection and Action pages. On the welcome screen they are labels only.
 */
export default function Footer() {
  const { activeId, ready } = useStore();
  const linked = ready && !!activeId;

  return (
    <footer className="mt-auto border-t border-accent/20 pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
        <nav aria-label="Core workflow">
          <ul className="grid grid-cols-5 gap-2 sm:gap-4">
            {WORKFLOW_STAGES.map((s) => {
              const Icon = s.icon;
              const inner = (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/35 bg-white/60 text-accent transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 text-[11px] font-semibold text-ink sm:text-xs">{s.stage}</span>
                  <span className="hidden text-[11px] text-muted sm:block">{s.where}</span>
                </>
              );
              return (
                <li key={s.stage}>
                  {linked ? (
                    <Link href={s.href} className="group flex flex-col items-center text-center" aria-label={`${s.stage}: ${s.where}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className="group flex flex-col items-center text-center">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="mx-auto mt-6 max-w-3xl border-t border-ink/10 pt-4">
          <span className="font-semibold text-ink">Proof of concept.</span> BAYOU-NOVA is a 2026 NASA Space Apps Challenge
          demonstration using simulated data. It is not a medical device or a production medical system and does not
          diagnose or treat any condition. Anything that may be a medical emergency should be handled through real mission
          medical procedures and the flight surgeon.
        </p>
        <p className="mx-auto mt-2 max-w-3xl">
          <Link href="/about" className="font-medium text-accent underline-offset-4 hover:underline">
            Methods, sources and limitations
          </Link>
        </p>
      </div>
    </footer>
  );
}
