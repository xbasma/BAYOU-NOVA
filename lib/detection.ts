/**
 * BAYOU-NOVA Phase 5: Early Detection engine.
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. Pure functions, no React, no network, no
 * database. Rules live in data/shared/detection-rules.json; this file only
 * evaluates them.
 *
 * TWO LAYERS, ONE PRIORITY (never relaxed here):
 *
 *   Layer 1  Published emergency red flags. Evaluated first, on absolute
 *            values and reported symptoms. This code path never reads a
 *            personal baseline, so a normal-looking baseline cannot soften a
 *            red flag. Any criterion met => status "act" (red).
 *
 *   Layer 2  Experimental detection rule. Looks for a consistent direction
 *            over a defined number of days in each signal, and reports a
 *            pattern only when related signals depart together. No
 *            percentage, points or standard-deviation cut-off is used. It can
 *            raise "monitor" or "investigate", never "act", and it is never
 *            used to reassure when Layer 1 is met.
 */

import rulesFile from "../data/shared/detection-rules.json";
import sourcesFile from "../data/shared/sources.json";
import {
  getLatestCheckin,
  type AstronautData,
  type Checkin,
  type DailyReading,
  type MeasurementType,
} from "./health-data";

/* ------------------------------------------------------------------ types */

export type StatusLevel = "normal" | "monitor" | "investigate" | "act";
export type Domain = "cardiovascular" | "neurological" | "psychological";
export type Direction = "up" | "down" | "none";

export interface SourceRef {
  id: string;
  short: string;
  citation: string;
  verified: boolean;
  url: string | null;
}

interface CriterionDef {
  id: string;
  domain: Domain;
  kind: "symptom" | "measured";
  screen_item?: string;
  also_checkin_answer?: { question: string; value: number };
  also_questionnaire_item?: { instrument: string; item_index: number; min_score: number };
  title: string;
  description: string;
  evidence: string;
  source_ids: string[];
  source_note: string;
  spaceflight_caveat?: string;
  requires_clinical_review?: boolean;
  measured?: {
    field?: string;
    op?: string;
    value?: number;
    systolic_above?: number;
    diastolic_above?: number;
    unit: string;
  };
}

interface SignalDef {
  id: string;
  stream: string;
  label: string;
  source:
    | { type: "reading"; field: string; skip_rest_days?: boolean }
    | { type: "checkin"; question: string };
  unit: string;
  scale: number;
  decimals: number;
  unfavourable: "up" | "down";
  measurement_type: MeasurementType;
  composite_note?: string;
}

interface PatternDef {
  id: string;
  title: string;
  anchor_stream: string;
  companion_streams: string[];
  rule: string;
  statement: string;
  checkin_branch: string | null;
}

const L1 = rulesFile.layer1;
const L2 = rulesFile.layer2;
const CRITERIA = L1.criteria as unknown as CriterionDef[];
const SIGNALS = L2.signals as unknown as SignalDef[];
const PATTERNS = L2.patterns as unknown as PatternDef[];
const METHOD = L2.method;
const [REF_FROM, REF_TO] = METHOD.own_reference_mission_days;

export const LAYER1_LABEL = L1.label; // "Based on published emergency criteria"
export const LAYER2_LABEL = L2.label; // "Experimental detection rule — this is not a validated clinical detection method"
export const LAYER2_SHORT_LABEL = L2.short_label;
export const LAYER1_MEANING = L1.meaning;
export const LAYER2_MEANING = L2.meaning;
export const DETECTION_METHOD = METHOD;
export const DOMAINS = L1.domains as { id: Domain; title: string; action: string }[];

export interface Layer1Result {
  id: string;
  domain: Domain;
  domainTitle: string;
  kind: "symptom" | "measured";
  title: string;
  description: string;
  met: boolean;
  /** What was looked at, in words. */
  valueAtEvaluation: string;
  /** Most recent earlier mission day on which this symptom was reported, if any. */
  previouslyReportedDay: number | null;
  evidence: string;
  sources: SourceRef[];
  sourceNote: string;
  /** "Based on published emergency criteria — <sources>" */
  basisLabel: string;
  action: string;
  spaceflightCaveat: string | null;
  requiresClinicalReview: boolean;
}

