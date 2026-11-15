"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, UserRound } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import { buildProfileView } from "@/lib/health";
import { useStore } from "@/lib/store";

/** Short identity summary for the Health overview. Phase 3 data via lib/health-data. */
export default function ProfileSummaryCard() {
  const { data } = useStore();
  const view = useMemo(() => (data ? buildProfileView(data) : null), [data]);
  if (!view) return null;
  const { identity, baselineStatus } = view;

  return (
    <GlassSection eyebrow={identity.role} title={identity.id} icon={UserRound}>
      <p className="text-sm text-muted">{identity.scenario}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-muted">Mission</dt>
          <dd className="mt-1">{identity.mission}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Mission day</dt>
          <dd className="mt-1">Day {identity.missionDay}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Age range</dt>
          <dd className="mt-1">{identity.ageRange}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Baseline</dt>
          <dd className={`mt-1 inline-flex items-center gap-1.5 ${baselineStatus.established ? "text-safe" : "text-warning"}`}>
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {baselineStatus.established ? "Established" : "Incomplete"}
          </dd>
        </div>
      </dl>
      <Link
        href="/health/profile"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-ink"
      >
        View full profile and baselines
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </GlassSection>
  );
}
