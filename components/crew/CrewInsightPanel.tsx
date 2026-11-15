import { Lightbulb, MessageSquareText } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { SourceTags } from "@/components/learn/SourceTags";
import { buildInsight, INSIGHT_COPY } from "@/lib/crew";

/** Crew Insight: a plain-language reading of the shared environment. Never about a person. */
export default function CrewInsightPanel() {
  const insight = buildInsight();

  return (
    <GlassPanel eyebrow="Crew insight" title={INSIGHT_COPY.title} icon={Lightbulb}>
      <p className="max-w-3xl text-sm text-muted">{INSIGHT_COPY.intro}</p>

      <ul className="mt-4 space-y-3">
        {insight.lines.map((l, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <div className="text-sm leading-relaxed text-ink/90">
              <p>{l.text}</p>
              {l.sources.length > 0 && (
                <p className="mt-1">
                  <SourceTags sources={l.sources} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {insight.actions.length > 0 && (
        <div className="mt-5 rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <h3 className="flex items-center gap-2 !text-sm">
            <MessageSquareText className="h-4 w-4 text-accent" aria-hidden="true" />
            {INSIGHT_COPY.actionsTitle}
          </h3>
          <p className="mt-1 text-xs text-muted">{INSIGHT_COPY.actionsNote}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink/90">
            {insight.actions.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <SourceTags sources={INSIGHT_COPY.actionSources} />
          </p>
        </div>
      )}

      <p className="mt-4 rounded-lg border border-ink/10 bg-white/60 p-3 text-xs text-muted">{INSIGHT_COPY.notIndividual}</p>
    </GlassPanel>
  );
}
