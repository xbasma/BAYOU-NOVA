import { Dumbbell, Moon } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";

type SF = ReturnType<typeof buildProfileView>["sleepFitness"];

export default function SleepFitnessPanel({ data }: { data: SF }) {
  return (
    <GlassSection eyebrow="Sleep and fitness baseline" title="Rest and capacity" icon={Moon}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-accent/25 bg-canvas/50 p-3.5">
          <p className="text-[11px] text-muted">Sleep</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{data.sleepDisplay}</p>
          <p className="text-xs text-muted">Average nightly duration</p>
          <p className="mt-2 font-display text-lg font-bold text-ink">{data.sleepEfficiency.toFixed(1)}%</p>
          <p className="text-xs text-muted">Average sleep efficiency</p>
          <div className="mt-2">
            <MeasurementBadge type="functional indicator" />
          </div>
          <p className="mt-2 text-xs text-muted">Wearable estimate, not polysomnography.</p>
        </div>
        <div className="rounded-xl border border-accent/25 bg-canvas/50 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" /> Fitness
          </p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{data.steps.toLocaleString()} steps/day</p>
          <p className="text-xs text-muted">Preflight activity</p>
          <p className="mt-2 font-display text-lg font-bold text-ink">{data.vo2Preflight} ml/kg/min</p>
          <p className="text-xs text-muted">VO₂ max, preflight lab test</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MeasurementBadge type="functional indicator" />
            <MeasurementBadge type="direct measurement" />
          </div>
        </div>
      </div>
      {data.vo2Flight.length > 0 && (
        <div className="mt-3 rounded-xl border border-accent/25 bg-canvas/40 p-3.5">
          <p className="text-[11px] text-muted">In-flight VO₂ estimates for reference</p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
            {data.vo2Flight.map((v) => (
              <li key={v.day}>
                Mission Day {v.day}: <span className="font-semibold">{v.value}</span> ml/kg/min
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">Submaximal estimates with wider uncertainty than the preflight lab test.</p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{data.preflightExerciseNote}</p>
    </GlassSection>
  );
}
