"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MeasurementBadge, StatusChip } from "@/components/health/Glass";
import { toneClass, type MetricRow } from "@/lib/health";
import { CHART } from "@/lib/theme";
import ChartFrame from "@/components/ui/ChartFrame";

export default function TrendChart({ row }: { row: MetricRow }) {
  const { chart } = row;
  const values = chart.data.flatMap((d) => chart.series.map((s) => d[s.key]));
  const lo = Math.min(...values, ...chart.baselines.map((b) => b.value));
  const hi = Math.max(...values, ...chart.baselines.map((b) => b.value));
  const pad = (hi - lo) * 0.18 || 1;
  const last = chart.data[chart.data.length - 1];
  const hex = toneClass(row.status).hex;
  const fmt = (v: number) => v.toFixed(chart.yDecimals);

  return (
    <div className="border-t border-ink/15 pt-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">{row.label}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <MeasurementBadge type={row.measurementType} />
          </div>
        </div>
        <StatusChip status={row.status} size="sm" />
      </div>
      <div
        className="h-[230px]"
        role="img"
        aria-label={`${row.label}, last ${chart.data.length} days. Latest ${row.currentDisplay}. Personal baseline ${row.baselineDisplay}. Status ${row.status}.`}
      >
        <ChartFrame>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: CHART.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART.axis }}
              tickFormatter={(d) => `${d}`}
              label={{ value: "Mission Day", position: "insideBottom", offset: -2, fill: CHART.muted, fontSize: 10 }}
              height={32}
            />
            <YAxis
              domain={[lo - pad, hi + pad]}
              tick={{ fill: CHART.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (chart.yDecimals ? Number(v).toFixed(1) : String(Math.round(v)))}
              width={44}
            />
            <Tooltip
              contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: CHART.ink }}
              labelStyle={{ color: CHART.muted }}
              labelFormatter={(d) => `Mission Day ${d}`}
              formatter={(v, name) => [`${fmt(Number(v))} ${chart.unit}`, String(name)]}
            />
            {chart.baselines.map((b) => (
              <ReferenceLine
                key={b.seriesKey}
                y={b.value}
                stroke={CHART.baseline}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: b.label, position: "insideTopRight", fill: CHART.baselineLabel, fontSize: 10 }}
              />
            ))}
            {chart.series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: CHART.dotRing }}
                isAnimationActive={false}
              />
            ))}
            {chart.series.map((s) => (
              <ReferenceDot key={`dot-${s.key}`} x={last.day} y={last[s.key]} r={5} fill={hex} stroke={CHART.dotRing} strokeWidth={2} ifOverflow="extendDomain" />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </ChartFrame>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-accent" aria-hidden="true" /> Personal baseline
        </span>
        {chart.series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5" style={{ backgroundColor: s.color }} aria-hidden="true" /> {s.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" /> Latest, coloured by status
        </span>
      </div>
      {row.key === "activity" && (
        <p data-keep className="mt-1 text-[11px] text-muted">Baseline is your own early-flight mean; steps are not meaningful in microgravity. Low values are rest days.</p>
      )}
    </div>
  );
}
