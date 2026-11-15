import type { MeasuredAs } from "@/lib/learn";

const STYLES: Record<MeasuredAs, string> = {
  "direct measurement": "border-safe/50 bg-safe/10 text-safe",
  "functional indicator": "border-secondary/60 bg-secondary/10 text-secondary",
  "self-reported": "border-warning/50 bg-warning/10 text-warning",
  "behavioural inference": "border-muted/60 bg-muted/10 text-muted",
  "not measured": "border-ink/30 bg-white/60 text-ink/80",
};

/**
 * How a value is obtained, using the platform's four honesty labels, or
 * "not measured" where the platform has no data at all.
 */
export default function MeasuredAsBadge({ type }: { type: MeasuredAs }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STYLES[type]}`}>
      {type}
    </span>
  );
}
