import type { LucideIcon } from "lucide-react";
import { FlaskConical, ShieldAlert } from "lucide-react";
import { LAYER2_LABEL } from "@/lib/detection";
import { MEASUREMENT_LABEL, type StatusLevel, toneClass } from "@/lib/health";
import type { MeasurementType } from "@/lib/health-data";

/** Glass panel: translucent white over the nebula canvas, one porthole-rounded corner. */
export function GlassSection({
  title,
  eyebrow,
  icon: Icon,
  right,
  children,
  className = "",
  id,
}: {
  title?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`glass-panel relative overflow-hidden p-5 sm:p-6 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
      />
      <div className="relative">
        {(title || eyebrow || right) && (
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {Icon && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-canvas/60 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <div>
                {eyebrow && (
                  <p className="text-[11px] font-medium text-muted">{eyebrow}</p>
                )}
                {title && (
                  <h2 className="font-display text-base font-semibold text-ink sm:text-lg">
                    {title}
                  </h2>
                )}
              </div>
            </div>
            {right}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** One of the four measurement-honesty labels. */
export function MeasurementBadge({ type }: { type: MeasurementType | string }) {
  const key = type as MeasurementType;
  // field-definitions can carry a compound label (preflight lab / in-flight estimate)
  const label = MEASUREMENT_LABEL[key] ?? titleCase(String(type).split(" (")[0]);
  const note = MEASUREMENT_LABEL[key] ? null : String(type).match(/\((.*)\)/)?.[1];
  return (
    <span
      title={note ? `${label}: ${note}` : label}
      className="inline-flex items-center whitespace-nowrap rounded-full border border-secondary/50 bg-secondary/15 px-2 py-0.5 text-[10.5px] font-medium text-secondary"
    >
      {label}
    </span>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Layer labels. Layer 1 and Layer 2 are always distinguishable by icon, text and colour. */
export function LayerOneLabel({ met, children }: { met?: boolean; children?: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
        met ? "border-danger/70 bg-danger/25 text-danger" : "border-accent/60 bg-accent/15 text-accent"
      }`}
    >
      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
      {children ?? "Published red flag criteria"}
    </span>
  );
}

export function LayerTwoLabel() {
  return (
    <span
      title={LAYER2_LABEL}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-secondary/70 bg-transparent px-2 py-0.5 text-[10.5px] font-semibold text-secondary"
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Experimental pattern observation
    </span>
  );
}

/**
 * The full Layer 2 label, written out. Shown on every pattern observation:
 * "Experimental detection rule — this is not a validated clinical detection method".
 */
export function ExperimentalRuleNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-dashed border-secondary/60 bg-secondary/[0.07] px-3 py-2 text-xs font-semibold leading-snug text-secondary ${className}`}
    >
      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{LAYER2_LABEL}</span>
    </p>
  );
}

/** The Layer 1 basis line: "Based on published emergency criteria — <sources>". */
export function PublishedBasisNote({ label, className = "" }: { label: string; className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-accent/45 bg-accent/[0.07] px-3 py-2 text-xs font-semibold leading-snug text-accent ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

export function SimulatedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning ${className}`}
    >
      Simulated demonstration data
    </span>
  );
}

export function StatusChip({ status, size = "md" }: { status: StatusLevel; size?: "sm" | "md" }) {
  const t = toneClass(status);
  const label = { normal: "Normal", monitor: "Monitor", investigate: "Investigate", act: "Act" }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${t.border} ${t.bg} ${t.text} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.hex }} aria-hidden="true" />
      {label}
    </span>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border border-accent/20 bg-panel/30" />
      ))}
    </div>
  );
}
