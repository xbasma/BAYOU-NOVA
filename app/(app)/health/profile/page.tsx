"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildEvolution, buildMetricRows, buildProfileView } from "@/lib/health";
import PageHeader from "@/components/layout/PageHeader";
import IdentityCard from "@/components/profile/IdentityCard";
import BaselineStatusIndicator from "@/components/profile/BaselineStatusIndicator";
import BaselineMetricsPanel from "@/components/profile/BaselineMetricsPanel";
import MedicalHistorySummary from "@/components/profile/MedicalHistorySummary";
import BaselineSparklines from "@/components/profile/BaselineSparklines";
import SleepFitnessPanel from "@/components/profile/SleepFitnessPanel";
import ProfileEvolutionPanel from "@/components/profile/ProfileEvolutionPanel";

/**
 * Personal Health Profile. Reads the active astronaut from the store and
 * computes everything from the JSON (plus this demo session) via lib/health.ts.
 */
export default function PersonalHealthProfilePage() {
  const { data } = useStore();

  const view = useMemo(() => {
    if (!data) return null;
    return {
      profile: buildProfileView(data),
      evolution: buildEvolution(data, buildMetricRows(data)),
    };
  }, [data]);

  if (!view) return null;
  const { profile, evolution } = view;

  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <Link href="/health" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Health overview
      </Link>
      <PageHeader
        icon={UserRound}
        eyebrow="Personal Health Profile"
        title="Profile and baselines"
        description="Your preflight starting point, how your baseline was established, and how your profile is evolving in flight."
      />

      <IdentityCard identity={profile.identity} />
      <BaselineStatusIndicator status={profile.baselineStatus} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BaselineMetricsPanel metrics={profile.baselineMetrics} />
        </div>
        <MedicalHistorySummary history={profile.medicalHistory} />
      </div>

      <BaselineSparklines sparklines={profile.sparklines} days={profile.baselineStatus.readings} />
      <SleepFitnessPanel data={profile.sleepFitness} />
      <ProfileEvolutionPanel evolution={evolution} />

      <p className="text-center text-xs leading-relaxed text-muted">
        SIMULATED DEMONSTRATION DATA. Proof of concept, not a medical device. The platform cannot guarantee privacy without a
        formal impact assessment and makes no claim of anonymity.
      </p>
    </div>
  );
}
