import { CircleCheck, Eye, TrendingUp, type LucideIcon } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { buildSignals, INDICATOR_LABEL, SIGNALS_INTRO, type CrewSignal, type IndicatorLevel } from "@/lib/crew";

const LEVEL: Record<IndicatorLevel, { icon: LucideIcon; className: string; border: string }> = {
  steady: { icon: CircleCheck, className: "text-safe", border: "border-safe/40" },
  improving: { icon: TrendingUp, className: "text-safe", border: "border-safe/40" },
  look: { icon: Eye, className: "text-warning", border: "border-warning/60" },
};

const KIND_LABEL: Record<CrewSignal["kind"], string> = {
  environment: "Environment",
  schedule: "Schedule",
  shared_routine: "Shared routine",
};

/**
 * Anonymous crew signal indicators. Each one is a word and an icon, never a
 * number: no counts, no shares of the crew, no per-person values.
 */
export default function CrewSignalIndicators() {
  const signals = buildSignals();

  return (
    <section aria-labelledby="crew-signals-title">
      <div className="mb-3">
        <p className="label-mono">Crew signal indicators</p>
        <h2 id="crew-signals-title" className="!text-base sm:!text-lg">
          How the shared environment and routine look
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{SIGNALS_INTRO}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {signals.map((s) => {
          const lv = LEVEL[s.level];
          const Icon = lv.icon;
          return (
            <li key={s.id}>
              <GlassPanel as="div" className={`h-full !p-4 ${lv.border}`}>
                <p className="label-mono">{KIND_LABEL[s.kind]}</p>
                <h3 className="mt-0.5 !text-sm">{s.label}</h3>
                <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${lv.className}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {INDICATOR_LABEL[s.level]}
                </p>
                <p className="mt-2 text-sm text-ink/90">{s.description}</p>
                <p className="mt-2 text-sm text-muted">
                  <span className="font-semibold text-ink/90">Suggested action: </span>
                  {s.suggestedCrewAction}
                </p>
              </GlassPanel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
