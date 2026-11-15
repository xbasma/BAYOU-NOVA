import { ShieldAlert } from "lucide-react";
import { SimulatedBadge } from "@/components/health/Glass";
import GlassPanel from "@/components/ui/GlassPanel";
import { CREW_SCENARIO, PRIVACY_NOTE, PRIVACY_POINTS } from "@/lib/crew";

/**
 * Always first on the Crew page. The note is shown word for word, as required,
 * and the platform makes no claim of anonymity.
 */
export default function CrewPrivacyNotice() {
  return (
    <GlassPanel eyebrow="Read first" title="Privacy" icon={ShieldAlert} status="watch">
      <p className="mb-3">
        <SimulatedBadge />
      </p>
      <p
        role="note"
        className="rounded-xl border-2 border-warning/70 bg-warning/[0.08] p-4 text-[15px] font-semibold leading-relaxed text-ink"
      >
        {PRIVACY_NOTE}
      </p>
      <p className="mt-3 text-sm text-ink/90">{CREW_SCENARIO}</p>
      <ul className="mt-3 space-y-2 text-sm text-ink/90">
        {PRIVACY_POINTS.map((p) => (
          <li key={p} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
