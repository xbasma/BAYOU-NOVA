import type { MeasurementType } from "./types";

/** Human labels for the four measurement honesty labels (About page). */
export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  direct_measurement: "direct measurement",
  functional_indicator: "functional indicator",
  self_reported: "self-reported",
  behavioural_inference: "behavioural inference",
};

export function missionDayLabel(day: number): string {
  return `Mission Day ${day}`;
}
