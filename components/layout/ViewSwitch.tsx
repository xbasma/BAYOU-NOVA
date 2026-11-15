"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlignLeft, ListTree } from "lucide-react";

const KEY = "bayou-nova:view";
export const SIMPLE_ROUTES = ["/dashboard", "/health", "/alerts", "/actions"];

export function isSimplifiable(pathname: string | null): boolean {
  return !!pathname && SIMPLE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/** Simple (default) or Detailed. Detailed shows every explanatory line. Safety and source lines show in both. */
export default function ViewSwitch() {
  const pathname = usePathname();
  const [detailed, setDetailed] = useState(false);

  useEffect(() => {
    try {
      setDetailed(localStorage.getItem(KEY) === "detailed");
    } catch {
      /* storage unavailable: stay on Simple */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.view = detailed ? "detailed" : "simple";
  }, [detailed]);

  if (!isSimplifiable(pathname)) return null;

  const toggle = () => {
    const next = !detailed;
    setDetailed(next);
    try {
      localStorage.setItem(KEY, next ? "detailed" : "simple");
    } catch {
      /* ignore */
    }
  };

  const Icon = detailed ? AlignLeft : ListTree;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={detailed}
      className="fixed bottom-20 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-ink/30 bg-ink px-4 py-2.5 text-sm font-semibold text-champagne shadow-lg transition hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:bottom-6 md:right-6"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {detailed ? "Detailed view · switch to Simple" : "Simple view · show detail"}
    </button>
  );
}
