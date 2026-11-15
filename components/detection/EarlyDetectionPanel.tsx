"use client";

import Link from "next/link";
import { ArrowRight, Radar, RotateCcw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SimulatedBadge } from "@/components/health/Glass";
import CurrentAlertCard from "@/components/detection/CurrentAlertCard";
import DriftPanel from "@/components/detection/DriftPanel";
import CombinationPanel from "@/components/detection/CombinationPanel";
import DetectionBasisPanel from "@/components/detection/DetectionBasisPanel";
import WhyPanel from "@/components/detection/WhyPanel";
import SourceList from "@/components/detection/SourceList";
import { useStore } from "@/lib/store";
import type { AstronautData } from "@/lib/health-data";

/** Preflight baselines, in the display units the drift chart uses. */
export function driftBaselines(a: AstronautData): Record<string, number> {
  const b = a.profile.preflight_baseline;
  return {
    sleep_duration: +(b.sleep_duration.value_min / 60).toFixed(2),
    resting_hr: b.resting_hr_bpm.value,
    bp_systolic: b.blood_pressure.systolic_mmhg,
    bp_diastolic: b.blood_pressure.diastolic_mmhg,
  };
}

/**
 * Early Detection panel (Feature 4).
 * Order on the page follows the priority of the layers: the current alert and
 * which layer raised it, then the Layer 2 visualisations, then the basis for
 * both layers, then context.
 */
export default function EarlyDetectionPanel() {
  const { data, detection, hasSessionData, resetDemo } = useStore();
  if (!data || !detection) return null;

  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <PageHeader
        icon={Radar}
        eyebrow="Workflow · Detect"
        title="Early Detection"
        description="Two layers. Published emergency red flags are checked first and always win. An experimental rule then looks for slow drifts and for related signals moving together."
        actions={<SimulatedBadge />}
      />

      <CurrentAlertCard
        detection={detection}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p data-keep className="text-xs text-muted">
              {data.hasSessionCheckin
                ? `Includes the Mission Day ${detection.latestCheckinDay} check-in you completed in this demo session.`
                : `Uses the seeded Mission Day ${detection.latestCheckinDay} check-in. Complete today's check-in to see both layers respond.`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {hasSessionData && (
                <button
                  type="button"
                  onClick={resetDemo}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset demo session
                </button>
              )}
              {detection.status !== "normal" && (
                <Link
                  href="/actions"
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
                >
                  Open follow-up plan
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              <Link
                href="/check-in"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-champagne hover:bg-accent"
              >
                Daily check-in
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        }
      />

      <DriftPanel detection={detection} baselines={driftBaselines(data)} />
      <p
        data-simple-only
        className="rounded-xl border border-dashed border-accent/40 bg-white/50 px-4 py-3 text-center text-sm text-ink/80"
      >
        Simple view. The signal grid, the published basis, what the rule cannot see and the source list are one tap away: use
        the switch at the bottom of the screen.
      </p>
      <div data-detail className="space-y-6">
        <CombinationPanel detection={detection} />
        <DetectionBasisPanel detection={detection} />
        <WhyPanel detection={detection} />
        <SourceList />
      </div>

      <p data-keep className="text-center text-xs leading-relaxed text-muted">
        SIMULATED DEMONSTRATION DATA. Proof of concept, not a medical device. Neither layer is a diagnosis, and neither has
        been validated in spaceflight.
      </p>
    </div>
  );
}
