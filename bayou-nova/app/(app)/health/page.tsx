import SectionPage from "@/components/layout/SectionPage";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import HealthMetricOverview from "@/components/health/HealthMetricOverview";

export default function HealthPage() {
  return (
    <SectionPage section="health" built>
      <ProfileSummaryCard />
      <HealthMetricOverview />
    </SectionPage>
  );
}
