import { CircleCheck, Eye, FlaskConical, OctagonAlert, Search, ShieldAlert } from "lucide-react";
import { ExperimentalRuleNote, PublishedBasisNote, StatusChip } from "@/components/health/Glass";
import { toneClass } from "@/lib/health";
import type { DetectionResult } from "@/lib/detection";

const ICON = { normal: CircleCheck, monitor: Eye, investigate: Search, act: OctagonAlert } as const;

/**
 * The current alert, with the layer that raised it named first.
 * Layer 1 is solid red; Layer 2 is dashed violet/orange; "no alert" says
 * plainly that it is not a statement of health.
 */
export default function CurrentAlertCard({
  detection,
  footer,
}: {
  detection: DetectionResult;
  footer?: React.ReactNode;
}) {
  const { alert } = detection;
  const tone = toneClass(alert.level);
  const Icon = ICON[alert.level];
  const isL1 = alert.layer === 1;
  const isL2 = alert.layer === 2;

  return (
    <section
      aria-labelledby="current-alert-heading"
      className={`glass-panel relative overflow-hidden p-5 sm:p-7 ${
        isL1 ? "!border-2 !border-danger" : isL2 ? `!border-2 !border-dashed ${tone.border}` : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px_6px_6px_6px] ${tone.bg} ${tone.text}`}
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${isL1 ? "text-danger" : "text-secondary"}`}>
              {isL1 ? (
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Raised by: {alert.layerName}
            </p>
            <h2 id="current-alert-heading" className="mt-1 !text-xl sm:!text-2xl">
              {alert.headline}
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <StatusChip status={alert.level} />
          <span className="text-xs text-muted">Evaluated on Mission Day {detection.day}</span>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink">{alert.statement}</p>

      {/* Detection basis: one of exactly two labels */}
      <div className="mt-4 max-w-3xl">
        {isL1 && <PublishedBasisNote label={alert.basisLabel} />}
        {isL2 && <ExperimentalRuleNote />}
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <dt className="text-xs font-semibold text-muted">What this layer means</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-ink/90">{alert.meaning}</dd>
        </div>
        <div className={`rounded-xl border p-4 ${isL1 ? "border-danger/50 bg-danger/[0.08]" : "border-ink/10 bg-canvas/50"}`}>
          <dt className={`text-xs font-semibold ${isL1 ? "text-danger" : "text-muted"}`}>
            {isL1 ? "What to do now" : "What to do with it"}
          </dt>
          <dd className={`mt-1.5 text-sm leading-relaxed ${isL1 ? "font-semibold text-ink" : "text-ink/90"}`}>{alert.action}</dd>
        </div>
      </dl>

      {alert.layer2SuppressedNote && (
        <p className="mt-4 rounded-xl border border-danger/40 bg-white/60 p-3 text-sm text-ink">
          <span className="font-semibold text-danger">Layer 1 overrides Layer 2. </span>
          {alert.layer2SuppressedNote}
        </p>
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}
