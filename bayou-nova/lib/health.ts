/**
 * BAYOU-NOVA: derived views for the Personal Health Profile and the Health
 * Monitoring Dashboard (Phase 4), with status now supplied by the Phase 5
 * detection engine.
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. Pure functions, no React, no network, no
 * database. Everything is computed from the JSON via lib/health-data.ts.
 *
 * Two-layer rule (never relaxed here):
 *   Layer 1  Published red-flag criteria, evaluated by lib/detection.ts on
 *            absolute values and reported symptoms. If any is met the status
 *            is "act" and nothing from Layer 2 is used to reassure.
 *   Layer 2  Experimental detection rule (direction over a defined number of
 *            days + combination of related signals). No magnitude cut-off.
 *
 * The 7-day mean and own early-flight mean shown beside each value are
 * descriptive only. They are not compared with any threshold.
 */

import displayRules from "../data/shared/display-rules.json";
import {
  DETECTION_METHOD,
  evaluateDetection,
  sourceRef,
  type Layer1Result,
  type SignalResult,
  type StatusLevel,
} from "./detection";
import {
  answerLabel,
  type AstronautData,
  type DailyReading,
  type MeasurementType,
} from "./health-data";
import { reportedScreenItems } from "./checkin";

export type { StatusLevel } from "./detection";

/** "7h 36m", or "44m" when under an hour (used for values and signed deltas). */
const formatSleep = (min: number): string =>
  min < 60 ? `${Math.round(min)}m` : `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;

/* ------------------------------------------------------------------ types */

export const STATUS_LEVELS: StatusLevel[] = ["normal", "monitor", "investigate", "act"];

export const STATUS_META: Record<StatusLevel, { label: string; meaning: string }> = {
  normal: {
    label: "Normal",
    meaning:
      "No published red-flag criterion met, and no consistent unfavourable direction in your own signals (experimental rule). Not a statement that you are well.",
  },
  monitor: {
    label: "Monitor",
    meaning:
      "Experimental detection rule: one signal shows a consistent unfavourable direction over the last 14 days, with no related signal moving with it.",
  },
  investigate: {
    label: "Investigate",
    meaning:
      "Experimental detection rule: related signals are moving in an unfavourable direction together. Not a validated clinical detection method, not a diagnosis.",
  },
  act: {
    label: "Act",
    meaning:
      "A published red-flag criterion is met. This overrides every personal-baseline comparison.",
  },
};

export const MEASUREMENT_LABEL: Record<MeasurementType, string> = {
  "direct measurement": "Direct Measurement",
  "functional indicator": "Functional Indicator",
  "self-reported": "Self-Reported",
  "behavioural inference": "Behavioural Inference",
};

export type MetricKey = "heart_rate" | "blood_pressure" | "sleep" | "activity" | "mood";
export const METRIC_KEYS: MetricKey[] = ["heart_rate", "blood_pressure", "sleep", "activity", "mood"];

/** Which Layer 2 signals belong to each dashboard metric. */
export const METRIC_SIGNALS: Record<MetricKey, string[]> = {
  heart_rate: ["resting_hr"],
  blood_pressure: ["bp_systolic", "bp_diastolic"],
  sleep: ["sleep_duration", "sleep_efficiency", "waking_feel"],
  activity: ["exercise_minutes", "exercise_feel"],
  mood: ["mood_index"],
};

type NumField =
  | "resting_hr_bpm"
  | "bp_systolic_mmhg"
  | "bp_diastolic_mmhg"
  | "sleep_duration_min"
  | "sleep_efficiency_pct"
  | "steps"
  | "exercise_minutes"
  | "concentration_index"
  | "mood_index"
  | "social_engagement_index";

/** A Layer 1 criterion as evaluated by the detection engine. */
export type Layer1Criterion = Layer1Result;

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}
export interface ChartBaseline {
  seriesKey: string;
  value: number;
  label: string;
}
export interface ChartSpec {
  unit: string;
  series: ChartSeries[];
  data: Array<Record<string, number>>; // always has "day"
  baselines: ChartBaseline[];
  yDecimals: number;
}

export interface MetricRow {
  key: MetricKey;
  label: string;
  measurementType: MeasurementType;
  currentDisplay: string;
  trailingDisplay: string;
  baselineDisplay: string;
  baselineNote: string;
  deltaDisplay: string;
  referenceDisplay: string;
  status: StatusLevel;
  statusReason: string;
  /** null when no published red-flag criterion exists for this metric. */
  layer1: Layer1Criterion | null;
  layer2: { departs: boolean; suppressedByLayer1: boolean; patternTitle: string | null };
  chart: ChartSpec;
}

export interface TimelineEvent {
  id: string;
  title: string;
  detail: string;
  measurementType: MeasurementType | null;
  tone: "neutral" | "note" | "pattern" | "act";
}
export interface TimelineDay {
  day: number;
  events: TimelineEvent[];
}

/* ---------------------------------------------------------------- helpers */

const R = displayRules;
const [REF_FROM, REF_TO] = R.own_reference_window_mission_days;

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
};
const nums = (rs: DailyReading[], f: NumField): number[] =>
  rs.map((r) => r[f]).filter((x): x is number => typeof x === "number");

const inflight = (a: AstronautData) => a.readings.filter((r) => r.phase === "inflight");
const preflight = (a: AstronautData) => a.readings.filter((r) => r.phase === "preflight");

export function currentMissionDay(a: AstronautData): number {
  return a.readings[a.readings.length - 1].mission_day;
}

const trailing = (a: AstronautData) => {
  const cur = currentMissionDay(a);
  return inflight(a).filter(
    (r) => r.mission_day > cur - R.trailing_window_days && r.mission_day <= cur
  );
};
const referenceWindow = (a: AstronautData) =>
  inflight(a).filter((r) => r.mission_day >= REF_FROM && r.mission_day <= REF_TO);

const sign = (n: number, d = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(d)}`;

