import { Info } from "lucide-react";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import { loadReference } from "@/lib/health-data";

const ITEMS = [
  { type: "direct measurement", text: "An instrument reading of the quantity itself, such as a cuff blood pressure or a wearable resting heart rate. Not a clinical ECG." },
  { type: "functional indicator", text: "A proxy for how a system is functioning, such as a wearable sleep estimate or logged exercise time. Carries more uncertainty." },
  { type: "self-reported", text: "Answers you gave in the daily check-in." },
  { type: "behavioural inference", text: "An index derived from check-in answers, such as mood or concentration. It is not PHQ-9 or GAD-7 and is not diagnostic." },
] as const;

export default function MeasurementLegend() {
  const { fieldDefs, sourcesFile } = loadReference();
  return (
    <GlassSection eyebrow="Reading this page" title="Measurement labels and uncertainty" icon={Info}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <li key={i.type} className="rounded-xl border border-accent/25 bg-canvas/50 p-3">
            <MeasurementBadge type={i.type} />
            <p className="mt-2 text-xs leading-relaxed text-muted">{i.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
        <p>{fieldDefs.uncertainty_statement}</p>
        <p>
          Published red-flag criteria cite the sources listed on the Early Detection page. {sourcesFile.verification_status}{" "}
          <span className="text-warning">{sourcesFile.clinical_review_status}</span>
        </p>
        <p>
          PHQ-9 and GAD-7 are validated instruments that are never auto-scheduled here; frequency and interpretation in the
          spaceflight context should follow flight surgeon guidance.
        </p>
        <p>SIMULATED DEMONSTRATION DATA. Proof of concept, not a medical device.</p>
      </div>
    </GlassSection>
  );
}
