import { Table2 } from "lucide-react";
import { GlassSection, LayerOneLabel, LayerTwoLabel, MeasurementBadge, StatusChip } from "@/components/health/Glass";
import { toneClass, type MetricRow } from "@/lib/health";

/** Two-layer cell: shows which layer produced the status, and never lets Layer 2 reassure over Layer 1. */
export function LayerCell({ row }: { row: MetricRow }) {
  return (
    <div className="space-y-2">
      {row.layer1 && (
        <div>
          <LayerOneLabel met={row.layer1.met} />
          <p className="mt-1 text-xs text-muted">
            {row.layer1.description}:{" "}
            <span className={row.layer1.met ? "font-semibold text-danger" : ""}>{row.layer1.met ? "MET" : "not met"}</span>
            <span title={row.layer1.sources.map((x) => x.citation).join(" | ")}>
              {" "}
              · {row.layer1.sources.map((x) => `${x.short}${x.verified ? "" : " (citation unverified)"}`).join("; ")}
            </span>
          </p>
        </div>
      )}
      <div>
        {row.layer2.suppressedByLayer1 ? (
          <p className="text-xs text-danger">Layer 2 comparison not used to reassure: a published criterion takes priority.</p>
        ) : (
          <>
            <LayerTwoLabel />
            <p className="mt-1 text-xs text-muted">{row.statusReason}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MetricsTable({ rows }: { rows: MetricRow[] }) {
  return (
    <GlassSection eyebrow="Metrics" title="Current values against your own baseline" icon={Table2}>
      {/* md and up: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Five health metrics with current value, personal baseline, and two-layer status</caption>
          <thead>
            <tr className="border-b border-accent/30 text-[11px] text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Metric</th>
              <th scope="col" className="py-2 pr-4 font-medium">Current</th>
              <th scope="col" className="py-2 pr-4 font-medium">Personal baseline</th>
              <th scope="col" className="py-2 font-medium">Status and basis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const t = toneClass(r.status);
              return (
                <tr key={r.key} className="border-b border-accent/10 align-top last:border-0">
                  <th scope="row" className={`border-l-4 py-4 pl-3 pr-4 text-left font-normal ${t.border}`}>
                    <p className="font-display text-sm font-semibold text-ink">{r.label}</p>
                    <div className="mt-1.5">
                      <MeasurementBadge type={r.measurementType} />
                    </div>
                  </th>
                  <td className="py-4 pr-4">
                    <p className="font-display text-base font-bold text-ink">{r.currentDisplay}</p>
                    <p data-keep className="text-xs text-muted">{r.trailingDisplay}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-display text-base font-bold text-ink">{r.baselineDisplay}</p>
                    <p data-keep className="text-xs text-muted">{r.baselineNote}</p>
                    <p className="mt-0.5 text-xs text-ink/80">{r.deltaDisplay}</p>
                  </td>
                  <td className="max-w-[420px] py-4">
                    <div className="mb-2">
                      <StatusChip status={r.status} />
                    </div>
                    <LayerCell row={r} />
                    <p className="mt-2 text-[11px] text-muted">{r.referenceDisplay}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* below md: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const t = toneClass(r.status);
          return (
            <li key={r.key} className={`rounded-xl border-l-4 border-y border-r border-y-ink/10 border-r-ink/10 bg-canvas/50 p-3.5 ${t.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-semibold text-ink">{r.label}</p>
                  <div className="mt-1">
                    <MeasurementBadge type={r.measurementType} />
                  </div>
                </div>
                <StatusChip status={r.status} size="sm" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] text-muted">Current</dt>
                  <dd className="font-display text-base font-bold text-ink">{r.currentDisplay}</dd>
                  <dd className="text-xs text-muted">{r.trailingDisplay}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Baseline</dt>
                  <dd className="font-display text-base font-bold text-ink">{r.baselineDisplay}</dd>
                  <dd className="text-xs text-muted">{r.deltaDisplay}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <LayerCell row={r} />
                <p className="mt-2 text-[11px] text-muted">{r.baselineNote}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassSection>
  );
}
