/**
 * BAYOU-NOVA Phase 5: Intelligent Daily Questions (logic only, no React).
 * ----------------------------------------------------------------------------
 * The six primary questions are indirect and behaviour-framed. Symptom-style
 * questions appear only as follow-ups, when an answer sits below the
 * astronaut's own usual pattern, and in the safety check that closes every
 * check-in. The safety check feeds Layer 1 directly.
 *
 * "Own usual pattern" is the median of the astronaut's own early-flight
 * check-in answers (Mission Day 5 to 19). It is a personal reference, not a
 * clinical threshold.
 */

import questionBank from "../data/shared/checkin-questions.json";
import displayRules from "../data/shared/display-rules.json";
import { median, type DetectionResult } from "./detection";
import type { AstronautData, Checkin, CheckinAnswers, CheckinFollowUps } from "./health-data";

export interface QuestionOption {
  value: number;
  label: string;
}
export interface Question {
  id: string;
  domain: string;
  kind: string;
  prompt: string;
  options: QuestionOption[];
  proxy_for?: string;
  rest_day_option?: string;
  red_flag_value?: number;
  red_flag_note?: string;
}

export type CoreQuestionId = Exclude<keyof CheckinAnswers, "q_head_comfort">;
export type FollowUpId = "f_focus" | "q_head_comfort" | "f_motivation" | "f_emotional_state";

export const CORE_QUESTIONS = questionBank.questions as unknown as Question[];
export const FOLLOW_UPS = questionBank.follow_ups as unknown as Question[];
export const SCREEN = questionBank.red_flag_screen;
export const SCREEN_ITEM_IDS: string[] = SCREEN.groups.flatMap((g) => g.items.map((i) => i.id));
export const INSTRUMENT_NOTE = questionBank.instrument_note;

const [REF_FROM, REF_TO] = displayRules.own_reference_window_mission_days;

/* --------------------------------------------------------- derived indices */

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Arithmetic summaries of check-in answers (formulas in checkin-questions.json).
 * Behavioural inferences for charting. Not validated scores; not PHQ-9 or GAD-7.
 */
export function deriveIndices(answers: CheckinAnswers) {
  const concentration = 10 * (1 - 0.5 * ((answers.q_task_effort - 1) / 4 + answers.q_procedure_checks / 3));
  const mood =
    10 * (1 - ((answers.q_waking - 1) / 3 + answers.q_mealtime / 3 + (1 - answers.q_offduty / 3)) / 3);
  const social = (10 * answers.q_offduty) / 3;
  return {
    concentration_index: round1(concentration),
    mood_index: round1(mood),
    social_engagement_index: round1(social),
  };
}

/* ---------------------------------------------------------------- branching */

/** The astronaut's own usual answer: median of their early-flight check-ins. */
export function usualAnswer(a: AstronautData, questionId: CoreQuestionId): number | null {
  const values = a.checkins
    .filter((c) => c.mission_day >= REF_FROM && c.mission_day <= REF_TO)
    .map((c) => c.answers[questionId])
    .filter((v): v is number => typeof v === "number");
  return median(values);
}

export interface BranchDecision {
  id: string;
  title: string;
  followsUpOn: string;
  open: boolean;
  /** Shown to the astronaut: why these extra questions appeared today. */
  reasons: string[];
  triggerRule: string;
  questions: Question[];
}

/**
 * Decide which follow-up branches open for today's answers.
 *   Sleep branch:  waking answer worse than own usual, OR the experimental rule
 *                  already sees the sleep signals departing.
 *                  -> concentration and headache experience.
 *   Social branch: off-duty answer below own usual.
 *                  -> motivation and emotional state.
 */
export function decideBranches(
  a: AstronautData,
  answers: Partial<CheckinAnswers>,
  detection: DetectionResult
): BranchDecision[] {
  return questionBank.branches.map((b) => {
    const qid = b.trigger_question as CoreQuestionId;
    const today = answers[qid];
    const usual = usualAnswer(a, qid);
    const reasons: string[] = [];

    if (typeof today === "number" && usual !== null) {
      const worse = b.worse_when === "higher" ? today > usual : today < usual;
      if (worse) reasons.push(b.reason_answer);
    }
    if (b.reason_signal && detection.streams.find((s) => s.id === b.id)?.departing) {
      reasons.push(b.reason_signal);
    }

    return {
      id: b.id,
      title: b.title,
      followsUpOn: b.follows_up_on,
      open: reasons.length > 0,
      reasons,
      triggerRule: b.trigger_rule,
      questions: b.questions.map((id) => FOLLOW_UPS.find((f) => f.id === id)!),
    };
  });
}

/* ------------------------------------------------------------- build / read */

export type CoreAnswers = { [K in CoreQuestionId]: CheckinAnswers[K] };

export function emptyScreen(): Record<string, boolean> {
  return Object.fromEntries(SCREEN_ITEM_IDS.map((id) => [id, false]));
}

/** Assemble a completed check-in in the same shape as the seeded history. */
export function buildCheckin(input: {
  missionDay: number;
  core: CoreAnswers;
  followUps: Partial<Record<FollowUpId, number>>;
  branchesOpened: string[];
  screen: Record<string, boolean>;
  freeText: string;
  completedAt: string;
}): Checkin {
  const { q_head_comfort, ...rest } = input.followUps;
  const follow_ups: CheckinFollowUps = rest;
  return {
    mission_day: input.missionDay,
    answers: {
      ...input.core,
      // Headache is a follow-up: null means "not asked today", never "none".
      q_head_comfort: typeof q_head_comfort === "number" ? q_head_comfort : null,
    },
    red_flag_screen: { ...emptyScreen(), ...input.screen },
    free_text: input.freeText.trim() ? input.freeText.trim() : null,
    follow_ups,
    branches_opened: input.branchesOpened,
    source: "session",
    completed_at: input.completedAt,
  };
}

/** Safety-check items selected in a check-in, with their prompts. */
export function reportedScreenItems(c: Checkin): { id: string; prompt: string; criterion: string }[] {
  return SCREEN.groups
    .flatMap((g) => g.items)
    .filter((i) => c.red_flag_screen[i.id] === true)
    .map((i) => ({ id: i.id, prompt: i.prompt, criterion: i.criterion }));
}

export function findQuestion(id: string): Question | undefined {
  return CORE_QUESTIONS.find((q) => q.id === id) ?? FOLLOW_UPS.find((q) => q.id === id);
}
