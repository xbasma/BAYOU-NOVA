import { History } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import type { TimelineDay, TimelineEvent } from "@/lib/health";

const DOT: Record<TimelineEvent["tone"], string> = {
  neutral: "bg-muted",
  note: "bg-secondary",
  pattern: "bg-caution",
  act: "bg-danger",
};

export default function MissionTimeline({ days }: { days: TimelineDay[] }) {
  return (
    <GlassSection eyebrow="Mission day timeline" title={`Last ${days.length} days`} icon={History}>
      <ol className="space-y-5">
        {days.map((d, idx) => (
          <li key={d.day}>
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-accent">
              Mission Day {d.day}
              {idx === 0 && <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[10px] text-ink">Latest</span>}
            </h3>
            <ul className="space-y-2 border-l border-accent/30 pl-4">
              {d.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas ${DOT[e.tone]}`} aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-medium ${e.tone === "act" ? "text-danger" : "text-ink"}`}>{e.title}</p>
                    {e.measurementType && <MeasurementBadge type={e.measurementType} />}
                  </div>
                  <p className="text-xs leading-relaxed text-muted">{e.detail}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </GlassSection>
  );
}
