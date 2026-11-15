import { GlassSection, SimulatedBadge, StatusChip } from "@/components/health/Glass";
import type { StatusLevel } from "@/lib/health";

export default function MissionHeader({
  astronautId,
  mission,
  missionDay,
  overall,
}: {
  astronautId: string;
  mission: string;
  missionDay: number;
  overall: StatusLevel;
}) {
  return (
    <GlassSection>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex items-end gap-5">
          <h1
            className="font-display !text-[4.5rem] leading-[0.85] sm:!text-[6.5rem]"
            style={{ fontStretch: "125%", fontWeight: 700 }}
            aria-label={`Mission day ${missionDay}`}
          >
            {missionDay}
          </h1>
          <div className="pb-1.5">
            <p className="text-sm text-muted">Mission day</p>
            <p className="mt-0.5 text-lg font-semibold text-ink" style={{ fontStretch: "118%" }}>
              Astronaut {astronautId}
            </p>
            <p className="text-sm text-muted">{mission}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Overall</span>
            <StatusChip status={overall} />
          </div>
          <SimulatedBadge />
        </div>
      </div>
    </GlassSection>
  );
}
