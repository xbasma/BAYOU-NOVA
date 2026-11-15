import SectionPage from "@/components/layout/SectionPage";
import CheckInHub from "@/components/checkin/CheckInHub";

export const metadata = { title: "Daily Check-In | BAYOU-NOVA" };

export default function Page() {
  return (
    <SectionPage section="check-in" built>
      <CheckInHub />
    </SectionPage>
  );
}
