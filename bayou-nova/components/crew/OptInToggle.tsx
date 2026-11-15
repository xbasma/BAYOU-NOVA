"use client";

import { useEffect, useState } from "react";
import { HandHeart, Lock } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { OPT_IN, OPT_IN_DEFAULT, participationStatus } from "@/lib/crew";
import { useStore } from "@/lib/store";

const key = (id: string) => `bayou-nova:v2:crew-optin:${id}`;

/**
 * Opt-in participation. Off until the person turns it on, and withdrawable at
 * any time. It is a stored preference only: nothing leaves the browser, it does
 * not change what the person can see, and the page never shows how many people
 * take part (a count could help identify individuals in a small crew).
 */
export default function OptInToggle() {
  const { activeId } = useStore();
  const [on, setOn] = useState<boolean>(OPT_IN_DEFAULT);

  useEffect(() => {
    if (!activeId) return;
    try {
      setOn(window.localStorage.getItem(key(activeId)) === "on");
    } catch {
      setOn(OPT_IN_DEFAULT);
    }
  }, [activeId]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    if (!activeId) return;
    try {
      window.localStorage.setItem(key(activeId), next ? "on" : "off");
    } catch {
      /* storage unavailable: the choice still holds for this page view */
    }
  };

  return (
    <GlassPanel eyebrow="Your choice" title={OPT_IN.title} icon={HandHeart}>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink/10 bg-canvas/50 p-4">
        <span id="optin-label" className="text-sm font-semibold text-ink">
          {OPT_IN.switch_label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="optin-label"
          aria-describedby="optin-status"
          onClick={toggle}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors ${
            on ? "border-safe bg-safe" : "border-ink/40 bg-white"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full transition-transform ${
              on ? "translate-x-7 bg-white" : "translate-x-1 bg-ink/60"
            }`}
          />
          <span className="sr-only">{on ? "On" : "Off"}</span>
        </button>
      </div>
      <p id="optin-status" role="status" className="mt-3 text-sm font-medium text-ink">
        {participationStatus(on)}
      </p>

      <p className="mt-3 max-w-3xl text-sm text-ink/90">{OPT_IN.what_it_means}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <h3 className="!text-sm">What taking part would include</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/90">
            {OPT_IN.shares.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <h3 className="flex items-center gap-1.5 !text-sm">
            <Lock className="h-4 w-4 text-accent" aria-hidden="true" />
            What it never includes
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/90">
            {OPT_IN.never_shares.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-muted">
        <p>{OPT_IN.viewing_note}</p>
        <p>{OPT_IN.withdraw_note}</p>
        <p>{OPT_IN.limits_note}</p>
      </div>
    </GlassPanel>
  );
}
