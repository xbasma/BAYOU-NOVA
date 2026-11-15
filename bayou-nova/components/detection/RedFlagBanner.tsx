"use client";

import Link from "next/link";
import { ArrowRight, OctagonAlert } from "lucide-react";
import { useDetection } from "@/lib/store";

/**
 * Red banner. Rendered by the app layout on EVERY route, above the page,
 * whenever any Layer 1 criterion is met. It reads only Layer 1: nothing about
 * the personal baseline can hide or soften it.
 */
export default function RedFlagBanner() {
  const detection = useDetection();
  if (!detection || !detection.layer1Met.length) return null;
  const { layer1Met, alert } = detection;

  return (
    <div
      role="alert"
      className="mb-6 rounded-[28px_8px_8px_8px] border-2 border-danger bg-danger/[0.14] p-4 backdrop-blur-xl sm:p-5"
    >
      <p className="flex items-center gap-2 font-display text-base font-bold text-danger" style={{ fontStretch: "118%" }}>
        <OctagonAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
        Red flag · Layer 1 · {alert.headline}
      </p>
      <ul className="mt-3 space-y-2">
        {layer1Met.map((c) => (
          <li key={c.id} className="rounded-xl border border-danger/40 bg-white/60 p-3">
            <p className="text-sm font-semibold text-ink">{c.title}</p>
            <p className="mt-0.5 text-sm text-ink/85">
              {c.description}. {c.valueAtEvaluation}.
            </p>
            <p className="mt-1.5 text-xs font-medium text-danger">{c.basisLabel}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-ink">{alert.action}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink/80">
        This takes priority over every personal-baseline comparison in the app. Baseline readings that look normal are not
        reassurance here.
      </p>
      <Link
        href="/alerts"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-danger underline-offset-4 hover:underline"
      >
        Open Early Detection for the basis and sources
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