export interface SignalPoint {
  day: number;
  value: number;
}

export interface SignalResult {
  id: string;
  label: string;
  stream: string;
  streamLabel: string;
  measurementType: MeasurementType;
  unit: string;
  decimals: number;
  unfavourable: "up" | "down";
  compositeNote: string | null;
  /** Up to 30 days of values in display units. */
  points: SignalPoint[];
  window: { from: number; to: number; n: number; median: number | null };
  reference: { from: number; to: number; n: number; median: number | null };
  /** Direction within the 14-day window (Mann-Kendall). */
  drift: { evaluated: boolean; direction: Direction; unfavourable: boolean; slopePerDay: number | null };
  /** Window compared with own early-flight days (rank-sum). */
  shift: { evaluated: boolean; direction: Direction; unfavourable: boolean };
  /** Theil-Sen line across the window, for the drift chart. Descriptive only. */
  trendLine: { from: SignalPoint; to: SignalPoint } | null;
  /** True when drift or shift is in the unfavourable direction. */
  departing: boolean;
  summary: string;
}

export interface StreamResult {
  id: string;
  label: string;
  departing: boolean;
  signals: SignalResult[];
}

export interface PatternResult {
  id: string;
  title: string;
  rule: string;
  present: boolean;
  anchor: StreamResult;
  companions: StreamResult[];
  departingStreams: StreamResult[];
  statement: string;
  /** First mission day of the current unbroken run in which the pattern was observed. */
  observedSinceDay: number | null;
  checkinBranch: string | null;
}

export interface HistoryDay {
  day: number;
  level: Exclude<StatusLevel, "act">;
  departingSignalIds: string[];
  patternIds: string[];
}

export interface MatrixRow {
  signal: SignalResult;
  cells: { day: number; state: "unfavourable" | "usual" | "missing"; display: string }[];
}

export interface CurrentAlert {
  layer: 1 | 2 | null;
  level: StatusLevel;
  headline: string;
  statement: string;
  /** The label that names the detection basis. */
  basisLabel: string;
  layerName: string;
  /** What it means that this layer raised the alert. */
  meaning: string;
  action: string;
  /** Layer 1 met while Layer 2 also has observations: shown for context, never as reassurance. */
  layer2SuppressedNote: string | null;
}

export interface DetectionResult {
  day: number;
  latestCheckinDay: number | null;
  layer1: Layer1Result[];
  layer1Met: Layer1Result[];
  signals: SignalResult[];
  streams: StreamResult[];
  patterns: PatternResult[];
  patternsPresent: PatternResult[];
  /** Departing signals that are not part of any observed pattern. */
  loneSignals: SignalResult[];
  /** Layer 2 level on its own (never "act"). */
  layer2Level: Exclude<StatusLevel, "act">;
  status: StatusLevel;
  alert: CurrentAlert;
  history: HistoryDay[];
  matrix: { days: number[]; rows: MatrixRow[] };
}

/* ---------------------------------------------------------------- sources */

export function sourceRef(id: string): SourceRef {
  const s = sourcesFile.sources.find((x) => x.id === id) as
    | { id: string; short: string; citation: string; verified: boolean; url?: string; doi?: string }
    | undefined;
  if (!s) return { id, short: id, citation: id, verified: false, url: null };
  return {
    id: s.id,
    short: s.short,
    citation: s.citation,
    verified: s.verified,
    url: s.url ?? (s.doi ? `https://doi.org/${s.doi}` : null),
  };
}

export const allSources = (): SourceRef[] => sourcesFile.sources.map((s) => sourceRef(s.id));

/* ------------------------------------------------------------- statistics */

/** Complementary error function (Abramowitz and Stegun 7.1.26, max error about 1.5e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const r = poly * Math.exp(-z * z);
  return x >= 0 ? r : 2 - r;
}
const twoSidedP = (z: number) => erfc(Math.abs(z) / Math.SQRT2);

function tieCounts(values: number[]): number[] {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.values());
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Mann-Kendall trend test with tie correction and continuity correction.
 * Asks only whether the values have a consistent direction in time.
 */
