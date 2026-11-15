import Link from "next/link";
import { ArrowRight, Check, Combine, Minus } from "lucide-react";
import { ExperimentalRuleNote, GlassSection, MeasurementBadge } from "@/components/health/Glass";
import { DETECTION_METHOD, type DetectionResult, type PatternResult, type StreamResult } from "@/lib/detection";

const BAD = "#E2680F";

function StreamChip({ stream, role }: { stream: StreamResult; role: "anchor" | "companion" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        stream.departing ? "border-caution/60 bg-caution/10 text-caution" : "border-ink/15 bg-white/40 text-muted"
      }`}
    >
      {stream.departing ? <Check className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
      {stream.label}
      <span className="font-normal opacity-80">
        {role === "anchor" ? "· must be departing" : ""}
        <span className="sr-only">{stream.departing ? " (departing)" : " (not departing)"}</span>
      </span>
    </span>
  );
}

function PatternCard({ pattern }: { pattern: PatternResult }) {
  return (
    <li
      className={`rounded-xl border p-4 ${
        pattern.present ? "border-2 border-dashed border-caution/70 bg-caution/[0.07]" : "border-ink/10 bg-canvas/50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">{pattern.title}</h4>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            pattern.present ? "border-caution/60 bg-caution/15 text-caution" : "border-ink/15 text-muted"
          }`}
        >
          {pattern.present
            ? `Observed${pattern.observedSinceDay ? ` since Mission Day ${pattern.observedSinceDay}` : ""}`
            : "Not observed"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StreamChip stream={pattern.anchor} role="anchor" />
        <span className="px-1 text-xs font-semibold text-muted">with any of</span>
        {pattern.companions.map((c) => (
          <StreamChip key={c.id} stream={c} role="companion" />
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">{pattern.rule}</p>
      {pattern.present && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink">{pattern.statement} This is not a diagnosis.</p>
          <ExperimentalRuleNote className="mt-3" />
          <Link
            href={`/alerts/${pattern.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            Open this pattern
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
    </li>
  );
}

/**
 * Combination pattern visualisation.
 * Each row is a signal, each column a mission day. A filled cell means that
 * day sat on the unfavourable side of the astronaut's own early-flight median.
 * It shows direction only; the shade does not encode size. Related signals
 * filling up over the same days is what a combination pattern looks like.
 */
