"use client";

import { ASTRONAUT_IDS, loadAstronaut } from "@/lib/health-data";
import { useStore } from "@/lib/store";

/**
 * Switches between the two demo astronauts without leaving the current page.
 * The active astronaut comes from here, not from the URL. Built for the dark rail.
 */
export default function AstronautSwitcher({ className = "" }: { className?: string }) {
  const { activeId, selectAstronaut } = useStore();

  return (
    <div
      role="group"
      aria-label="Demo astronaut"
      className={`inline-flex rounded-full border border-champagne/25 bg-white/5 p-0.5 ${className}`}
    >
      {ASTRONAUT_IDS.map((id) => {
        const { profile } = loadAstronaut(id);
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectAstronaut(id)}
            aria-pressed={active}
            title={`${profile.role}. ${profile.scenario_description}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              active ? "bg-champagne text-ink" : "text-champagne/70 hover:text-champagne"
            }`}
            style={{ fontStretch: "118%" }}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
