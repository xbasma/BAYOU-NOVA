import { ChartLine } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import TrendChart from "@/components/dashboard/HealthTrendChart";
import type { MetricRow } from "@/lib/health";

export default function TrendChartGrid({ rows, days }: { rows: MetricRow[]; days: number }) {
  return (
    <GlassSection eyebrow="Trends" title={`${days}-day trends with personal baseline`} icon={ChartLine}>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r, i) => (
          <div key={r.key} className={i === rows.length - 1 && rows.length % 2 === 1 ? "lg:col-span-2" : ""}>
            <TrendChart row={r} />
          </div>
        ))}
      </div>
    </GlassSection>
  );
}