export const toneClass = (s: StatusLevel) =>
  ({
    normal: { text: "text-safe", bg: "bg-safe/15", border: "border-safe/50", hex: "#2E9E5B" },
    monitor: { text: "text-warning", bg: "bg-warning/15", border: "border-warning/60", hex: "#E0A010" },
    investigate: { text: "text-caution", bg: "bg-caution/15", border: "border-caution/60", hex: "#E2680F" },
    act: { text: "text-danger", bg: "bg-danger/20", border: "border-danger/70", hex: "#C8321F" },
  })[s];

/* --------------------------------------------------------------- Layer 1 */

/** Every published red-flag criterion, evaluated live. Layer 1 never reads a baseline. */
export function layer1Criteria(a: AstronautData): Layer1Criterion[] {
  return evaluateDetection(a).layer1;
}

/* ------------------------------------------------------ descriptive means */

/**
 * Descriptive comparison of the 7-day mean with the astronaut's own
 * early-flight mean. Shown for context. It decides nothing.
 */
export function departure(a: AstronautData, field: NumField) {
  const ref = nums(referenceWindow(a), field);
  const now = nums(trailing(a), field);
  if (ref.length < 2 || now.length === 0) return null;
  const refMean = mean(ref);
  const trailingMean = mean(now);
  return { refMean, trailingMean, diff: trailingMean - refMean };
}

/* ------------------------------------------------------------ metric rows */

const VIOLET_LINE = "#4B2A73";
const VIOLET_LINE_2 = "#8A5CB0";

