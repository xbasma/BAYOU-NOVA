import { ClipboardList } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import type { buildProfileView } from "@/lib/health";

type History = ReturnType<typeof buildProfileView>["medicalHistory"];

export default function MedicalHistorySummary({ history }: { history: History }) {
  const rows: Array<[string, string[], string]> = [
    ["Conditions", history.conditions, "None recorded"],
    ["Medications", history.medications, "None recorded"],
    ["Allergies", history.allergies, "None recorded"],
  ];
  return (
    <GlassSection eyebrow="Medical history summary" title="History on file" icon={ClipboardList}>
      <dl className="space-y-3">
        {rows.map(([label, items, empty]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-accent/15 pb-3 last:border-0 last:pb-0">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-ink">{items.length ? items.join(", ") : empty}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted">{history.note} An empty history is not a statement that no history exists.</p>
    </GlassSection>
  );
}
