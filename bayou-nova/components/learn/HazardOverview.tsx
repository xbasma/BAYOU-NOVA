import { BookOpenCheck } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import HazardCard from "@/components/learn/HazardCard";
import { HAZARDS, LEARN_HOW_TO_READ } from "@/lib/learn";

/** Overview tab: how to read the cards, then the eight hazard cards. */
export default function HazardOverview() {
  return (
    <>
      <GlassPanel eyebrow="Before you read" title={LEARN_HOW_TO_READ.title} icon={BookOpenCheck}>
        <ul className="space-y-2.5 text-sm text-ink/90">
          {LEARN_HOW_TO_READ.points.map((p) => (
            <li key={p} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <nav aria-label="Jump to a hazard">
        <ul className="flex flex-wrap gap-2">
          {HAZARDS.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className="inline-block rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs font-semibold text-ink/85 hover:border-accent hover:text-accent"
              >
                {h.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {HAZARDS.map((h) => (
          <HazardCard key={h.id} hazard={h} showPageLink />
        ))}
      </div>
    </>
  );
}
