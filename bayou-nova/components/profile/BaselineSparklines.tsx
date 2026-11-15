"use client";

import { LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";
import { CHART } from "@/lib/theme";
import ChartFrame from "@/components/ui/ChartFrame";

type Spark = ReturnType<typeof buildProfileView>["sparklines"][number];

function Sparkline({ s }: { s: Spark }) {
  const lo = Math.min(s.stats.min, s.baseline);
  const hi = Math.max(s.stats.max, s.baseline);
  const pad = (hi - lo) * 0.15 || 1;
  const fmt = (v: number) => v.toFixed(s.decimals);
  return (
    <div className="rounded-xl border border-accent/25 bg-canvas/50 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">{s.label}</p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink">
            {s.decimals ? s.baseline.toFixed(s.decimals) : Math.round(s.baseline).toLocaleString()}{" "}
            <span className="text-xs font-medium text-muted">{s.unit} baseline</span>
          </p>
        </div>
        <MeasurementBadge type={s.type} />
      </div>
      <div
        className="mt-2 h-[76px]"
        role="img"
        aria-label={`${s.label} across ${s.data.length} preflight days, range ${fmt(s.stats.min)} to ${fmt(s.stats.max)} ${s.unit}, baseline ${fmt(s.baseline)}`}
      >
        <ChartFrame>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={s.data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis hide domain={[lo - pad, hi + pad]} />
            <ReferenceLine y={s.baseline} stroke={CHART.baseline} strokeDasharray="3 3" strokeWidth={1.25} />
            <Tooltip
              contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: CHART.ink }}
              labelStyle={{ color: CHART.muted }}
              labelFormatter={(d) => `Mission Day ${d}`}
              formatter={(v) => [`${Number(v).toFixed(s.decimals)} ${s.unit}`, s.label]}
            />
            <Line type="monotone" dataKey="v" stroke={CHART.lineA} strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        </ChartFrame>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Range {fmt(s.stats.min)}–{fmt(s.stats.max)} {s.unit} · ±{fmt(s.stats.sd)} day-to-day
      </p>
    </div>
  );
}

export default function BaselineSparklines({ sparklines, days }: { sparklines: Spark[]; days: number }) {
  return (
    <GlassSection eyebrow="Baseline trends" title={`Preflight trend, ${days} days`} icon={TrendingUp}>
      <div className="grid gap-3 md:grid-cols-3">
        {sparklines.map((s) => (
          <Sparkline key={s.key} s={s} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Dashed ember line is your preflight mean. Activity is steps, which are only meaningful on the ground; in flight the
        dashboard uses logged exercise minutes.
      </p>
    </GlassSection>
  );
}
