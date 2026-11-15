/**
 * BAYOU-NOVA Phase 7: Crew Health Awareness (Crew tab).
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. Pure functions, no React.
 *
 * PRIVACY RULES, enforced by construction and by the logic checks:
 *   - Fictional scenario. The crew size appears nowhere in the data or the output.
 *   - Environmental framing only. Nothing here reads any astronaut's data, and
 *     nothing here is compared with an individual's health.
 *   - No counts, shares or per-person values. Indicators are words, not numbers.
 *   - The required privacy note is shown verbatim, and the platform makes no
 *     claim of anonymity.
 */

import crewJson from "../data/crew/crew-environment.json";
import { sourceRef, type SourceRef } from "./detection";

/* ------------------------------------------------------------------ types */

export type IndicatorLevel = "steady" | "improving" | "look";
export type EnvState = "within" | "above" | "below";
export type SignalKind = "environment" | "schedule" | "shared_routine";

export interface CrewFactor {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  measure: string;
  context: { text: string; sources: SourceRef[] };
  points: { day: number; value: number }[];
  /** Usual range: the lowest and highest daily value in the reference days. */
  reference: { from: number; to: number; min: number; max: number };
  recent: { from: number; to: number; mean: number; latest: number };
  state: EnvState;
  direction: "rising" | "falling" | "flat";
}

export interface CrewSignal {
  id: string;
  label: string;
  kind: SignalKind;
  level: IndicatorLevel;
  description: string;
  suggestedCrewAction: string;
  /** Set when the level was computed from an environmental reading. */
  fromReading: string | null;
}

export interface InsightLine {
  text: string;
  sources: SourceRef[];
}

export interface CrewInsight {
  lines: InsightLine[];
  combined: boolean;
  allSteady: boolean;
  actions: { id: string; text: string }[];
}

/* ---------------------------------------------------------------- raw data */

interface RawFactor {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  measure: string;
  context: { text: string; source_ids: string[] };
  values: number[];
}
interface RawSignal {
  id: string;
  label: string;
  kind: SignalKind;
  level?: IndicatorLevel;
  from_reading?: string;
  description: string;
  suggestedCrewAction: string;
}
interface RawInsightLine {
  text: string;
  source_ids: string[];
}

const ENV = crewJson.environment;
const INSIGHT = crewJson.insight;
const RAW_FACTORS = ENV.factors as unknown as RawFactor[];
const RAW_SIGNALS = crewJson.signals as unknown as RawSignal[];
const LINES = INSIGHT.lines as unknown as Record<string, RawInsightLine>;
const ACTIONS = INSIGHT.actions as unknown as Record<string, string>;

export const CREW_LABEL = crewJson.meta.label;
export const CREW_SCENARIO = crewJson.scenario;
/** Shown verbatim on the Crew page. */
export const PRIVACY_NOTE = crewJson.privacy_note;
export const PRIVACY_POINTS = crewJson.privacy_points;
export const INDICATOR_LABEL = crewJson.indicator_levels as Record<IndicatorLevel, string>;
export const SIGNALS_INTRO = crewJson.signals_intro;
export const ENVIRONMENT_COPY = {
  title: ENV.title,
  intro: ENV.intro,
  simulatedNote: ENV.simulated_note,
  referenceNote: ENV.reference_note,
  comparisonNote: ENV.comparison_note,
};
export const INSIGHT_COPY = {
  title: INSIGHT.title,
  intro: INSIGHT.intro,
  actionsTitle: INSIGHT.actions_title,
  actionsNote: INSIGHT.actions_note,
  notIndividual: INSIGHT.not_individual,
  actionSources: INSIGHT.actions_sources.map(sourceRef),
};
export const OPT_IN = crewJson.opt_in;

/* ---------------------------------------------------------------- factors */

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Day range as an inclusive list, e.g. [21, 24] gives 21, 22, 23, 24. */
const span = ([from, to]: number[]): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function buildFactors(): CrewFactor[] {
  const [startDay, endDay] = ENV.window_days;
  const days = span([startDay, endDay]);
  const [refFrom, refTo] = ENV.reference_days;
  const [recFrom, recTo] = ENV.recent_days;

  return RAW_FACTORS.map((f) => {
    const points = days.map((day, i) => ({ day, value: f.values[i] }));
    const ref = points.filter((p) => p.day >= refFrom && p.day <= refTo).map((p) => p.value);
    const rec = points.filter((p) => p.day >= recFrom && p.day <= recTo).map((p) => p.value);
    const min = Math.min(...ref);
    const max = Math.max(...ref);
    const recentMean = mean(rec);
    const state: EnvState = recentMean > max ? "above" : recentMean < min ? "below" : "within";
    const refMean = mean(ref);
    const direction: CrewFactor["direction"] =
      state === "within" ? "flat" : recentMean > refMean ? "rising" : "falling";
    return {
      id: f.id,
      label: f.label,
      unit: f.unit,
      decimals: f.decimals,
      measure: f.measure,
      context: { text: f.context.text, sources: f.context.source_ids.map(sourceRef) },
      points,
      reference: { from: refFrom, to: refTo, min, max },
      recent: { from: recFrom, to: recTo, mean: recentMean, latest: rec[rec.length - 1] },
      state,
      direction,
    };
  });
}

export const formatReading = (f: CrewFactor, v: number): string =>
  `${v.toFixed(f.decimals)}${f.unit === "°C" ? "" : " "}${f.unit}`;

/* ---------------------------------------------------------------- signals */

