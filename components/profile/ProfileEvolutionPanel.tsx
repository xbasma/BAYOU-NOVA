import { Activity, Compass, ShieldAlert, Sparkles } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import type { buildEvolution, EvolutionItem } from "@/lib/health";

type Evolution = ReturnType<typeof buildEvolution>;

const TAG_STYLE: Record<EvolutionItem["tag"], string> = {
  Published: "border-accent/60 bg-accent/15 text-accent",
  Experimental: "border-dashed border-secondary/70 text-secondary",
  Context: "border-muted/50 text-muted",
};

function Item({ item }: { item: EvolutionItem }) {
  return (
    <li className="rounded-lg border border-ink/10 bg-canvas/50 p-3 text-sm leading-relaxed text-ink/90">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${TAG_STYLE[item.tag]}`}>
          {item.tag === "Experimental" ? "Experimental pattern observation" : item.tag === "Published" ? "Published red flag criteria" : "Context"}
        </span>
        {item.measurementType && <MeasurementBadge type={item.measurementType} />}
      </div>
      {item.text}
    </li>
  );
}

export default function ProfileEvolutionPanel({ evolution }: { evolution: Evolution }) {
  const { expected, variation, concerning } = evolution;
  return (
    <GlassSection
      eyebrow="Profile evolution"
      title="How your profile is changing"
      icon={Compass}
      right={
        <span className="rounded-full border border-accent/50 bg-canvas/60 px-3 py-1 text-xs font-medium text-accent">
          {evolution.phaseLabel}
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Expected adaptation */}
        <div className="rounded-xl border border-secondary/50 bg-secondary/10 p-4">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-secondary">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Expected Adaptation
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/90">{expected.summary}</p>
          <ul className="mt-3 space-y-2">
            {expected.items.map((i, k) => (
              <Item key={k} item={i} />
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">{expected.basis}</p>
          <p className="mt-1 text-xs text-muted">Context sources: {expected.sources.join("; ")}.</p>
        </div>

        {/* Individual variation */}
        <div className="rounded-xl border border-accent/50 bg-accent/10 p-4">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-accent">
            <Activity className="h-4 w-4" aria-hidden="true" /> Individual Variation
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/90">{variation.summary}</p>
          <ul className="mt-3 space-y-2">
            {variation.items.length ? (
              variation.items.map((i, k) => <Item key={k} item={i} />)
            ) : (
              <li className="rounded-lg border border-ink/10 bg-canvas/50 p-3 text-sm text-muted">
                No metric is currently sitting within its own early-flight variation. See the next column.
              </li>
            )}
          </ul>
        </div>

        {/* Concerning deviation */}
        <div
          className={`rounded-xl border p-4 ${
            concerning.none ? "border-ink/10 bg-canvas/40" : "border-danger/60 bg-danger/10"
          }`}
        >
          <h3 className={`flex items-center gap-2 font-display text-sm font-semibold ${concerning.none ? "text-muted" : "text-danger"}`}>
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Concerning Deviation
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/90">{concerning.summary}</p>
          {!concerning.none && (
            <ul className="mt-3 space-y-2">
              {concerning.items.map((i, k) => (
                <Item key={k} item={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Individual expected ranges are not established. Language here describes what may be consistent with a change from
        your own reference; it is not a diagnosis. Report new symptoms and follow flight surgeon guidance.
      </p>
    </GlassSection>
  );
}
