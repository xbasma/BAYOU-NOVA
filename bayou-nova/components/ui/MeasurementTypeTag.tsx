import { MEASUREMENT_LABELS } from "@/lib/format";
import type { MeasurementType } from "@/lib/types";

const STYLES: Record<MeasurementType, string> = {
  direct_measurement: "border-safe/50 bg-safe/10 text-safe",
  functional_indicator: "border-secondary/60 bg-secondary/10 text-secondary",
  self_reported: "border-warning/50 bg-warning/10 text-warning",
  behavioural_inference: "border-muted/60 bg-muted/10 text-muted",
};

/**
 * Every metric shows how it was obtained, so the interface never implies
 * more certainty than the data supports.
 */
export default function MeasurementTypeTag({ type }: { type: MeasurementType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STYLES[type]}`}
    >
      {MEASUREMENT_LABELS[type]}
    </span>
  );
}
