"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "phase", label: "By mission phase" },
  { id: "toolkit", label: "Prevention toolkit" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const isTab = (v: string): v is TabId => TABS.some((t) => t.id === v);

/**
 * The three Learn sub-tabs. The panels arrive as props so the heavy content
 * can stay in server components. The chosen tab is kept in the URL hash, so a
 * link such as /learn#toolkit opens that tab.
 */
export default function LearnTabs({
  overview,
  phase,
  toolkit,
}: {
  overview: ReactNode;
  phase: ReactNode;
  toolkit: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panels: Record<TabId, ReactNode> = { overview, phase, toolkit };

  // Open the tab named in the hash, once the page is on the client.
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (isTab(fromHash)) setTab(fromHash);
  }, []);

  const select = useCallback((id: TabId, focus = false) => {
    setTab(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore */
    }
    if (focus) refs.current[id]?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") select(TABS[(i + 1) % TABS.length].id, true);
    else if (e.key === "ArrowLeft") select(TABS[(i + TABS.length - 1) % TABS.length].id, true);
    else if (e.key === "Home") select(TABS[0].id, true);
    else if (e.key === "End") select(TABS[TABS.length - 1].id, true);
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Learn sections"
        className="flex flex-wrap gap-1.5 rounded-2xl border border-ink/10 bg-white/50 p-1.5"
      >
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              id={`learn-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`learn-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={onKeyDown}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                selected
                  ? "bg-ink text-champagne shadow-[inset_0_-3px_0_#F06018]"
                  : "text-ink/75 hover:bg-white/70 hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`learn-panel-${t.id}`}
          aria-labelledby={`learn-tab-${t.id}`}
          hidden={t.id !== tab}
          tabIndex={0}
          className="mt-5 animate-fade-up space-y-5 focus-visible:outline-offset-4"
        >
          {t.id === tab ? panels[t.id] : null}
        </div>
      ))}
    </div>
  );
}
