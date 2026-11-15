/**
 * BAYOU-NOVA data loader
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. All astronaut values loaded here are fictional
 * and procedurally generated. Not real crew data. Not for clinical use.
 *
 * Uses static JSON imports (requires "resolveJsonModule": true in tsconfig,
 * which is the Next.js default) so the files are bundled by Next.js and work
 * on Vercel with no filesystem access at runtime.
 *
 * Usage (server or client component):
 *   import { loadAstronaut, ASTRONAUT_IDS } from "@/lib/health-data";
 *   const a = loadAstronaut("B-209");
 *
 * Layer 1 and Layer 2 results are NOT stored in the data. They are computed
 * from these readings and check-ins by lib/detection.ts.
 */

import a104Profile from "../data/a-104/profile.json";
import a104Readings from "../data/a-104/readings.json";
import a104Checkins from "../data/a-104/checkins.json";
import a104Status from "../data/a-104/status.json";
import b209Profile from "../data/b-209/profile.json";
import b209Readings from "../data/b-209/readings.json";
import b209Checkins from "../data/b-209/checkins.json";
import b209Status from "../data/b-209/status.json";
import questionBank from "../data/shared/checkin-questions.json";
import fieldDefs from "../data/shared/field-definitions.json";
import sourcesFile from "../data/shared/sources.json";
import detectionRules from "../data/shared/detection-rules.json";
import questionnaires from "../data/shared/questionnaires.json";
import detectionContext from "../data/shared/detection-context.json";

export const SIMULATION_LABEL = "SIMULATED DEMONSTRATION DATA";
export const ASTRONAUT_IDS = ["A-104", "B-209"] as const;
export type AstronautId = (typeof ASTRONAUT_IDS)[number];

/** The four measurement-honesty labels. Every displayed metric must carry one. */
export type MeasurementType =
  | "direct measurement"
  | "functional indicator"
  | "self-reported"
  | "behavioural inference";

export interface DailyReading {
  mission_day: number; // negative = preflight; there is no day 0
  phase: "preflight" | "inflight";
  resting_hr_bpm: number;
  bp_systolic_mmhg: number;
  bp_diastolic_mmhg: number;
  sleep_duration_min: number;
  sleep_efficiency_pct: number;
  steps: number | null; // preflight only
  exercise_minutes: number | null; // in flight only
  concentration_index: number; // 0-10, behavioural inference
  mood_index: number; // 0-10, behavioural inference (NOT PHQ-9)
  social_engagement_index: number; // 0-10, behavioural inference
  score_source: "preflight_diary" | "routine_log_early_flight" | "checkin_derived";
}

export interface CheckinAnswers {
  q_task_effort: number;
  q_procedure_checks: number;
  q_mealtime: number;
  q_offduty: number;
  q_waking: number;
  q_exercise_feel: number | null; // null on rest days
  /** 3 = severe/sudden -> Layer 1. null = not asked (live check-in, sleep branch did not open). */
  q_head_comfort: number | null;
}

/** Answers to follow-up questions. Present only when a branch opened. */
export interface CheckinFollowUps {
  f_focus?: number;
  f_motivation?: number;
  f_emotional_state?: number;
}

export interface Checkin {
  mission_day: number;
  answers: CheckinAnswers;
  red_flag_screen: Record<string, boolean>;
  free_text: string | null;
  /** Set on check-ins completed during the demo session. */
  follow_ups?: CheckinFollowUps;
  branches_opened?: string[];
  source?: "seeded" | "session";
  completed_at?: string;
}

export type InstrumentId = "PHQ-9" | "GAD-7";

/** One completed PHQ-9 or GAD-7. Never scheduled by the platform. */
export interface QuestionnaireResult {
  id: string;
  instrument: InstrumentId;
  mission_day: number;
  item_scores: number[];
  total: number;
  difficulty: string | null;
  initiated_by: "self" | "flight_surgeon_request";
  completed_at: string;
}

/** One run of the structured cognitive observation. Not a validated assessment. */
export interface CognitiveResult {
  id: string;
  mission_day: number;
  completed_at: string;
  attention: {
    targets: number;
    hits: number;
    misses: number;
    false_alarms: number;
    median_response_ms: number | null;
  };
  memory: {
    shown: number;
    correct: number;
    wrong_picks: number;
  };
}

export interface PeriodicAssessment {
  mission_day: number;
  vo2max_ml_kg_min: number;
  measurement_type: string;
}