export default function CombinationPanel({
  detection,
  onlyStreams,
}: {
  detection: DetectionResult;
  /** Restrict the grid to these streams (used by the pattern detail page). */
  onlyStreams?: string[];
}) {
  const { matrix } = detection;
  const rows = onlyStreams ? matrix.rows.filter((r) => onlyStreams.includes(r.signal.stream)) : matrix.rows;
  const patterns = onlyStreams
    ? detection.patterns.filter((p) => onlyStreams.includes(p.anchor.id))
    : detection.patterns;
  const windowStart = detection.day - DETECTION_METHOD.window_days + 1;
  // Day numbers shown above the grid: the ends, the start of the window, and every fifth day between.
  const anchors = [matrix.days[0], windowStart, detection.day];
  const labelled = new Set<number>([
    ...anchors,
    ...matrix.days.filter((d) => d % 5 === 0 && anchors.every((a) => Math.abs(a - d) > 1)),
  ]);

  // Group rows by stream so related signals sit together.
  const groups: { stream: string; label: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.stream === r.signal.stream);
    if (g) g.rows.push(r);
    else groups.push({ stream: r.signal.stream, label: r.signal.streamLabel, rows: [r] });
  }

  return (
    <GlassSection eyebrow="Layer 2 · combination patterns" title="Are related signals moving together?" icon={Combine}>
      <ExperimentalRuleNote className="mb-5" />

      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            For each signal and each of the last {matrix.days.length} mission days: whether that day was on the unfavourable
            side of the astronaut&apos;s own early-flight median.
          </caption>
          <colgroup>
            <col style={{ width: 190 }} />
            {matrix.days.map((d) => (
              <col key={d} />
            ))}
            <col style={{ width: 150 }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="pb-1.5 text-[11px] font-medium text-muted">
                Signal
              </th>
              {matrix.days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={`pb-1.5 text-center text-[10px] font-medium tabular-nums ${
                    d >= windowStart ? "text-secondary" : "text-muted"
                  }`}
                >
                  <span className="sr-only">Mission Day </span>
                  <span aria-hidden="true">{labelled.has(d) ? d : ""}</span>
                  <span className="sr-only">{d}</span>
                </th>
              ))}
              <th scope="col" className="pb-1.5 pl-3 text-[11px] font-medium text-muted">
                Rule&apos;s reading
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) =>
              g.rows.map((row, i) => (
                <tr key={row.signal.id}>
                  <th scope="row" className={`pr-3 text-left align-middle font-normal ${i === 0 ? "pt-2.5" : "pt-1"}`}>
                    {i === 0 && <span className="block text-[10.5px] font-semibold text-secondary">{g.label}</span>}
                    <span className="block text-xs text-ink">{row.signal.label}</span>
                  </th>
                  {row.cells.map((c) => (
                    <td key={c.day} className={`px-[1.5px] align-bottom ${i === 0 ? "pt-2.5" : "pt-1"}`}>
                      <span
                        title={`Mission Day ${c.day}: ${c.display}${
                          c.state === "unfavourable" ? ", unfavourable side of own early-flight median" : c.state === "usual" ? ", usual side" : ""
                        }`}
                        className={`block h-[18px] rounded-[4px] ${
                          c.state === "unfavourable"
                            ? ""
                            : c.state === "usual"
                              ? "bg-secondary/[0.16]"
                              : "border border-dashed border-ink/20"
                        } ${c.day >= windowStart ? "" : "opacity-60"}`}
                        style={c.state === "unfavourable" ? { backgroundColor: BAD } : undefined}
                      >
                        <span className="sr-only">
                          {c.state === "unfavourable" ? "unfavourable" : c.state === "usual" ? "usual" : "no value"}
                        </span>
                      </span>
                    </td>
                  ))}
                  <td className={`pl-3 align-middle text-[11px] ${i === 0 ? "pt-2.5" : "pt-1"}`}>
                    <span className={row.signal.departing ? "font-semibold text-caution" : "text-muted"}>
                      {row.signal.departing
                        ? row.signal.drift.unfavourable && row.signal.shift.unfavourable
                          ? "Drifting and shifted"
                          : row.signal.drift.unfavourable
                            ? "Drifting"
                            : "Shifted, now steady"
                        : "No direction"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-[3px]" style={{ backgroundColor: BAD }} aria-hidden="true" />
          Day on the unfavourable side of your own early-flight median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-[3px] bg-secondary/[0.16]" aria-hidden="true" />
          Usual side
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-[3px] border border-dashed border-ink/25" aria-hidden="true" />
          No value (rest day or not asked)
        </span>
        <span className="text-secondary">
          Violet day numbers are inside the {DETECTION_METHOD.window_days}-day window; earlier days are shown paler
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        The grid shows direction only. A filled cell is not a size and not a verdict on that day; single filled days are
        ordinary. The column on the right is what the rule concluded from the whole window.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-ink">Patterns the rule looks for</h3>
      <p className="mt-0.5 text-xs text-muted">
        A pattern needs its first stream and at least one related stream departing at the same time.
      </p>
      <ul className="mt-3 grid gap-3 lg:grid-cols-3">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </ul>

      {!onlyStreams && detection.loneSignals.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning/50 bg-warning/[0.08] p-3">
          <p className="text-xs font-semibold text-warning">Departing on their own (Monitor)</p>
          <ul className="mt-1.5 space-y-1">
            {detection.loneSignals.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-xs text-ink/85">
                <span className="font-medium text-ink">{s.label}</span>
                <MeasurementBadge type={s.measurementType} />
                <span>{s.summary}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{DETECTION_METHOD.chance_note}</p>
        </div>
      )}
    </GlassSection>
  );
}
