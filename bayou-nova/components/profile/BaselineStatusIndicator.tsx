import { BadgeCheck, CircleAlert } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";

type BaselineStatus = ReturnType<typeof buildProfileView>["baselineStatus"];

export default function BaselineStatusIndicator({ status }: { status: BaselineStatus }) {
  const ok = status.established;
  return (
    <GlassSection className={ok ? "border-safe/50" : "border-warning/60"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${
            ok ? "border-safe/70 bg-safe/15 text-safe" : "border-warning/70 bg-warning/15 text-warning"
          }`}
        >
          {ok ? <BadgeCheck className="h-8 w-8" aria-hidden="true" /> : <CircleAlert className="h-8 w-8" aria-hidden="true" />}
        </span>
        <div className="flex-1">
          <p className="text-[11px] text-muted">Preflight baseline</p>
          <p
            className={`font-display text-xl font-extrabold ${ok ? "text-safe" : "text-warning"}`}
            role="status"
          >
            {ok ? "Baseline Established" : "Baseline Incomplete"}
          </p>
          <p className="mt-1 text-sm text-ink/90">
            {status.readings} preflight daily readings (Mission Day {status.firstDay} to {status.lastDay})
            {status.vo2Day !== undefined && <>, plus one preflight lab VO₂ max test at Mission Day {status.vo2Day}</>}.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            No published minimum number of days is applied. The count is shown for transparency. A baseline is your own
            reference, not a clinical threshold, and it does not replace published red-flag criteria.
          </p>
        </div>
      </div>
    </GlassSection>
  );
}