// The JSON files are the source of truth for shape; these aliases keep the
// loader loosely typed for the parts the UI reads by key (profile, status).
export type Profile = typeof a104Profile;
export type Status = typeof a104Status;

export interface AstronautData {
  id: AstronautId;
  label: typeof SIMULATION_LABEL;
  profile: Profile;
  readings: DailyReading[];
  periodicAssessments: PeriodicAssessment[];
  checkins: Checkin[];
  status: Status;
  /** Things added during the demo session (browser only). Empty for the seeded files. */
  questionnaires: QuestionnaireResult[];
  cognitive: CognitiveResult[];
  /** True when a check-in completed in this session replaced a seeded one. */
  hasSessionCheckin: boolean;
}

const RAW = {
  "A-104": {
    profile: a104Profile,
    readings: a104Readings,
    checkins: a104Checkins,
    status: a104Status,
  },
  "B-209": {
    profile: b209Profile,
    readings: b209Readings,
    checkins: b209Checkins,
    status: b209Status,
  },
} as const;

export function isAstronautId(id: string | null | undefined): id is AstronautId {
  return !!id && (ASTRONAUT_IDS as readonly string[]).includes(id);
}

// One object per astronaut, so derived views can be cached by identity.
const CACHE = new Map<AstronautId, AstronautData>();

/** Load the seeded data for one demo astronaut (no session additions). */
export function loadAstronaut(id: AstronautId): AstronautData {
  const hit = CACHE.get(id);
  if (hit) return hit;
  const raw = RAW[id];
  const data: AstronautData = {
    id,
    label: SIMULATION_LABEL,
    profile: raw.profile as unknown as Profile,
    readings: raw.readings.daily_readings as unknown as DailyReading[],
    periodicAssessments: raw.readings.periodic_assessments as PeriodicAssessment[],
    checkins: raw.checkins.checkins as unknown as Checkin[],
    status: raw.status as unknown as Status,
    questionnaires: [],
    cognitive: [],
    hasSessionCheckin: false,
  };
  CACHE.set(id, data);
  return data;
}

export function loadAllAstronauts(): AstronautData[] {
  return ASTRONAUT_IDS.map(loadAstronaut);
}

/** Shared reference data: question bank, field definitions, sources, rules. */
export function loadReference() {
  return { questionBank, fieldDefs, sourcesFile, detectionRules, questionnaires, detectionContext };
}

// ---- Convenience helpers ---------------------------------------------------

/** Readings in an inclusive mission-day range (default: all). */
export function getReadings(
  a: AstronautData,
  opts: { fromDay?: number; toDay?: number; phase?: "preflight" | "inflight" } = {}
): DailyReading[] {
  const { fromDay = -Infinity, toDay = Infinity, phase } = opts;
  return a.readings.filter(
    (r) =>
      r.mission_day >= fromDay &&
      r.mission_day <= toDay &&
      (phase ? r.phase === phase : true)
  );
}

export function getLatestReading(a: AstronautData): DailyReading {
  return a.readings[a.readings.length - 1];
}

export function getCheckin(a: AstronautData, day: number): Checkin | undefined {
  return a.checkins.find((c) => c.mission_day === day);
}

/** The most recent check-in, or undefined when there is none. */
export function getLatestCheckin(a: AstronautData): Checkin | undefined {
  return a.checkins.reduce<Checkin | undefined>(
    (best, c) => (!best || c.mission_day > best.mission_day ? c : best),
    undefined
  );
}

/** Resolve a stored answer value to its human-readable option label. */
export function answerLabel(questionId: string, value: number | null): string {
  if (value === null) {
    if (questionId === "q_exercise_feel") return "Rest day, no session";
    return "Not asked";
  }
  const q =
    questionBank.questions.find((x) => x.id === questionId) ??
    questionBank.follow_ups.find((x) => x.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? String(value);
}

/**
 * Personal-baseline reference lines for Recharts <ReferenceLine y={...} />.
 * Values are the preflight baselines from the profile.
 */
export function getBaselineLines(a: AstronautData) {
  const b = a.profile.preflight_baseline;
  return {
    resting_hr_bpm: b.resting_hr_bpm.value,
    bp_systolic_mmhg: b.blood_pressure.systolic_mmhg,
    bp_diastolic_mmhg: b.blood_pressure.diastolic_mmhg,
    sleep_duration_min: b.sleep_duration.value_min,
    steps: b.activity.steps_per_day,
    vo2max_ml_kg_min: b.vo2max_ml_kg_min.value,
  };
}

/** Format minutes as "7h 36m". */
export function formatSleep(min: number): string {
  return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;
}
