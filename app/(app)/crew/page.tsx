import SectionPage from "@/components/layout/SectionPage";
import CrewInsightPanel from "@/components/crew/CrewInsightPanel";
import CrewPrivacyNotice from "@/components/crew/CrewPrivacyNotice";
import CrewSignalIndicators from "@/components/crew/CrewSignalIndicators";
import EnvironmentPanel from "@/components/crew/EnvironmentPanel";
import OptInToggle from "@/components/crew/OptInToggle";

export const metadata = { title: "Crew | BAYOU-NOVA" };

/**
 * Crew Health Awareness. Environmental framing only: nothing on this page is
 * read from, or compared with, any individual's health data.
 */
export default function CrewPage() {
  return (
    <SectionPage section="crew" built>
      <CrewPrivacyNotice />
      <CrewSignalIndicators />
      <EnvironmentPanel />
      <CrewInsightPanel />
      <OptInToggle />
    </SectionPage>
  );
}
