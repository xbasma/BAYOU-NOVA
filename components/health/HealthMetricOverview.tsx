"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GlassSection, LayerOneLabel, LayerTwoLabel, MeasurementBadge, StatusChip } from "@/components/health/Glass";
import { buildMetricRows, toneClass } from "@/lib/health";
import { useStore } from "@/lib/store";

/** The five monitored metrics, each linking to its own detail page. */
export default function HealthMetricOverview() {
  const { data } = useStore();
  const view = useMemo(() => (data ? { rows: buildMetricRows(data) } : null), [data]);
  if (!view) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {view.rows.map((r) => (
          <Link key={r.key} href={`/health/${r.key}`} className="group block">
            <GlassSection className={`h-full border-l-4 !p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-[0_0_24px_rgba(240,96,24,0.28)] ${toneClass(r.status).border}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-ink">{r.label}</h3>
                <ChevronRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-ink">{r.currentDisplay}</p>
              <p data-keep className="mt-1 text-xs text-muted">
                Baseline {r.baselineDisplay} · {r.deltaDisplay}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusChip status={r.status} size="sm" />
                <MeasurementBadge type={r.measurementType} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.layer1 && <LayerOneLabel met={r.layer1.met} />}
                {!r.layer2.suppressedByLayer1 && <LayerTwoLabel />}
              </div>
            </GlassSection>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted">
        Each card shows the latest value beside your personal baseline. Open the dashboard for the full two-layer view.
      </p>
    </div>
  );
}