export function mannKendall(values: number[]): { s: number; z: number; p: number } {
  const n = values.length;
  let s = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) s += Math.sign(values[j] - values[i]);
  const tieTerm = tieCounts(values).reduce((acc, t) => acc + t * (t - 1) * (2 * t + 5), 0);
  const variance = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  if (variance <= 0) return { s, z: 0, p: 1 };
  const z = s > 0 ? (s - 1) / Math.sqrt(variance) : s < 0 ? (s + 1) / Math.sqrt(variance) : 0;
  return { s, z, p: twoSidedP(z) };
}

/**
 * Mann-Whitney rank-sum test (normal approximation, tie and continuity
 * corrected). z > 0 means `current` tends to be larger than `reference`.
 */
export function rankSum(reference: number[], current: number[]): { z: number; p: number } {
  const n1 = current.length;
  const n2 = reference.length;
  if (!n1 || !n2) return { z: 0, p: 1 };
  let u = 0;
  for (const c of current) for (const r of reference) u += c > r ? 1 : c === r ? 0.5 : 0;
  const N = n1 + n2;
  const tieTerm = tieCounts([...reference, ...current]).reduce((acc, t) => acc + (t ** 3 - t), 0);
  const variance = ((n1 * n2) / 12) * (N + 1 - tieTerm / (N * (N - 1)));
  if (variance <= 0) return { z: 0, p: 1 };
  const d = u - (n1 * n2) / 2;
  const z = (d - 0.5 * Math.sign(d)) / Math.sqrt(variance);
  return { z, p: twoSidedP(z) };
}