const factorLine = (f: CrewFactor): InsightLine => {
  const raw = LINES[`${f.id}_${f.state}`];
  return { text: raw.text, sources: raw.source_ids.map(sourceRef) };
};

/**
 * Indicators in words. A signal tied to a reading takes its level from that
 * reading, so the indicator and the Environmental Factors panel cannot disagree.
 */
export function buildSignals(factors: CrewFactor[] = buildFactors()): CrewSignal[] {
  return RAW_SIGNALS.map((s) => {
    const factor = s.from_reading ? factors.find((f) => f.id === s.from_reading) : undefined;
    if (s.from_reading && !factor) throw new Error(`Signal ${s.id} refers to an unknown reading`);
    const level: IndicatorLevel = factor ? (factor.state === "within" ? "steady" : "look") : (s.level as IndicatorLevel);
    return {
      id: s.id,
      label: s.label,
      kind: s.kind,
      level,
      description: factor ? factorLine(factor).text : s.description,
      suggestedCrewAction: factor && level === "steady" ? "No action needed. Keep routine checks." : s.suggestedCrewAction,
      fromReading: s.from_reading ?? null,
    };
  });
}

/* ---------------------------------------------------------------- insight */

/** Signals that bear on sleep and comfort for everyone aboard, used for the combined line. */
const SLEEP_COMFORT_SIGNALS = ["evening-light", "sleep-shift", "sleep-quarters-noise"];

export function buildInsight(
  factors: CrewFactor[] = buildFactors(),
  signals: CrewSignal[] = buildSignals(factors)
): CrewInsight {
  const look = (id: string) => signals.find((s) => s.id === id)?.level === "look";
  const factor = (id: string) => factors.find((f) => f.id === id);

  const combined = SLEEP_COMFORT_SIGNALS.filter(look).length >= 2;
  const anyOutside = factors.some((f) => f.state !== "within") || signals.some((s) => s.level === "look");

  const lines: InsightLine[] = [];
  if (combined) lines.push({ text: LINES.combined.text, sources: [] });
  for (const f of factors) lines.push(factorLine(f));
  if (!anyOutside) lines.push({ text: LINES.all_steady.text, sources: [] });

  const actions: { id: string; text: string }[] = [];
  if (factor("co2")?.state === "above") actions.push({ id: "co2", text: ACTIONS.co2 });
  if (factor("light")?.state === "above") actions.push({ id: "light", text: ACTIONS.light });
  if (look("sleep-shift")) actions.push({ id: "schedule", text: ACTIONS.schedule });
  if (look("sleep-quarters-noise")) actions.push({ id: "noise", text: ACTIONS.noise });

  return { lines, combined, allSteady: !anyOutside, actions };
}

/* ---------------------------------------------------------------- opt-in */

/** Opt-in is off until the person turns it on, and it is only ever a preference. */
export const OPT_IN_DEFAULT = OPT_IN.default;

export function participationStatus(optedIn: boolean): string {
  return optedIn ? OPT_IN.status_on : OPT_IN.status_off;
}

/* ----------------------------------------------------------- privacy guard */

/**
 * Patterns that would reveal a crew size, a count of people, a share of the
 * crew, or an individual. Used by the logic checks over everything the Crew
 * tab can show.
 */
const COUNT_WORDS = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|few|most|many|half)";
const PEOPLE = "(?:crew ?mates?|crew ?members?|crew|astronauts?|people|persons?|members|colleagues|individuals)";
const PRIVACY_PATTERNS: RegExp[] = [
  new RegExp(`\\b${COUNT_WORDS}\\s+(?:of\\s+)?(?:the\\s+|our\\s+)?${PEOPLE}\\b`, "i"),
  new RegExp(`\\b\\d+\\s*(?:%|percent)\\s+of\\s+(?:the\\s+)?${PEOPLE}\\b`, "i"),
  /\bcrew of\b/i,
  /\b[A-Z]-\d{3}\b/, // a demonstration astronaut id
  /\b(?:you|your)\s+(?:sleep|heart|blood pressure|readings?|baseline)\b/i, // individual health data
];

export function findPrivacyViolations(strings: string[]): string[] {
  const hits: string[] = [];
  for (const s of strings) for (const re of PRIVACY_PATTERNS) if (re.test(s)) hits.push(s);
  return hits;
}

/** Every string the Crew tab can show from the scenario data. */
export function allCrewStrings(): string[] {
  const factors = buildFactors();
  const signals = buildSignals(factors);
  const insight = buildInsight(factors, signals);
  const out: string[] = [
    CREW_SCENARIO,
    PRIVACY_NOTE,
    SIGNALS_INTRO,
    ENV.intro,
    ENV.simulated_note,
    ENV.reference_note,
    ENV.comparison_note,
    INSIGHT.intro,
    INSIGHT.not_individual,
    INSIGHT.actions_note,
    OPT_IN.what_it_means,
    OPT_IN.viewing_note,
    OPT_IN.withdraw_note,
    OPT_IN.limits_note,
    OPT_IN.status_on,
    OPT_IN.status_off,
    ...PRIVACY_POINTS,
    ...OPT_IN.shares,
    ...insight.lines.map((l) => l.text),
    ...insight.actions.map((a) => a.text),
  ];
  for (const s of signals) out.push(s.label, s.description, s.suggestedCrewAction);
  for (const f of factors) out.push(f.label, f.measure, f.context.text);
  // Every wording variant, not only the ones this scenario selects.
  for (const l of Object.values(LINES)) out.push(l.text);
  return out;
}
