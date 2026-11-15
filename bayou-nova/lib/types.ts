/**
 * Shared types for the parts of BAYOU-NOVA that are not astronaut data
 * (the About page labels and the generic GlassPanel).
 *
 * Astronaut, check-in, questionnaire and session types live in
 * lib/health-data.ts and lib/session.ts. Detection types live in
 * lib/detection.ts. Learn types live in lib/learn.ts, Crew types in
 * lib/crew.ts and the Action and Follow-Up plan in lib/actions.ts.
 */

export type { AstronautId } from "./health-data";

/** Legacy key form of the four measurement-honesty labels (About page). */
export type MeasurementType =
  | "direct_measurement"
  | "functional_indicator"
  | "self_reported"
  | "behavioural_inference";

/** green / amber / orange / red, used by GlassPanel borders. */
export type Severity = "normal" | "watch" | "caution" | "urgent";

export interface DemoMeta {
  simulated: true;
  label: "SIMULATED DEMONSTRATION DATA";
  seed: number;
}
