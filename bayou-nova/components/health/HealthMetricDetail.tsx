"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Brain, Gauge, HeartPulse, Moon, type LucideIcon } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { GlassSection, MeasurementBadge, StatusChip } from "@/components/health/Glass";
import { LayerCell } from "@/components/dashboard/MetricsTable";
import HealthTrendChart from "@/components/dashboard/HealthTrendChart";
import MeasurementLegend from "@/components/dashboard/MeasurementLegend";
import { buildMetricRows, type MetricKey } from "@/lib/health";
import { useStore } from "@/lib/store";

const ICON: Record<MetricKey, LucideIcon> = {
  heart_rate: HeartPulse,
  blood_pressure: Gauge,
  sleep: Moon,
  activity: Activity,
  mood: Brain,
};

export default function HealthMetricDetail({ metricKey }: { metricKey: MetricKey }) {
  const { data } = useStore();
  const view = useMemo(() => {
    if (!data) return null;
    const row = buildMetricRows(data).find((r) => r.key === metricKey);
    return row ? { row } : null;
  }, [data, metricKey]);
  if (!view) return null;
  const { row } = view;

  const facts: Array<[string, string]> = [
    ["Latest value", row.currentDisplay],
    ["Recent average", row.trailingDisplay.replace("7-day mean ", "")],
    ["Personal baseline", row.baselineDisplay],
    ["Difference from baseline", row.deltaDisplay.replace(" vs baseline", "")],
  ];

  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <Link href="/health" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Health overview
      </Link>
      <PageHeader
        icon={ICON[row.key]}
        eyebrow="Metric detail"
        title={row.label}
        description="Latest readings against your personal baseline. Published red-flag criteria are checked first where they exist."
        actions={
          <div className="flex items-center gap-2">
            <MeasurementBadge type={row.measurementType} />
            <StatusChip status={row.status} />
          </div>
        }
      />

      <GlassSection eyebrow="Summary" title="Where this stands">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="mt-1 font-display text-lg font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">{row.baselineNote}. {row.referenceDisplay}.</p>
      </GlassSection>

      <GlassSection eyebrow="Status and basis" title="Which layer says what">
        <LayerCell row={row} />
      </GlassSection>

      <GlassSection title="Last 30 days">
        <HealthTrendChart row={row} />
      </GlassSection>
      <MeasurementLegend />
    </div>
  );
}
