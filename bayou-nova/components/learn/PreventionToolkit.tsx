import { Brain, Dumbbell, Salad, TriangleAlert } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { ClaimList, PlatformNoteTag, SourceTags } from "@/components/learn/SourceTags";
import {
  TOOLKIT_EXERCISE,
  TOOLKIT_INTRO,
  TOOLKIT_NUTRITION,
  TOOLKIT_PSYCHOLOGICAL,
  type ToolkitItem,
} from "@/lib/learn";

function ItemList({ items }: { items: ToolkitItem[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((i) => (
        <li key={i.title} className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <h4 className="!text-sm">{i.title}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{i.text}</p>
          <p className="mt-2">{i.platformNote ? <PlatformNoteTag /> : <SourceTags sources={i.sources} />}</p>
        </li>
      ))}
    </ul>
  );
}

/** Prevention Toolkit tab: exercise rationale by type, nutrition, psychological preparation. */
export default function PreventionToolkit() {
  return (
    <>
      <GlassPanel eyebrow="Before you read" title="What this toolkit is" icon={TriangleAlert} status="watch">
        <p className="text-sm text-ink/90">{TOOLKIT_INTRO}</p>
      </GlassPanel>

      <GlassPanel eyebrow="Prevention · Exercise" title={TOOLKIT_EXERCISE.title} icon={Dumbbell}>
        <p className="max-w-3xl text-sm text-ink/90">{TOOLKIT_EXERCISE.note}</p>
        <p className="mt-2">
          <SourceTags sources={TOOLKIT_EXERCISE.noteSources} />
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {TOOLKIT_EXERCISE.types.map((t) => (
            <article key={t.id} className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
              <h3 className="!text-sm">{t.title}</h3>
              <p className="mt-1 text-xs font-semibold text-accent">Targets: {t.targets}</p>
              <p className="mt-2 text-sm text-ink/90">
                <span className="font-semibold">Why: </span>
                {t.why}
              </p>
              <p className="mb-1.5 mt-3 text-xs font-semibold text-muted">What the evidence shows</p>
              <ClaimList claims={t.evidence} />
              <p className="mt-3 rounded-lg border border-warning/40 bg-warning/[0.07] p-2.5 text-xs text-ink/90">
                <span className="font-semibold text-warning">Limits: </span>
                {t.limits}
              </p>
            </article>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel eyebrow="Prevention · Nutrition" title={TOOLKIT_NUTRITION.title} icon={Salad}>
        <p className="mb-4 max-w-3xl text-sm text-ink/90">{TOOLKIT_NUTRITION.note}</p>
        <ItemList items={TOOLKIT_NUTRITION.items} />
      </GlassPanel>

      <GlassPanel eyebrow="Prevention · Psychological" title={TOOLKIT_PSYCHOLOGICAL.title} icon={Brain}>
        <p className="mb-4 max-w-3xl text-sm text-ink/90">{TOOLKIT_PSYCHOLOGICAL.note}</p>
        <ItemList items={TOOLKIT_PSYCHOLOGICAL.items} />
      </GlassPanel>
    </>
  );
}
