import type { ReactNode } from "react";
import { ScrollText } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/layout/PageHeader";
import BuildStatusCard from "@/components/layout/BuildStatusCard";
import { getNavItem } from "@/lib/nav";

/**
 * Safety and honesty principles that govern each tab. They are shown to the
 * user so the platform's limits are visible from the first screen.
 */
const PRINCIPLES: Record<string, string[]> = {
  dashboard: [
    "Established emergency red flags are checked first and always take priority over personal baseline comparisons.",
    "Personal baseline deviation is a secondary layer and is never used to reassure when a red-flag criterion is met.",
    "Detection logic without a published threshold is labelled “experimental pattern observation” and is not a validated clinical detection method.",
  ],
  health: [
    "A personal baseline is a reference for one individual. It is not a clinical threshold.",
    "Every value is labelled: direct measurement, functional indicator, self-reported or behavioural inference.",
    "BAYOU-NOVA does not directly measure bone density or immune function.",
  ],
  "check-in": [
    "The daily questions are indirect and about your day. Symptom-style questions appear only as follow-ups, and in the safety check that closes every check-in.",
    "Any safety-check item is a published red flag: it raises a red alert and is never compared with your baseline.",
    "PHQ-9 and GAD-7 are validated instruments. They are available, but never auto-scheduled; how often they are given, and how results are read in spaceflight, should follow flight surgeon guidance.",
    "The cognitive task is a structured observation, not a validated neuropsychological assessment.",
  ],
  assistant: [
    "Red flags come first. A red-flag word in your message, or a published criterion met in your data, always brings up the serious protocol card, and your personal baseline is never used to soften it.",
    "A serious response is a pre-defined protocol card that names the published guideline it follows. It is fixed text, not generated guidance.",
    "A moderate response rests on an experimental pattern observation, not a validated clinical rule, and says so every time.",
    "Wording is cautious: “may be consistent with”, never a diagnosis, and “warrants monitoring” rather than reassurance.",
    "When a situation is beyond reliable interpretation the assistant says so and points to your flight surgeon. It does not guess.",
    "Every reply is assembled by fixed rules from pre-written text and simulated data. No AI model writes it, and no clinician has reviewed it.",
  ],
  learn: [
    "Where a published threshold exists, the specific source is cited.",
    "Spaceflight-associated neuro-ocular syndrome (SANS) is presented as under active investigation.",
    "Open scientific questions are called out rather than smoothed over.",
    "A statement with no source is labelled as BAYOU-NOVA wording pending clinical review.",
    "Prevention measures are decided with a flight surgeon. Nothing here is a diagnosis or treatment advice.",
  ],
  crew: [
    "The demo uses a fictional crew scenario with environmental framing only. It is not linked to either demonstration astronaut.",
    "Indicators are words, never numbers, and nothing here compares one person's health with another's.",
    "No crew size is shown that would let individuals be deduced from the data.",
    "BAYOU-NOVA cannot guarantee privacy without a formal impact assessment and makes no claim of complete anonymity.",
  ],
};

/**
 * Standard frame for a main tab: header, optional live content, the section's
 * ground rules, and (unless `built`) a build-status note.
 */
export default function SectionPage({
  section,
  children,
  built = false,
}: {
  section: string;
  children?: ReactNode;
  /** True once the section's own features are implemented */
  built?: boolean;
}) {
  const item = getNavItem(section);
  const eyebrow =
    item.stage === "Foundation" || item.stage === "Prevent" ? item.stage : `Workflow · ${item.stage}`;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={item.icon}
        eyebrow={eyebrow}
        title={item.label}
        description={item.description}
      />

      {children}

      <div className={`grid gap-5 ${built ? "" : "lg:grid-cols-2"}`}>
        <GlassPanel eyebrow="Ground rules" title="How this section behaves" icon={ScrollText}>
          <ul className="space-y-3 text-sm text-ink/90">
            {PRINCIPLES[section]?.map((rule) => (
              <li key={rule} className="flex gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
        {!built && <BuildStatusCard features={item.features} />}
      </div>
    </div>
  );
}
