"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, Waves } from "lucide-react";
import { ExperimentalRuleNote, GlassSection, MeasurementBadge } from "@/components/health/Glass";
import { STATUS_META, toneClass } from "@/lib/health";
import { DETECTION_METHOD, type DetectionResult, type SignalResult } from "@/lib/detection";
import { CHART } from "@/lib/theme";
import ChartFrame from "@/components/ui/ChartFrame";

const TREND_COLOR = "#E2680F";

function stateOf(s: SignalResult): { text: string; tone: "departing" | "quiet" | "favourable" | "none" } {
  if (!s.drift.evaluated) return { text: "Not enough days", tone: "none" };
  if (s.drift.unfavourable && s.shift.unfavourable) return { text: "Drifting and shifted", tone: "departing" };
  if (s.drift.unfavourable) return { text: "Drifting", tone: "departing" };
  if (s.shift.unfavourable) return { text: "Shifted, now steady", tone: "departing" };
  if (s.drift.direction !== "none" || s.shift.direction !== "none") return { text: "Favourable direction", tone: "favourable" };
  return { text: "No consistent direction", tone: "quiet" };
}

/** How the experimental rule's verdict built up, one square per mission day. */
function HistoryStrip({ detection }: { detection: DetectionResult }) {
  const { history } = detection;
  const firstMonitor = history.find((h) => h.level !== "normal")?.day;
  const firstPattern = history.find((h) => h.level === "investigate")?.day;
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">How the picture built up</h3>
      <p className="mt-0.5 text-xs text-muted">
        The same experimental rule, replayed on each earlier day using only what was known that day.
      </p>
      <ol className="mt-3 flex gap-1" aria-label="Layer 2 level on each mission day">
        {history.map((h) => {
          const t = toneClass(h.level);
          const label = `Mission Day ${h.day}: ${STATUS_META[h.level].label}. ${h.departingSignalIds.length} signal${h.departingSignalIds.length === 1 ? "" : "s"} departing, ${h.patternIds.length} combination pattern${h.patternIds.length === 1 ? "" : "s"}.`;
          return (
            <li key={h.day} className="min-w-0 flex-1" title={label}>
              <span className="sr-only">{label}</span>
              <span
                aria-hidden="true"
                className="block h-7 rounded-[5px] border border-white/60"
                style={{ backgroundColor: t.hex, opacity: h.level === "normal" ? 0.28 : 1 }}
              />
              <span aria-hidden="true" className="mt-1 block text-center text-[10px] tabular-nums text-muted">
                {h.day === history[0].day || h.day === history[history.length - 1].day || h.day === firstMonitor || h.day === firstPattern
                  ? h.day
                  : " "}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {(["normal", "monitor", "investigate"] as const).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: toneClass(l).hex, opacity: l === "normal" ? 0.28 : 1 }}
              aria-hidden="true"
            />
            {l === "normal" ? "Nothing departing" : l === "monitor" ? "Monitor: a signal on its own" : "Investigate: signals together"}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink/85">
        {firstMonitor === undefined
          ? "No signal has shown a consistent unfavourable direction on any replayed day."
          : firstPattern === undefined
            ? `A single signal first showed a direction on Mission Day ${firstMonitor}. No combination has formed.`
            : `A single signal first showed a direction on Mission Day ${firstMonitor}. Related signals were first moving together on Mission Day ${firstPattern}. A drift this gradual is hard to notice from one day to the next, which is what this layer is for.`}
      </p>
    </div>
  );
}

function DriftChart({ signal, baseline }: { signal: SignalResult; baseline: number | null }) {
  const data = signal.points;
  const values = [
    ...data.map((p) => p.value),
    ...(baseline !== null ? [baseline] : []),
    ...(signal.reference.median !== null ? [signal.reference.median] : []),
  ];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.16 || 1;
  const fmt = (v: number) => v.toFixed(signal.decimals);
  const showTrend = signal.trendLine !== null && signal.drift.direction !== "none";
  const lastDay = signal.window.to;
  const firstDay = lastDay - 29;
  const windowFrom = Math.max(signal.window.from, data[0]?.day ?? signal.window.from);

  return (
    <div
      className="h-[280px]"
      role="img"
      aria-label={`${signal.label}, last ${data.length} recorded days. ${signal.summary}`}
    >
      <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 16, bottom: 0, left: -6 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={[firstDay, lastDay]}
            allowDecimals={false}
            tick={{ fill: CHART.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
            label={{ value: "Mission Day", position: "insideBottom", offset: 2, fill: CHART.muted, fontSize: 10 }}
            height={44}
          />
          <YAxis
            domain={[lo - pad, hi + pad]}
            tick={{ fill: CHART.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => Number(v).toFixed(signal.decimals)}
            width={46}
          />
          <Tooltip
            contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: CHART.ink }}
            labelStyle={{ color: CHART.muted }}
            labelFormatter={(d) => `Mission Day ${d}`}
            formatter={(v) => [`${fmt(Number(v))} ${signal.unit}`, signal.label]}
          />
          {/* The defined observation window */}
          <ReferenceArea
            x1={windowFrom}
            x2={lastDay}
            fill="#62408A"
            fillOpacity={0.09}
            stroke="#62408A"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
            label={{ value: `${DETECTION_METHOD.window_days}-day window`, position: "insideTopLeft", fill: "#62408A", fontSize: 10 }}
          />
          {baseline !== null && (
            <ReferenceLine
              y={baseline}
              stroke={CHART.baseline}
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
          )}
          {signal.reference.median !== null && (
            <ReferenceLine
              y={signal.reference.median}
              stroke="#62408A"
              strokeDasharray="2 3"
              strokeWidth={1.5}
            />
          )}
          <Line
            type="linear"
            dataKey="value"
            name={signal.label}
            stroke={CHART.lineA}
            strokeWidth={2}
            dot={{ r: 2.5, fill: CHART.lineA, strokeWidth: 0 }}
            activeDot={{ r: 4.5, fill: CHART.lineA, stroke: CHART.dotRing }}
            isAnimationActive={false}
          />
          {/* Direction within the window (Theil-Sen median slope). Drawn only when a consistent direction exists. */}
          {showTrend && (
            <ReferenceLine
              segment={[
                { x: signal.trendLine!.from.day, y: signal.trendLine!.from.value },
                { x: signal.trendLine!.to.day, y: signal.trendLine!.to.value },
              ]}
              stroke={TREND_COLOR}
              strokeWidth={3}
              strokeLinecap="round"
              ifOverflow="extendDomain"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

/**
 * Gradual drift visualisation. One signal at a time: the daily values, the
 * 14-day observation window, the personal baseline and the direction the
 * experimental rule sees inside the window.
 */
export default function DriftPanel({
  detection,
  baselines,
}: {
  detection: DetectionResult;
  /** Preflight baseline per signal id, in display units, where one exists. */
  baselines: Record<string, number>;
}) {
  // Departing signals first, so the default view is the most relevant one.
  const ordered = useMemo(
    () => [...detection.signals].sort((a, b) => Number(b.departing) - Number(a.departing)),
    [detection.signals]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const signal = ordered.find((s) => s.id === selectedId) ?? ordered[0];
  const state = stateOf(signal);
  const DirIcon = signal.drift.direction === "up" ? TrendingUp : signal.drift.direction === "down" ? TrendingDown : Minus;
  const slope = signal.drift.slopePerDay;

  return (
    <GlassSection eyebrow="Layer 2 · gradual drift" title="Is anything moving slowly in one direction?" icon={Waves}>
      <ExperimentalRuleNote className="mb-5" />

      <HistoryStrip detection={detection} />

      <div className="mt-6 border-t border-ink/10 pt-5">
        <h3 className="text-sm font-semibold text-ink">Signal by signal</h3>
        <p className="mt-0.5 text-xs text-muted">
          Choose a signal. Departing signals are listed first and marked with a filled dot.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose a signal">
          {ordered.map((s) => {
            const active = s.id === signal.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-ink bg-ink text-champagne"
                    : "border-ink/15 bg-white/50 text-ink/80 hover:border-accent/60 hover:text-ink"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${s.departing ? "" : "border border-current opacity-50"}`}
                  style={s.departing ? { backgroundColor: TREND_COLOR } : undefined}
                  aria-hidden="true"
                />
                {s.label}
                <span className="sr-only">{s.departing ? " (departing)" : " (not departing)"}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h4 className="font-display text-base font-semibold text-ink">{signal.label}</h4>
              <MeasurementBadge type={signal.measurementType} />
            </div>
            <DriftChart signal={signal} baseline={baselines[signal.id] ?? null} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5" style={{ backgroundColor: CHART.lineA }} aria-hidden="true" /> Daily value
              </span>
              {baselines[signal.id] !== undefined && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0 w-5 border-t-2 border-dashed border-accent" aria-hidden="true" /> Preflight baseline{" "}
                  {baselines[signal.id].toFixed(signal.decimals)} {signal.unit}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-5 border-t-2 border-dotted border-secondary" aria-hidden="true" /> Own early-flight median
                {signal.reference.median !== null ? ` ${signal.reference.median.toFixed(signal.decimals)} ${signal.unit}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded-full" style={{ backgroundColor: TREND_COLOR }} aria-hidden="true" /> Direction in the window
              </span>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className={`rounded-xl border p-3 ${state.tone === "departing" ? "border-caution/60 bg-caution/10" : "border-ink/10 bg-canvas/50"}`}>
              <dt className="text-[11px] font-semibold text-muted">What the rule sees</dt>
              <dd className={`mt-1 flex items-center gap-1.5 font-semibold ${state.tone === "departing" ? "text-caution" : "text-ink"}`}>
                <DirIcon className="h-4 w-4" aria-hidden="true" />
                {state.text}
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-ink/85">{signal.summary}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/50 p-3">
              <dt className="text-[11px] font-semibold text-muted">Days used</dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink/85">
                {signal.window.n} values in Mission Day {Math.max(signal.window.from, signal.reference.from)} to {signal.window.to}, compared with{" "}
                {signal.reference.n} of your own early-flight days (Mission Day {signal.reference.from} to {signal.reference.to}).
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/50 p-3">
              <dt className="text-[11px] font-semibold text-muted">Size of the change (described, never judged)</dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink/85">
                {slope !== null && signal.drift.direction !== "none"
                  ? `Median change of about ${Math.abs(slope).toFixed(signal.decimals + 1)} ${signal.unit} per day inside the window. `
                  : ""}
                {signal.window.median !== null && signal.reference.median !== null
                  ? `Window median ${signal.window.median.toFixed(signal.decimals)} ${signal.unit}; own early-flight median ${signal.reference.median.toFixed(signal.decimals)} ${signal.unit}. `
                  : ""}
                No size cut-off is applied: only whether the direction is consistent.
              </dd>
            </div>
            {signal.compositeNote && (
              <div className="rounded-xl border border-ink/10 bg-canvas/50 p-3 text-xs leading-relaxed text-ink/85">
                {signal.compositeNote}
              </div>
            )}
          </dl>
        </div>
      </div>
    </GlassSection>
  );
}