/** Theil-Sen median slope and a line through the median point. Descriptive only. */
export function theilSen(points: SignalPoint[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const slopes: number[] = [];
  for (let i = 0; i < points.length - 1; i++)
    for (let j = i + 1; j < points.length; j++)
      slopes.push((points[j].value - points[i].value) / (points[j].day - points[i].day));
  const slope = median(slopes)!;
  const intercept = median(points.map((p) => p.value - slope * p.day))!;
  return { slope, intercept };
}

/* ------------------------------------------------------------ signal data */

const inflight = (a: AstronautData) => a.readings.filter((r) => r.phase === "inflight");

export function currentDay(a: AstronautData): number {
  return a.readings[a.readings.length - 1].mission_day;
}

/** Every in-flight value for one signal, in display units. Missing days are simply absent. */
function seriesFor(a: AstronautData, def: SignalDef): SignalPoint[] {
  const checkinByDay = new Map<number, Checkin>(a.checkins.map((c) => [c.mission_day, c]));
  if (def.source.type === "reading") {
    const { field, skip_rest_days } = def.source;
    const out: SignalPoint[] = [];
    for (const r of inflight(a)) {
      const v = r[field as keyof DailyReading];
      if (typeof v !== "number") continue;
      // A scheduled rest day is not a short session, so it is left out rather than counted as low.
      if (skip_rest_days && checkinByDay.get(r.mission_day)?.answers.q_exercise_feel === null) continue;
      out.push({ day: r.mission_day, value: v * def.scale });
    }
    return out;
  }
  const { question } = def.source;
  const out: SignalPoint[] = [];
  for (const c of [...a.checkins].sort((x, y) => x.mission_day - y.mission_day)) {
    const v = c.answers[question as keyof Checkin["answers"]];
    if (typeof v !== "number") continue;
    out.push({ day: c.mission_day, value: v * def.scale });
  }
  return out;
}

const streamLabel = (id: string) => L2.streams.find((s) => s.id === id)?.label ?? id;
const dirWord = (d: "up" | "down") => (d === "up" ? "upward" : "downward");
const sideWord = (d: "up" | "down") => (d === "up" ? "above" : "below");

/** Evaluate one signal as of a mission day, using only data up to that day. */
function evaluateSignal(def: SignalDef, series: SignalPoint[], asOf: number): SignalResult {
  const from = asOf - METHOD.window_days + 1;
  // Days before the own-reference period starts are the first days of
  // adaptation after launch. They are left out of every window.
  const windowPts = series.filter((p) => p.day >= Math.max(from, REF_FROM) && p.day <= asOf);
  // Own early-flight days that fall before the window, so the two never overlap.
  const refPts = series.filter((p) => p.day >= REF_FROM && p.day <= REF_TO && p.day < from);
  const win = windowPts.map((p) => p.value);
  const ref = refPts.map((p) => p.value);

  const driftEvaluated = win.length >= METHOD.min_points_in_window;
  let driftDir: Direction = "none";
  let slope: number | null = null;
  let trendLine: SignalResult["trendLine"] = null;
  if (driftEvaluated) {
    const mk = mannKendall(win);
    if (mk.p < METHOD.alpha && mk.s !== 0) driftDir = mk.s > 0 ? "up" : "down";
    const ts = theilSen(windowPts);
    if (ts) {
      slope = ts.slope;
      const a0 = windowPts[0].day;
      const a1 = windowPts[windowPts.length - 1].day;
      trendLine = {
        from: { day: a0, value: ts.intercept + ts.slope * a0 },
        to: { day: a1, value: ts.intercept + ts.slope * a1 },
      };
    }
  }

  const shiftEvaluated = driftEvaluated && ref.length >= METHOD.min_points_in_reference;
  let shiftDir: Direction = "none";
  if (shiftEvaluated) {
    const rs = rankSum(ref, win);
    if (rs.p < METHOD.alpha && rs.z !== 0) shiftDir = rs.z > 0 ? "up" : "down";
  }

  const driftBad = driftDir === def.unfavourable;
  const shiftBad = shiftDir === def.unfavourable;
  const departing = driftBad || shiftBad;

  // Answers are ordinal, so they are described by side rather than by level.
  const isAnswer = def.source.type === "checkin";
  const driftText = isAnswer
    ? `Answers have moved consistently toward the less favourable end over the last ${METHOD.window_days} days`
    : `Consistent ${dirWord(def.unfavourable)} direction over the last ${METHOD.window_days} days`;
  const shiftText = isAnswer
    ? "answers sit on the less favourable side of your own early-flight days"
    : `the level sits ${sideWord(def.unfavourable)} your own early-flight days`;

  let summary: string;
  if (!driftEvaluated) {
    summary = `Not enough days to evaluate (${win.length} of the last ${METHOD.window_days}).`;
  } else if (driftBad && shiftBad) {
    summary = `${driftText}, and ${shiftText}.`;
  } else if (driftBad) {
    summary = `${driftText}.`;
  } else if (shiftBad) {
    summary = `No further direction within the last ${METHOD.window_days} days, but ${shiftText}.`;
  } else if (driftDir !== "none" || shiftDir !== "none") {
    summary = `Moving in the favourable direction over the last ${METHOD.window_days} days. Not counted.`;
  } else {
    summary = `No consistent direction over the last ${METHOD.window_days} days.`;
  }

  return {
    id: def.id,
    label: def.label,
    stream: def.stream,
    streamLabel: streamLabel(def.stream),
    measurementType: def.measurement_type,
    unit: def.unit,
    decimals: def.decimals,
    unfavourable: def.unfavourable,
    compositeNote: def.composite_note ?? null,
    points: series.filter((p) => p.day > asOf - 30 && p.day <= asOf),
    window: { from, to: asOf, n: win.length, median: median(win) },
    reference: { from: REF_FROM, to: Math.min(REF_TO, from - 1), n: ref.length, median: median(ref) },
    drift: { evaluated: driftEvaluated, direction: driftDir, unfavourable: driftBad, slopePerDay: slope },
    shift: { evaluated: shiftEvaluated, direction: shiftDir, unfavourable: shiftBad },
    trendLine,
    departing,
    summary,
  };
}

/* ---------------------------------------------------------------- Layer 2 */

interface Layer2Snapshot {
  signals: SignalResult[];
  streams: StreamResult[];
  patterns: Omit<PatternResult, "observedSinceDay">[];
  level: Exclude<StatusLevel, "act">;
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function layer2At(seriesById: Map<string, SignalPoint[]>, asOf: number): Layer2Snapshot {
  const signals = SIGNALS.map((def) => evaluateSignal(def, seriesById.get(def.id) ?? [], asOf));
  const streams: StreamResult[] = L2.streams.map((s) => {
    const own = signals.filter((x) => x.stream === s.id);
    return { id: s.id, label: s.label, departing: own.some((x) => x.departing), signals: own };
  });
  const stream = (id: string) => streams.find((s) => s.id === id)!;

  const patterns = PATTERNS.map((def) => {
    const anchor = stream(def.anchor_stream);
    const companions = def.companion_streams.map(stream);
    const departingCompanions = companions.filter((c) => c.departing);
    // A combination: the anchor stream AND at least one related stream, together.
    const present = anchor.departing && departingCompanions.length > 0;
    const names = departingCompanions.map((c) => c.label.toLowerCase());
    return {
      id: def.id,
      title: def.title,
      rule: def.rule,
      present,
      anchor,
      companions,
      departingStreams: present ? [anchor, ...departingCompanions] : [],
      statement: present ? def.statement.replace("{companions}", joinWords(names)) : "",
      checkinBranch: def.checkin_branch,
    };
  });

  const anyPattern = patterns.some((p) => p.present);
  const anyDeparting = signals.some((s) => s.departing);
  return { signals, streams, patterns, level: anyPattern ? "investigate" : anyDeparting ? "monitor" : "normal" };
}

/* ---------------------------------------------------------------- Layer 1 */

const fmt1 = (n: number) => n.toFixed(1);

function evaluateLayer1(a: AstronautData): Layer1Result[] {
  const day = currentDay(a);
  const latest = a.readings[a.readings.length - 1];
  const checkin = getLatestCheckin(a);
  const earlier = [...a.checkins]
    .filter((c) => c !== checkin)
    .sort((x, y) => y.mission_day - x.mission_day);
  // Only a questionnaire completed on the current mission day counts as "now".
  const phq9Today = [...a.questionnaires]
    .filter((q) => q.instrument === "PHQ-9" && q.mission_day === day)
    .sort((x, y) => (x.completed_at < y.completed_at ? 1 : -1))[0];

  return CRITERIA.map((def) => {
    const domain = DOMAINS.find((d) => d.id === def.domain)!;
    const sources = def.source_ids.map(sourceRef);
    let met = false;
    let valueAtEvaluation = "Not evaluated";
    let previouslyReportedDay: number | null = null;

    if (def.kind === "measured" && def.measured) {
      // Absolute value against the published number. No baseline is involved.
      if (def.measured.field === "resting_hr_bpm") {
        met = latest.resting_hr_bpm > (def.measured.value ?? Infinity);
        valueAtEvaluation = `${fmt1(latest.resting_hr_bpm)} bpm on Mission Day ${latest.mission_day}`;
      } else {
        met =
          latest.bp_systolic_mmhg > (def.measured.systolic_above ?? Infinity) ||
          latest.bp_diastolic_mmhg > (def.measured.diastolic_above ?? Infinity);
        valueAtEvaluation = `${Math.round(latest.bp_systolic_mmhg)}/${Math.round(latest.bp_diastolic_mmhg)} mmHg on Mission Day ${latest.mission_day}`;
      }
    } else {
      const item = def.screen_item!;
      const reportedIn = (c: Checkin) =>
        c.red_flag_screen[item] === true ||
        (def.also_checkin_answer !== undefined &&
          c.answers[def.also_checkin_answer.question as keyof Checkin["answers"]] === def.also_checkin_answer.value);

      const viaCheckin = checkin ? reportedIn(checkin) : false;
      const qi = def.also_questionnaire_item;
      const viaQuestionnaire =
        !!qi && !!phq9Today && (phq9Today.item_scores[qi.item_index] ?? 0) >= qi.min_score;
      met = viaCheckin || viaQuestionnaire;

      if (viaCheckin && viaQuestionnaire) {
        valueAtEvaluation = `Reported in the Mission Day ${checkin!.mission_day} check-in and on PHQ-9 item 9`;
      } else if (viaQuestionnaire) {
        valueAtEvaluation = `PHQ-9 item 9 answered above "Not at all" on Mission Day ${phq9Today!.mission_day}`;
      } else if (viaCheckin) {
        valueAtEvaluation = `Reported in the Mission Day ${checkin!.mission_day} check-in`;
      } else if (checkin) {
        valueAtEvaluation = `Not reported in the Mission Day ${checkin.mission_day} check-in`;
      } else {
        valueAtEvaluation = "No check-in recorded";
      }
      previouslyReportedDay = earlier.find(reportedIn)?.mission_day ?? null;
    }

    return {
      id: def.id,
      domain: def.domain,
      domainTitle: domain.title,
      kind: def.kind,
      title: def.title,
      description: def.description,
      met,
      valueAtEvaluation,
      previouslyReportedDay,
      evidence: def.evidence,
      sources,
      sourceNote: def.source_note,
      basisLabel: `${LAYER1_LABEL} — ${sources.map((s) => s.short).join("; ")}`,
      action: domain.action,
      spaceflightCaveat: def.spaceflight_caveat ?? null,
      requiresClinicalReview: def.requires_clinical_review ?? false,
    };
  });
}

/* ------------------------------------------------------------------ alert */

function buildAlert(
  layer1Met: Layer1Result[],
  patternsPresent: PatternResult[],
  loneSignals: SignalResult[],
  layer2Level: Exclude<StatusLevel, "act">
): CurrentAlert {
  if (layer1Met.length) {
    const domains = Array.from(new Set(layer1Met.map((c) => c.domain)));
    const action = domains.map((d) => DOMAINS.find((x) => x.id === d)!.action).join(" ");
    return {
      layer: 1,
      level: "act",
      headline: layer1Met.length === 1 ? "A published red-flag criterion is met" : "Published red-flag criteria are met",
      statement: joinWords(layer1Met.map((c) => c.title)) + ".",
      basisLabel: `${LAYER1_LABEL} — ${Array.from(new Set(layer1Met.flatMap((c) => c.sources.map((s) => s.short)))).join("; ")}`,
      layerName: "Layer 1 · Published emergency red flags",
      meaning: LAYER1_MEANING,
      action,
      layer2SuppressedNote:
        layer2Level === "normal"
          ? "Your personal-baseline readings show no unusual direction. That is not reassurance: a published red flag takes priority over every baseline comparison."
          : "Layer 2 pattern observations are still listed below for context. They are not used to reassure and they do not change this alert.",
    };
  }
  if (patternsPresent.length) {
    return {
      layer: 2,
      level: "investigate",
      headline:
        patternsPresent.length === 1 ? "A combination pattern is observed" : `${patternsPresent.length} combination patterns are observed`,
      statement:
        patternsPresent.length === 1
          ? patternsPresent[0].statement
          : `Related signals are moving together in ${patternsPresent.length} groups: ${patternsPresent
              .map(
                (p) =>
                  `${p.anchor.label.toLowerCase()} with ${joinWords(
                    p.departingStreams.slice(1).map((s) => s.label.toLowerCase())
                  )}`
              )
              .join("; ")}. Together they may be consistent with a change from your own usual pattern.`,
      basisLabel: LAYER2_LABEL,
      layerName: "Layer 2 · Pattern observation",
      meaning: LAYER2_MEANING,
      action:
        "Worth raising with your flight surgeon at your next private medical conference. No published emergency criterion is met at the latest values; if any safety-check symptom appears, that takes priority.",
      layer2SuppressedNote: null,
    };
  }
  if (loneSignals.length) {
    return {
      layer: 2,
      level: "monitor",
      headline: loneSignals.length === 1 ? "One signal is departing on its own" : `${loneSignals.length} signals are departing, with no combination`,
      statement: `${joinWords(loneSignals.map((s) => s.label))} ${loneSignals.length === 1 ? "shows" : "show"} a consistent unfavourable direction, but no related signal is moving with ${loneSignals.length === 1 ? "it" : "them"}.`,
      basisLabel: LAYER2_LABEL,
      layerName: "Layer 2 · Pattern observation",
      meaning: `${LAYER2_MEANING} ${METHOD.chance_note}`,
      action: "Keep watching. Nothing to act on from this alone; report any new symptom.",
      layer2SuppressedNote: null,
    };
  }
  return {
    layer: null,
    level: "normal",
    headline: "No alert",
    statement:
      "No published red-flag criterion is met, and the experimental rule sees no consistent unfavourable direction in your signals.",
    basisLabel: "Both layers evaluated",
    layerName: "Layer 1 and Layer 2",
    meaning: "This is not a statement that you are well. The platform sees only a few signals. Report any new symptom, whatever this page shows.",
    action: "Nothing to act on. Complete the daily check-in so both layers stay current.",
    layer2SuppressedNote: null,
  };
}

/* --------------------------------------------------------------- evaluate */

const MATRIX_DAYS = 21;
const HISTORY_DAYS = 21;
const CACHE = new WeakMap<AstronautData, DetectionResult>();

/**
 * Evaluate both layers for one astronaut. Layer 1 first, always.
 * Results are cached per data object (the store creates a new object whenever
 * the session adds something, so the cache can never go stale).
 */
export function evaluateDetection(a: AstronautData): DetectionResult {
  const hit = CACHE.get(a);
  if (hit) return hit;

  const day = currentDay(a);

  // ---- Layer 1: published red flags. Evaluated first; nothing below can change it.
  const layer1 = evaluateLayer1(a);
  const layer1Met = layer1.filter((c) => c.met);

  // ---- Layer 2: experimental detection rule.
  const seriesById = new Map(SIGNALS.map((def) => [def.id, seriesFor(a, def)]));
  const now = layer2At(seriesById, day);

  // How the picture built up: the same rule, replayed on each earlier day.
  // The first day on which a full window lies after the launch-adaptation days.
  const firstDay = Math.max(REF_FROM + METHOD.window_days - 1, day - HISTORY_DAYS + 1);
  const history: HistoryDay[] = [];
  for (let d = firstDay; d <= day; d++) {
    const snap = d === day ? now : layer2At(seriesById, d);
    history.push({
      day: d,
      level: snap.level,
      departingSignalIds: snap.signals.filter((s) => s.departing).map((s) => s.id),
      patternIds: snap.patterns.filter((p) => p.present).map((p) => p.id),
    });
  }

  const patterns: PatternResult[] = now.patterns.map((p) => {
    let since: number | null = null;
    if (p.present) {
      for (let i = history.length - 1; i >= 0 && history[i].patternIds.includes(p.id); i--) since = history[i].day;
    }
    return { ...p, observedSinceDay: since };
  });
  const patternsPresent = patterns.filter((p) => p.present);
  const inPattern = new Set(patternsPresent.flatMap((p) => p.departingStreams.flatMap((s) => s.signals.map((x) => x.id))));
  const loneSignals = now.signals.filter((s) => s.departing && !inPattern.has(s.id));

  // Day-by-day view for the combination chart: which side of the astronaut's
  // own early-flight median each day sits on. Direction only, no magnitude.
  const days = Array.from({ length: MATRIX_DAYS }, (_, i) => day - MATRIX_DAYS + 1 + i).filter((d) => d >= 1);
  const matrix = {
    days,
    rows: now.signals
      .filter((s) => !s.compositeNote)
      .map((signal) => {
        const full = seriesById.get(signal.id) ?? [];
        const refMedian = median(full.filter((p) => p.day >= REF_FROM && p.day <= REF_TO).map((p) => p.value));
        return {
          signal,
          cells: days.map((d) => {
            const pt = full.find((p) => p.day === d);
            if (!pt || refMedian === null) return { day: d, state: "missing" as const, display: "no value" };
            const bad = signal.unfavourable === "up" ? pt.value > refMedian : pt.value < refMedian;
            return {
              day: d,
              state: bad ? ("unfavourable" as const) : ("usual" as const),
              display: `${pt.value.toFixed(signal.decimals)} ${signal.unit}`,
            };
          }),
        };
      }),
  };

  // ---- Overall status. Layer 1 wins outright.
  const status: StatusLevel = layer1Met.length ? "act" : now.level;

  const result: DetectionResult = {
    day,
    latestCheckinDay: getLatestCheckin(a)?.mission_day ?? null,
    layer1,
    layer1Met,
    signals: now.signals,
    streams: now.streams,
    patterns,
    patternsPresent,
    loneSignals,
    layer2Level: now.level,
    status,
    alert: buildAlert(layer1Met, patternsPresent, loneSignals, now.level),
    history,
    matrix,
  };
  CACHE.set(a, result);
  return result;
}

/** Stable ids for the alert detail route. */
export function alertIds(): string[] {
  return ["current", ...CRITERIA.map((c) => c.id), ...PATTERNS.map((p) => p.id)];
}
