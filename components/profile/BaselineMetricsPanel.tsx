import { Gauge } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";

type Metrics = ReturnType<typeof buildProfileView>["baselineMetrics"];

export default function BaselineMetricsPanel({ metrics }: { metrics: Metrics }) {
  return (
    <GlassSection eyebrow="Preflight baseline metrics" title="Your normal, before the mission" icon={Gauge}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <li key={m.key} className="rounded-xl border border-accent/25 bg-canvas/50 p-3.5">
            <p className="text-[11px] text-muted">{m.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">{m.value}</p>
            <p className="mt-0.5 text-xs text-muted">{m.spread}</p>
            <div className="mt-2">
              <MeasurementBadge type={m.type} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Spread is the standard deviation of your own preflight daily values. Wearable-derived values carry uncertainty.
      </p>
    </GlassSection>
  );
}
