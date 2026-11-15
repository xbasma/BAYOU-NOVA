import SectionPage from "@/components/layout/SectionPage";
import HazardOverview from "@/components/learn/HazardOverview";
import LearnTabs from "@/components/learn/LearnTabs";
import MissionPhasePanel from "@/components/learn/MissionPhasePanel";
import PreventionToolkit from "@/components/learn/PreventionToolkit";

export const metadata = { title: "Learn | BAYOU-NOVA" };

export default function LearnPage() {
  return (
    <SectionPage section="learn" built>
      <LearnTabs
        overview={<HazardOverview />}
        phase={<MissionPhasePanel />}
        toolkit={<PreventionToolkit />}
      />
    </SectionPage>
  );
}
