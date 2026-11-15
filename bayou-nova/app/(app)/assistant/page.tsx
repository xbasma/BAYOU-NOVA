import AssistantChat from "@/components/assistant/AssistantChat";
import SectionPage from "@/components/layout/SectionPage";

/** Feature 5: Medical Assistant. */
export default function Page() {
  return (
    <SectionPage section="assistant" built>
      <AssistantChat />
    </SectionPage>
  );
}
