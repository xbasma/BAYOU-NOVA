import { Fingerprint, Rocket } from "lucide-react";
import { GlassSection, SimulatedBadge } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";

type Identity = ReturnType<typeof buildProfileView>["identity"];

export default function IdentityCard({ identity }: { identity: Identity }) {
  const facts: Array<[string, string]> = [
    ["Role", identity.role],
    ["Mission", identity.mission],
    ["Mission day", `Day ${identity.missionDay}`],
    ["Age range", identity.ageRange],
    ["Height", `${identity.heightCm} cm`],
    ["Preflight weight", `${identity.weightKg} kg`],
  ];
  return (
    <GlassSection
      eyebrow="Astronaut identity card"
      title={`Astronaut ${identity.id}`}
      icon={Fingerprint}
      right={<SimulatedBadge />}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center sm:mx-0">
          <span className="absolute inset-0 rounded-full border-2 border-accent/70 bg-gradient-to-br from-secondary/40 to-canvas shadow-[0_0_28px_rgba(240,96,24,0.3)]" />
          <span className="absolute inset-2 rounded-full border border-accent/30" />
          <span className="relative text-center">
            <Rocket className="mx-auto h-5 w-5 text-accent" aria-hidden="true" />
            <span className="mt-1 block font-display text-lg font-extrabold text-ink">
              {identity.id}
            </span>
          </span>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-4 border-t border-accent/20 pt-3 text-xs leading-relaxed text-muted">
        Fictional demo profile. {identity.scenario}
      </p>
    </GlassSection>
  );
}