function chartDays(a: AstronautData) {
  const cur = currentMissionDay(a);
  return inflight(a).filter((r) => r.mission_day > cur - R.trend_days);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function buildMetricRows(a: AstronautData): MetricRow[] {
  const b = a.profile.preflight_baseline;
  const det = evaluateDetection(a);
  const l1 = det.layer1;
  const hrL1 = l1.find((c) => c.id === "L1_resting_tachycardia") ?? null;
  const bpL1 = l1.find((c) => c.id === "L1_severe_hypertension") ?? null;
  const latest = a.readings[a.readings.length - 1];
  const win = chartDays(a);
  const pre = preflight(a);
  const days = DETECTION_METHOD.window_days;

  /**
   * Status for one metric.
   *   Layer 1 criterion met            -> act (and Layer 2 is not used to reassure)
   *   signal departing inside a pattern -> investigate
   *   signal departing on its own       -> monitor
   *   otherwise                         -> normal
   */
  const decide = (
    key: MetricKey,
    l1c: Layer1Criterion | null
  ): { status: StatusLevel; reason: string; suppressed: boolean; departs: boolean; patternTitle: string | null } => {
    const sigs = det.signals.filter((s) => METRIC_SIGNALS[key].includes(s.id));
    const departing = sigs.filter((s) => s.departing);
    const pattern =
      det.patternsPresent.find((p) => p.departingStreams.some((st) => departing.some((s) => s.stream === st.id))) ?? null;
    const describe = (list: SignalResult[]) => list.map((s) => `${s.label}: ${lowerFirst(s.summary)}`).join(" ");

    if (l1c?.met) {
      return {
        status: "act",
        reason: `Published criterion met: ${l1c.description}. Personal-baseline comparison is not used to reassure.`,
        suppressed: true,
        departs: departing.length > 0,
        patternTitle: pattern?.title ?? null,
      };
    }
    if (departing.length && pattern) {
      return {
        status: "investigate",
        reason: `Part of the combination pattern “${pattern.title}”. ${describe(departing)} May be consistent with a change from your own usual pattern; not a diagnosis.`,
        suppressed: false,
        departs: true,
        patternTitle: pattern.title,
      };
    }
    if (departing.length) {
      return {
        status: "monitor",
        reason: `${describe(departing)} No related signal is moving with it, so it is watched rather than alerted.`,
        suppressed: false,
        departs: true,
        patternTitle: null,
      };
    }
    return {
      status: "normal",
      reason: `No consistent unfavourable direction over the last ${days} days (${sigs.map((s) => s.label.toLowerCase()).join(", ")}).`,
      suppressed: false,
      departs: false,
      patternTitle: null,
    };
  };

  /* Heart rate */
  const hrDep = departure(a, "resting_hr_bpm")!;
  const hrDec = decide("heart_rate", hrL1);
  const hr: MetricRow = {
    key: "heart_rate",
    label: "Heart Rate",
    measurementType: "direct measurement",
    currentDisplay: `${latest.resting_hr_bpm.toFixed(1)} bpm`,
    trailingDisplay: `7-day mean ${hrDep.trailingMean.toFixed(1)} bpm`,
    baselineDisplay: `${b.resting_hr_bpm.value} bpm`,
    baselineNote: `Preflight mean, ${pre.length} readings`,
    deltaDisplay: `${sign(hrDep.trailingMean - b.resting_hr_bpm.value)} bpm vs baseline`,
    referenceDisplay: `Own early-flight mean ${hrDep.refMean.toFixed(1)} bpm (MD ${REF_FROM}–${REF_TO}); 7-day mean is ${sign(hrDep.diff)} bpm from it`,
    status: hrDec.status,
    statusReason: hrDec.reason,
    layer1: hrL1,
    layer2: { departs: hrDec.departs, suppressedByLayer1: hrDec.suppressed, patternTitle: hrDec.patternTitle },
    chart: {
      unit: "bpm",
      yDecimals: 0,
      series: [{ key: "hr", name: "Resting HR", color: VIOLET_LINE }],
      data: win.map((r) => ({ day: r.mission_day, hr: r.resting_hr_bpm })),
      baselines: [{ seriesKey: "hr", value: b.resting_hr_bpm.value, label: `Baseline ${b.resting_hr_bpm.value}` }],
    },
  };

  /* Blood pressure */
  const sysDep = departure(a, "bp_systolic_mmhg")!;
  const diaDep = departure(a, "bp_diastolic_mmhg")!;
  const bpDec = decide("blood_pressure", bpL1);
  const bp: MetricRow = {
    key: "blood_pressure",
    label: "Blood Pressure",
    measurementType: "direct measurement",
    currentDisplay: `${Math.round(latest.bp_systolic_mmhg)}/${Math.round(latest.bp_diastolic_mmhg)} mmHg`,
    trailingDisplay: `7-day mean ${Math.round(sysDep.trailingMean)}/${Math.round(diaDep.trailingMean)} mmHg`,
    baselineDisplay: `${b.blood_pressure.systolic_mmhg}/${b.blood_pressure.diastolic_mmhg} mmHg`,
    baselineNote: `Preflight mean, ${pre.length} readings`,
    deltaDisplay: `${sign(sysDep.trailingMean - b.blood_pressure.systolic_mmhg, 0)}/${sign(diaDep.trailingMean - b.blood_pressure.diastolic_mmhg, 0)} mmHg vs baseline`,
    referenceDisplay: `Own early-flight mean ${Math.round(sysDep.refMean)}/${Math.round(diaDep.refMean)} mmHg (MD ${REF_FROM}–${REF_TO})`,
    status: bpDec.status,
    statusReason: bpDec.reason,
    layer1: bpL1,
    layer2: { departs: bpDec.departs, suppressedByLayer1: bpDec.suppressed, patternTitle: bpDec.patternTitle },
    chart: {
      unit: "mmHg",
      yDecimals: 0,
      series: [
        { key: "sys", name: "Systolic", color: VIOLET_LINE },
        { key: "dia", name: "Diastolic", color: VIOLET_LINE_2 },
      ],
      data: win.map((r) => ({ day: r.mission_day, sys: r.bp_systolic_mmhg, dia: r.bp_diastolic_mmhg })),
      baselines: [
        { seriesKey: "sys", value: b.blood_pressure.systolic_mmhg, label: `Sys baseline ${b.blood_pressure.systolic_mmhg}` },
        { seriesKey: "dia", value: b.blood_pressure.diastolic_mmhg, label: `Dia baseline ${b.blood_pressure.diastolic_mmhg}` },
      ],
    },
  };

  /* Sleep */
  const slDep = departure(a, "sleep_duration_min")!;
  const slDec = decide("sleep", null);
  const sleepDelta = slDep.trailingMean - b.sleep_duration.value_min;
  const sleep: MetricRow = {
    key: "sleep",
    label: "Sleep",
    measurementType: "functional indicator",
    currentDisplay: formatSleep(Math.round(latest.sleep_duration_min)),
    trailingDisplay: `7-day mean ${formatSleep(Math.round(slDep.trailingMean))}`,
    baselineDisplay: b.sleep_duration.display,
    baselineNote: `Preflight mean, ${pre.length} readings`,
    deltaDisplay: `${sleepDelta >= 0 ? "+" : "−"}${formatSleep(Math.abs(Math.round(sleepDelta)))} vs baseline`,
    referenceDisplay: `Own early-flight mean ${formatSleep(Math.round(slDep.refMean))} (MD ${REF_FROM}–${REF_TO})`,
    status: slDec.status,
    statusReason: slDec.reason,
    layer1: null,
    layer2: { departs: slDec.departs, suppressedByLayer1: false, patternTitle: slDec.patternTitle },
    chart: {
      unit: "h",
      yDecimals: 1,
      series: [{ key: "sleep", name: "Sleep duration", color: VIOLET_LINE }],
      data: win.map((r) => ({ day: r.mission_day, sleep: +(r.sleep_duration_min / 60).toFixed(2) })),
      baselines: [{ seriesKey: "sleep", value: +(b.sleep_duration.value_min / 60).toFixed(2), label: `Baseline ${b.sleep_duration.display}` }],
    },
  };

  /* Activity: steps are not meaningful in microgravity, so the in-flight
     reference is the astronaut's own early-flight exercise minutes. */
  const acDep = departure(a, "exercise_minutes")!;
  const acDec = decide("activity", null);
  const activity: MetricRow = {
    key: "activity",
    label: "Activity",
    measurementType: "functional indicator",
    currentDisplay: `${latest.exercise_minutes ?? 0} min exercise`,
    trailingDisplay: `7-day mean ${Math.round(acDep.trailingMean)} min`,
    baselineDisplay: `${Math.round(acDep.refMean)} min`,
    baselineNote: `Own early-flight mean (MD ${REF_FROM}–${REF_TO}). Preflight ${b.activity.steps_per_day.toLocaleString()} steps/day is not comparable in microgravity.`,
    deltaDisplay: `${sign(acDep.trailingMean - acDep.refMean, 0)} min vs baseline`,
    referenceDisplay: "Same as baseline (no preflight equivalent). Means include rest days; the detection rule leaves rest days out.",
    status: acDec.status,
    statusReason: acDec.reason,
    layer1: null,
    layer2: { departs: acDec.departs, suppressedByLayer1: false, patternTitle: acDec.patternTitle },
    chart: {
      unit: "min",
      yDecimals: 0,
      series: [{ key: "ex", name: "Exercise minutes", color: VIOLET_LINE }],
      data: win.map((r) => ({ day: r.mission_day, ex: r.exercise_minutes ?? 0 })),
      baselines: [{ seriesKey: "ex", value: +acDep.refMean.toFixed(1), label: `Own reference ${Math.round(acDep.refMean)}` }],
    },
  };

  /* Mood (check-in derived index, not PHQ-9) */
  const moDep = departure(a, "mood_index")!;
  const moodBaseline = mean(nums(pre, "mood_index"));
  const moDec = decide("mood", null);
  const mood: MetricRow = {
    key: "mood",
    label: "Mood",
    measurementType: "behavioural inference",
    currentDisplay: `${latest.mood_index.toFixed(1)} / 10`,
    trailingDisplay: `7-day mean ${moDep.trailingMean.toFixed(1)} / 10`,
    baselineDisplay: `${moodBaseline.toFixed(1)} / 10`,
    baselineNote: `Preflight diary mean, ${pre.length} days`,
    deltaDisplay: `${sign(moDep.trailingMean - moodBaseline, 1)} vs baseline`,
    referenceDisplay: `Own early-flight mean ${moDep.refMean.toFixed(1)} (MD ${REF_FROM}–${REF_TO}). This index is not PHQ-9.`,
    status: moDec.status,
    statusReason: moDec.reason,
    layer1: null,
    layer2: { departs: moDec.departs, suppressedByLayer1: false, patternTitle: moDec.patternTitle },
    chart: {
      unit: "/10",
      yDecimals: 1,
      series: [{ key: "mood", name: "Mood index", color: VIOLET_LINE }],
      data: win.map((r) => ({ day: r.mission_day, mood: r.mood_index })),
      baselines: [{ seriesKey: "mood", value: +moodBaseline.toFixed(2), label: `Baseline ${moodBaseline.toFixed(1)}` }],
    },
  };

  const rows = [hr, bp, sleep, activity, mood];

  // Layer 1 is global. If ANY published criterion is met (including the
  // symptom criteria that are not a table row), no row may carry reassuring
  // personal-baseline wording.
  if (det.layer1Met.length) {
    for (const r of rows) {
      if (!r.layer2.suppressedByLayer1) {
        r.layer2 = { ...r.layer2, suppressedByLayer1: true };
        r.statusReason = "A published red-flag criterion is met (see the red banner). This personal-baseline comparison is not a reassurance.";
      }
    }
  }
  return rows;
}

/* --------------------------------------------------------- overall status */

/** Overall status comes straight from the detection engine. Layer 1 always wins. */
export function overallStatus(a: AstronautData, rows?: MetricRow[]): StatusLevel {
  void rows;
  return evaluateDetection(a).status;
}

export function statusCounts(rows: MetricRow[]): Record<StatusLevel, number> {
  const c: Record<StatusLevel, number> = { normal: 0, monitor: 0, investigate: 0, act: 0 };
  rows.forEach((r) => (c[r.status] += 1));
  return c;
}

/* --------------------------------------------------------------- timeline */

export function buildTimeline(a: AstronautData): TimelineDay[] {
  const cur = currentMissionDay(a);
  const baseSleep = a.profile.preflight_baseline.sleep_duration.value_min;
  const det = evaluateDetection(a);
  const days: TimelineDay[] = [];

  for (let d = cur; d > cur - R.timeline_days; d--) {
    const reading = a.readings.find((r) => r.mission_day === d);
    const checkin = a.checkins.find((c) => c.mission_day === d);
    const ev: TimelineEvent[] = [];

    if (d === cur) {
      const anyMet = det.layer1Met.length > 0;
      ev.push({
        id: `${d}-l1`,
        title: anyMet ? "Layer 1: published red-flag criteria met" : "Layer 1: no published red-flag criteria met",
        detail: anyMet
          ? det.layer1Met.map((c) => c.description).join("; ")
          : "This is not a statement that you are well. Report any new symptoms.",
        measurementType: null,
        tone: anyMet ? "act" : "neutral",
      });
      const patterns = det.patternsPresent;
      ev.push({
        id: `${d}-l2`,
        title: patterns.length
          ? "Layer 2: experimental pattern observation present"
          : det.loneSignals.length
            ? "Layer 2: signals departing, no combination pattern"
            : "Layer 2: experimental pattern observation not present",
        detail: patterns.length
          ? `${patterns.map((p) => p.title).join("; ")}. Experimental detection rule, not a validated clinical detection method, not a diagnosis.`
          : det.loneSignals.length
            ? `${det.loneSignals.map((s) => s.label).join(", ")}. Experimental detection rule; one signal alone is watched, not alerted.`
            : "No consistent unfavourable direction in any signal. Experimental, not a validated rule.",
        measurementType: null,
        tone: patterns.length ? "pattern" : "neutral",
      });
    }

    if (checkin) {
      const flagged = reportedScreenItems(checkin).map((i) => i.prompt);
      ev.push({
        id: `${d}-checkin`,
        title: checkin.source === "session" ? "Daily check-in completed (this demo session)" : "Daily check-in completed",
        detail: flagged.length
          ? `Safety check items reported: ${flagged.join("; ")}.`
          : "Safety check: no items reported.",
        measurementType: "self-reported",
        tone: flagged.length ? "act" : "neutral",
      });
      const head = checkin.answers.q_head_comfort;
      if (head !== null && head > 0) {
        ev.push({
          id: `${d}-head`,
          title: "Head comfort reported",
          detail: answerLabel("q_head_comfort", head),
          measurementType: "self-reported",
          tone: head >= 3 ? "act" : "note",
        });
      }
      if (checkin.free_text) {
        ev.push({
          id: `${d}-note`,
          title: "Check-in note",
          detail: `“${checkin.free_text}”`,
          measurementType: "self-reported",
          tone: "note",
        });
      }
    } else {
      ev.push({
        id: `${d}-nocheckin`,
        title: "No check-in recorded",
        detail: "Absence of a check-in is not itself a finding.",
        measurementType: null,
        tone: "neutral",
      });
    }

    for (const q of a.questionnaires.filter((x) => x.mission_day === d)) {
      ev.push({
        id: `${d}-${q.id}`,
        title: `${q.instrument} completed (started by you, not scheduled)`,
        detail: `Total ${q.total}. Interpretation in spaceflight context should follow your flight surgeon's guidance.`,
        measurementType: "self-reported",
        tone: "note",
      });
    }

    if (reading) {
      const diff = reading.sleep_duration_min - baseSleep;
      ev.push({
        id: `${d}-sleep`,
        title: `Sleep ${formatSleep(Math.round(reading.sleep_duration_min))}`,
        detail: `${diff >= 0 ? "+" : "−"}${formatSleep(Math.abs(Math.round(diff)))} vs preflight baseline. Efficiency ${reading.sleep_efficiency_pct.toFixed(0)}%.`,
        measurementType: "functional indicator",
        tone: "neutral",
      });
      ev.push({
        id: `${d}-hr`,
        title: `Resting heart rate ${reading.resting_hr_bpm.toFixed(1)} bpm`,
        detail: `Blood pressure ${Math.round(reading.bp_systolic_mmhg)}/${Math.round(reading.bp_diastolic_mmhg)} mmHg.`,
        measurementType: "direct measurement",
        tone: "neutral",
      });
      if (reading.exercise_minutes !== null) {
        ev.push({
          id: `${d}-ex`,
          title: `Exercise logged ${reading.exercise_minutes} min`,
          detail: "Resistance / aerobic session time from the in-flight log.",
          measurementType: "functional indicator",
          tone: "neutral",
        });
      }
    }
    days.push({ day: d, events: ev });
  }
  return days;
}

/* ---------------------------------------------------------------- profile */

export function buildProfileView(a: AstronautData) {
  const p = a.profile;
  const b = p.preflight_baseline;
  const pre = preflight(a);
  const statsFor = (f: NumField) => {
    const v = nums(pre, f);
    return { mean: mean(v), sd: sd(v), min: Math.min(...v), max: Math.max(...v), n: v.length };
  };
  const vo2 = a.periodicAssessments;
  const preVo2 = vo2.find((x) => x.mission_day < 0);
  const flightVo2 = vo2.filter((x) => x.mission_day > 0);

  const sparkline = (f: NumField, scale = 1) => pre.map((r) => ({ day: r.mission_day, v: +(((r[f] as number) ?? 0) * scale).toFixed(2) }));

  const established =
    pre.length > 0 &&
    [b.resting_hr_bpm.value, b.blood_pressure.systolic_mmhg, b.blood_pressure.diastolic_mmhg, b.sleep_duration.value_min, b.activity.steps_per_day, b.vo2max_ml_kg_min.value].every(
      (x) => typeof x === "number"
    );

  return {
    identity: {
      id: p.astronaut_id,
      role: p.role,
      mission: p.mission,
      missionDay: currentMissionDay(a),
      ageRange: p.demographics.age_range,
      heightCm: p.demographics.height_cm,
      weightKg: p.demographics.preflight_weight_kg,
      scenario: p.scenario_description,
    },
    baselineStatus: {
      established,
      readings: pre.length,
      firstDay: pre[0]?.mission_day,
      lastDay: pre[pre.length - 1]?.mission_day,
      basis: b.basis,
      vo2Day: preVo2?.mission_day,
    },
    baselineMetrics: [
      { key: "hr", label: "Resting heart rate", value: `${b.resting_hr_bpm.value} bpm`, spread: `±${statsFor("resting_hr_bpm").sd.toFixed(1)} day-to-day`, type: b.resting_hr_bpm.measurement_type },
      { key: "bp", label: "Blood pressure", value: `${b.blood_pressure.systolic_mmhg}/${b.blood_pressure.diastolic_mmhg} mmHg`, spread: `±${statsFor("bp_systolic_mmhg").sd.toFixed(1)} / ±${statsFor("bp_diastolic_mmhg").sd.toFixed(1)} day-to-day`, type: b.blood_pressure.measurement_type },
      { key: "sleep", label: "Sleep duration", value: b.sleep_duration.display, spread: `±${Math.round(statsFor("sleep_duration_min").sd)} min day-to-day`, type: b.sleep_duration.measurement_type },
      { key: "steps", label: "Daily steps", value: `${b.activity.steps_per_day.toLocaleString()} steps/day`, spread: `±${Math.round(statsFor("steps").sd).toLocaleString()} day-to-day`, type: b.activity.measurement_type },
      { key: "vo2", label: "VO₂ max", value: `${b.vo2max_ml_kg_min.value} ml/kg/min`, spread: "Single preflight lab test", type: b.vo2max_ml_kg_min.measurement_type },
    ],
    medicalHistory: {
      conditions: p.medical_history.conditions as string[],
      medications: p.medical_history.medications as string[],
      allergies: p.medical_history.allergies as string[],
      note: p.medical_history.note,
    },
    sparklines: [
      { key: "hr", label: "Resting heart rate", unit: "bpm", decimals: 0, baseline: b.resting_hr_bpm.value, data: sparkline("resting_hr_bpm"), type: "direct measurement" as MeasurementType, stats: statsFor("resting_hr_bpm") },
      { key: "sleep", label: "Sleep duration", unit: "h", decimals: 1, baseline: +(b.sleep_duration.value_min / 60).toFixed(2), data: sparkline("sleep_duration_min", 1 / 60), type: "functional indicator" as MeasurementType, stats: { ...statsFor("sleep_duration_min"), mean: statsFor("sleep_duration_min").mean / 60, sd: statsFor("sleep_duration_min").sd / 60, min: statsFor("sleep_duration_min").min / 60, max: statsFor("sleep_duration_min").max / 60 } },
      { key: "steps", label: "Activity (steps)", unit: "steps", decimals: 0, baseline: b.activity.steps_per_day, data: sparkline("steps"), type: "functional indicator" as MeasurementType, stats: statsFor("steps") },
    ],
    sleepFitness: {
      sleepDisplay: b.sleep_duration.display,
      sleepEfficiency: statsFor("sleep_efficiency_pct").mean,
      steps: b.activity.steps_per_day,
      vo2Preflight: b.vo2max_ml_kg_min.value,
      vo2Flight: flightVo2.map((x) => ({ day: x.mission_day, value: x.vo2max_ml_kg_min, type: x.measurement_type })),
      preflightExerciseNote: "Exercise minutes are not recorded preflight; in flight they replace steps.",
    },
  };
}

/* -------------------------------------------------- profile evolution panel */

export interface EvolutionItem {
  text: string;
  tag: "Published" | "Experimental" | "Context";
  measurementType?: MeasurementType;
}

export function buildEvolution(a: AstronautData, rows: MetricRow[]) {
  const ctx = a.status.expected_adaptation_context;
  const b = a.profile.preflight_baseline;
  const cur = currentMissionDay(a);
  const det = evaluateDetection(a);
  const srcLabel = (id: string) => {
    const s = sourceRef(id);
    return `${s.short}${s.verified ? "" : " (citation unverified)"}`;
  };

  const hrDep = departure(a, "resting_hr_bpm")!;
  const sysDep = departure(a, "bp_systolic_mmhg")!;
  const diaDep = departure(a, "bp_diastolic_mmhg")!;
  const slDep = departure(a, "sleep_duration_min")!;

  const expected: EvolutionItem[] = [
    {
      text: `Resting heart rate (7-day mean) is ${sign(hrDep.trailingMean - b.resting_hr_bpm.value)} bpm from your preflight baseline.`,
      tag: "Context",
      measurementType: "direct measurement",
    },
    {
      text: `Blood pressure (7-day mean) is ${sign(sysDep.trailingMean - b.blood_pressure.systolic_mmhg, 0)}/${sign(diaDep.trailingMean - b.blood_pressure.diastolic_mmhg, 0)} mmHg from your preflight baseline.`,
      tag: "Context",
      measurementType: "direct measurement",
    },
    {
      text: `Sleep (7-day mean) is ${slDep.trailingMean - b.sleep_duration.value_min >= 0 ? "+" : "−"}${formatSleep(Math.abs(Math.round(slDep.trailingMean - b.sleep_duration.value_min)))} from your preflight baseline.`,
      tag: "Context",
      measurementType: "functional indicator",
    },
  ];

  const variation: EvolutionItem[] = [];
  rows
    .filter((r) => r.status === "normal")
    .forEach((r) =>
      variation.push({ text: `${r.label}: ${r.statusReason}`, tag: "Experimental", measurementType: r.measurementType })
    );
  const social = det.signals.find((s) => s.id === "social_engagement");
  if (social && !social.departing)
    variation.push({
      text: `Voluntary social engagement: ${social.summary}`,
      tag: "Experimental",
      measurementType: "behavioural inference",
    });

  const concerning: EvolutionItem[] = [];
  det.layer1Met.forEach((c) =>
    concerning.push({
      text: `Published red-flag criterion met: ${c.description}. ${c.valueAtEvaluation}.`,
      tag: "Published",
    })
  );
  det.patternsPresent.forEach((p) =>
    concerning.push({
      text: `${p.title}: ${p.statement}${p.observedSinceDay ? ` Observed since Mission Day ${p.observedSinceDay}.` : ""} Experimental detection rule; not a diagnosis.`,
      tag: "Experimental",
    })
  );
  det.loneSignals.forEach((s) =>
    concerning.push({
      text: `${s.label}: ${s.summary} No related signal is moving with it.`,
      tag: "Experimental",
      measurementType: s.measurementType,
    })
  );

  return {
    phaseLabel: `In flight · Mission Day ${cur}`,
    expected: {
      summary: ctx.summary,
      basis: ctx.basis,
      sources: ["barger2014_sleep", "hughson2012_cv"].map(srcLabel),
      items: expected,
    },
    variation: {
      summary:
        "Signals with no consistent direction. Individual expected ranges are not established, so these are descriptive.",
      items: variation,
    },
    concerning: {
      summary: concerning.length
        ? "Items below are either published red-flag criteria (Layer 1) or experimental pattern observations (Layer 2). Neither is a diagnosis."
        : "No published red-flag criterion is met and no experimental pattern observation is present. This is not a statement that you are well.",
      items: concerning,
      none: concerning.length === 0,
    },
  };
}
