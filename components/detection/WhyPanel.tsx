import { CircleHelp, EyeOff, MessageCircleQuestion } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import { sourceRef, type DetectionResult } from "@/lib/detection";
import { loadReference } from "@/lib/health-data";

type Basis = "spaceflight" | "earth" | "general";
interface Possibility {
  basis: Basis;
  text: string;
  source_ids: string[];
  emphasis?: boolean;
}
interface StreamContext {
  title: string;
  possibilities: Possibility[];
  cannot_see: string;
}

const BASIS_STYLE: Record<Basis, string> = {
  spaceflight: "border-secondary/50 bg-secondary/10 text-secondary",
  earth: "border-accent/50 bg-accent/10 text-accent",
  general: "border-ink/20 text-muted",
};

/**
 * "Why might this be happening?"
 * Possibilities, each tagged with where it comes from, and what the platform
 * cannot see. Never a cause, never a diagnosis. When Layer 1 is met the
 * section steps aside: a red flag is acted on, not explained away.
 */
export default function WhyPanel({
  detection,
  onlyStreams,
}: {
  detection: DetectionResult;
  onlyStreams?: string[];
}) {
  const { detectionContext } = loadReference();
  const streams = detectionContext.streams as unknown as Record<string, StreamContext>;
  const patternNotes = detectionContext.patterns as unknown as Record<string, { summary: string }>;
  const labels = detectionContext.basis_labels as Record<Basis, string>;

  const departing = detection.streams
    .filter((s) => s.departing)
    .filter((s) => !onlyStreams || onlyStreams.includes(s.id));
  const patterns = detection.patternsPresent.filter((p) => !onlyStreams || onlyStreams.includes(p.anchor.id));
  const layer1Met = detection.layer1Met.length > 0;

  return (
    <GlassSection eyebrow="Context, not a diagnosis" title="Why might this be happening?" icon={CircleHelp}>
      {layer1Met && (
        <p className="mb-4 rounded-xl border border-danger/50 bg-danger/[0.08] p-3 text-sm leading-relaxed text-ink">
          <span className="font-semibold text-danger">A published red flag is met. </span>
          The platform does not suggest explanations for a red flag. It needs a clinician now, not a list of possible causes.
          {departing.length > 0 && " The notes below concern the Layer 2 pattern observations only."}
        </p>
      )}

      {departing.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink/90">
          No signal is showing a consistent unfavourable direction, so there is nothing here to explain. That is not a
          statement that you are well. If something feels wrong, say so in the daily check-in or to your flight surgeon.
        </p>
      ) : (
        <>
          <p className="max-w-3xl text-sm leading-relaxed text-ink/90">{detectionContext.intro}</p>

          {patterns.length > 0 && (
            <ul className="mt-4 space-y-2">
              {patterns.map((p) => (
                <li key={p.id} className="rounded-xl border border-dashed border-caution/60 bg-caution/[0.06] p-3">
                  <p className="text-sm font-semibold text-ink">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/85">{patternNotes[p.id]?.summary}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {departing.map((s) => {
              const ctx = streams[s.id];
              if (!ctx) return null;
              return (
                <article key={s.id} className="flex flex-col rounded-xl border border-ink/10 bg-canvas/50 p-4">
                  <h3 className="font-display text-sm font-semibold text-ink">{ctx.title}</h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Departing: {s.signals.filter((x) => x.departing).map((x) => x.label.toLowerCase()).join(", ")}
                  </p>
                  <ul className="mb-3 mt-3 space-y-3">
                    {ctx.possibilities.map((p, i) => (
                      <li key={i} className={p.emphasis ? "rounded-lg border border-accent/50 bg-accent/[0.06] p-2.5" : ""}>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${BASIS_STYLE[p.basis]}`}>
                          {labels[p.basis]}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-ink/90">{p.text}</p>
                        {p.source_ids.length > 0 && (
                          <p data-keep className="mt-0.5 text-[11px] text-muted">
                            {p.source_ids.map((id) => {
                              const src = sourceRef(id);
                              return (
                                <span key={id} title={src.citation} className="mr-2">
                                  {src.short}
                                  {!src.verified && " (citation unverified)"}
                                </span>
                              );
                            })}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p data-keep className="mt-auto flex items-start gap-2 border-t border-ink/10 pt-3 text-xs leading-relaxed text-muted">
                    <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-semibold text-ink/80">The platform cannot see: </span>
                      {ctx.cannot_see}
                    </span>
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-ink/10 bg-white/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MessageCircleQuestion className="h-4 w-4 text-accent" aria-hidden="true" />
              {detectionContext.next_steps.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted">{detectionContext.next_steps.note}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink/90">
              {detectionContext.next_steps.items.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </GlassSection>
  );
}
