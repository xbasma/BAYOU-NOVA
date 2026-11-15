import { CircleCheck, Eye, OctagonAlert, Search } from "lucide-react";
import { STATUS_LEVELS, STATUS_META, toneClass, type StatusLevel } from "@/lib/health";

const ICON = { normal: CircleCheck, monitor: Eye, investigate: Search, act: OctagonAlert } as const;

export default function StatusPills({
  counts,
  overall,
}: {
  counts: Record<StatusLevel, number>;
  overall: StatusLevel;
}) {
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Status levels">
        {STATUS_LEVELS.map((s) => {
          const t = toneClass(s);
          const Icon = ICON[s];
          const active = s === overall;
          return (
            <li
              key={s}
              title={STATUS_META[s].meaning}
              className={`flex items-center gap-3 rounded-full border px-4 py-3 backdrop-blur-xl transition ${t.border} ${t.bg} ${
                active ? "ring-2 ring-offset-2 ring-offset-canvas" : "opacity-80"
              }`}
              style={active ? ({ ["--tw-ring-color" as string]: t.hex } as React.CSSProperties) : undefined}
              aria-current={active ? "true" : undefined}
            >
              <Icon className={`h-6 w-6 shrink-0 ${t.text}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className={`block font-display text-sm font-bold ${t.text}`}>
                  {STATUS_META[s].label}
                </span>
                <span className="block text-xs text-ink/80">
                  {counts[s]} of 5 metrics{active ? " · current overall" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Act is reserved for published red-flag criteria (Layer 1). Monitor and Investigate come only from the experimental
        detection rule (Layer 2), which is not a validated clinical detection method. Hover a pill for its meaning.
      </p>
    </div>
  );
}
