/**
 * Logic checks for BAYOU-NOVA (run with `npm run test:logic`).
 * No test framework: each check throws on failure.
 *
 * The checks that matter most prove the two-layer rule:
 *   - a published red flag raises "act" even when every baseline looks normal
 *   - Layer 2 can never raise "act" and never reassures over Layer 1
 *   - Layer 2 uses direction and combination only, with no magnitude cut-off
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadAstronaut,
  loadReference,
  type AstronautData,
  type Checkin,
  type QuestionnaireResult,
} from "../lib/health-data";
import {
  buildEvolution,
  buildMetricRows,
  buildProfileView,
  buildTimeline,
  layer1Criteria,
  overallStatus,
  statusCounts,
} from "../lib/health";
import {
  evaluateDetection,
  LAYER1_LABEL,
  LAYER2_LABEL,
  mannKendall,
  rankSum,
} from "../lib/detection";
import {
  buildCheckin,
  decideBranches,
  deriveIndices,
  emptyScreen,
  SCREEN,
  SCREEN_ITEM_IDS,
  usualAnswer,
  type CoreAnswers,
} from "../lib/checkin";
import { applySession, emptyOverlay } from "../lib/session";
import {
  demoConversation,
  emptyState,
  MODERATE_LINE,
  PROTOCOL_LABEL_PREFIX,
  respond,
  responseText,
  runConversation,
  SCREENED_CRITERIA,
  screenRedFlags,
  SERIOUS_LINE,
  UNCERTAIN_LINE,
  type AssistantResponse,
  type Turn,
} from "../lib/assistant";
import { allClaims, allLearnSourceIds, currentPhase, getHazard, HAZARD_IDS, HAZARDS } from "../lib/learn";
import {
  allCrewStrings,
  buildFactors,
  buildInsight,
  buildSignals,
  findPrivacyViolations,
  OPT_IN_DEFAULT,
  PRIVACY_NOTE,
} from "../lib/crew";
import { alertRunStart, buildActionPlan, planStrings } from "../lib/actions";
import sourcesFile from "../data/shared/sources.json";

let n = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log("ok -", name);
};

const A = loadAstronaut("A-104");
const B = loadAstronaut("B-209");
const DAY = 34;

/** Deep copy so a test can edit readings without touching the seeded object. */
const clone = (a: AstronautData): AstronautData => structuredClone(a);

const steadyCore: CoreAnswers = {
  q_task_effort: 3,
  q_procedure_checks: 0,
  q_mealtime: 1,
  q_offduty: 2,
  q_waking: 2,
  q_exercise_feel: 2,
};

/** A check-in completed in the demo session, optionally with safety-check items selected. */
function sessionCheckin(opts: { screen?: string[]; head?: number; core?: Partial<CoreAnswers> } = {}): Checkin {
  return buildCheckin({
    missionDay: DAY,
    core: { ...steadyCore, ...opts.core },
    followUps: opts.head === undefined ? {} : { q_head_comfort: opts.head },
    branchesOpened: [],
    screen: Object.fromEntries((opts.screen ?? []).map((id) => [id, true])),
    freeText: "",
    completedAt: "2026-11-14T00:00:00.000Z",
  });
}
const withCheckin = (a: AstronautData, c: Checkin) => applySession(a, { ...emptyOverlay(), checkins: [c] });

const phq9 = (scores: number[]): QuestionnaireResult => ({
  id: "q1",
  instrument: "PHQ-9",
  mission_day: DAY,
  item_scores: scores,
  total: scores.reduce((s, x) => s + x, 0),
  difficulty: null,
  initiated_by: "self",
  completed_at: "2026-11-14T00:00:00.000Z",
});

/* ------------------------------------------------------- seeded scenarios */

ok("A-104 seeded: every metric Normal, overall Normal, no Layer 1 criterion met, no signal departing", () => {
  const rows = buildMetricRows(A);
  const det = evaluateDetection(A);
  assert.ok(rows.every((r) => r.status === "normal"));
  assert.equal(overallStatus(A, rows), "normal");
  assert.ok(layer1Criteria(A).every((c) => !c.met));
  assert.equal(det.signals.filter((s) => s.departing).length, 0);
  assert.equal(det.alert.layer, null);
  assert.match(det.alert.meaning, /not a statement that you are well/i);
});

ok("A-104 seeded: the experimental rule never flagged anything on any replayed day", () => {
  assert.ok(evaluateDetection(A).history.every((h) => h.level === "normal"));
});

ok("B-209 seeded: Layer 2 Investigate (three combination patterns), no Layer 1, never Act", () => {
  const rows = buildMetricRows(B);
  const det = evaluateDetection(B);
  const s = Object.fromEntries(rows.map((r) => [r.key, r.status]));
  assert.equal(s.sleep, "investigate");
  assert.equal(s.heart_rate, "investigate");
  assert.equal(s.activity, "investigate");
  assert.equal(s.blood_pressure, "monitor");
  assert.equal(s.mood, "monitor");
  assert.equal(overallStatus(B, rows), "investigate");
  assert.ok(!rows.some((r) => r.status === "act"));
  assert.equal(det.layer1Met.length, 0);
  assert.deepEqual(
    det.patternsPresent.map((p) => p.id).sort(),
    ["L2_heart_rate_exercise", "L2_sleep_headache_concentration", "L2_social_appetite_exercise"]
  );
  assert.equal(det.alert.layer, 2);
  assert.equal(det.alert.basisLabel, LAYER2_LABEL);
});

ok("B-209 seeded: drift builds up gradually (Normal, then Monitor, then Investigate)", () => {
  const h = evaluateDetection(B).history;
  const first = (lvl: string) => h.find((x) => x.level === lvl)?.day ?? Infinity;
  assert.ok(first("monitor") < first("investigate"), "a single signal is seen before any combination");
  assert.equal(h[h.length - 1].level, "investigate");
  const sleep = evaluateDetection(B).patterns.find((p) => p.id === "L2_sleep_headache_concentration")!;
  assert.ok(sleep.observedSinceDay !== null && sleep.observedSinceDay < DAY);
});

/* ------------------------------------------------- Layer 1 always overrides */

ok("Layer 1 measured: resting HR above 100 on a stable astronaut -> Act, Layer 2 not used to reassure", () => {
  const m = clone(A);
  m.readings[m.readings.length - 1].resting_hr_bpm = 104;
  const rows = buildMetricRows(m);
  const hr = rows.find((r) => r.key === "heart_rate")!;
  assert.equal(hr.status, "act");
  assert.equal(hr.layer2.suppressedByLayer1, true);
  assert.match(hr.statusReason, /not used to reassure/);
  assert.equal(overallStatus(m, rows), "act");
  assert.equal(statusCounts(rows).act, 1);
  // exactly at the published number is not above it
  const at = clone(A);
  at.readings[at.readings.length - 1].resting_hr_bpm = 100;
  assert.equal(evaluateDetection(at).layer1Met.length, 0);
});

ok("Layer 1 measured: BP above 180 or above 120 -> Act, even though the baseline comparison sees nothing", () => {
  const m = clone(A);
  m.readings[m.readings.length - 1].bp_systolic_mmhg = 186;
  const bp = buildMetricRows(m).find((r) => r.key === "blood_pressure")!;
  assert.equal(bp.status, "act");
  assert.equal(bp.layer2.departs, false); // one high reading is not a direction: Layer 2 alone would say nothing
  const d = clone(A);
  d.readings[d.readings.length - 1].bp_diastolic_mmhg = 124;
  assert.equal(evaluateDetection(d).status, "act");
});

ok("Layer 1 symptom: chest pain in today's check-in -> Act while EVERY personal-baseline reading is normal", () => {
  const m = withCheckin(A, sessionCheckin({ screen: ["chest_pain_or_pressure"] }));
  const det = evaluateDetection(m);
  const rows = buildMetricRows(m);
  assert.equal(det.layer2Level, "normal"); // baselines look fine
  assert.equal(det.status, "act"); // and it is still red
  assert.equal(det.alert.layer, 1);
  assert.ok(det.alert.basisLabel.startsWith(`${LAYER1_LABEL} — `));
  assert.match(det.alert.layer2SuppressedNote ?? "", /not reassurance/);
  assert.ok(rows.every((r) => r.status === "normal"));
  assert.equal(overallStatus(m, rows), "act");
  // no row may keep reassuring baseline wording
  assert.ok(rows.every((r) => r.layer2.suppressedByLayer1 && !/no consistent|within/i.test(r.statusReason)));
});

ok("Layer 1 symptom: each of the 13 safety-check items alone raises Act in its own domain", () => {
  assert.equal(SCREEN_ITEM_IDS.length, 13);
  for (const group of SCREEN.groups) {
    for (const item of group.items) {
      const det = evaluateDetection(withCheckin(A, sessionCheckin({ screen: [item.id] })));
      assert.equal(det.status, "act", item.id);
      assert.deepEqual(det.layer1Met.map((c) => c.id), [item.criterion], item.id);
      assert.equal(det.layer1Met[0].domain, group.domain, item.id);
    }
  }
});

ok("Layer 1 symptom: headache answer 'Severe or sudden onset' goes to Layer 1, never to baseline comparison", () => {
  const det = evaluateDetection(withCheckin(A, sessionCheckin({ head: 3 })));
  assert.deepEqual(det.layer1Met.map((c) => c.id), ["L1_thunderclap_headache"]);
  assert.equal(evaluateDetection(withCheckin(A, sessionCheckin({ head: 2 }))).layer1Met.length, 0);
});

ok("Layer 1 psychological: PHQ-9 item 9 above 'Not at all' -> Act whatever the total; a high total alone is not a red flag", () => {
  const low = applySession(A, { ...emptyOverlay(), questionnaires: [phq9([0, 0, 0, 0, 0, 0, 0, 0, 1])] });
  assert.deepEqual(evaluateDetection(low).layer1Met.map((c) => c.id), ["L1_self_harm_thoughts"]);
  assert.equal(evaluateDetection(low).layer1Met[0].domain, "psychological");
  const high = applySession(A, { ...emptyOverlay(), questionnaires: [phq9([3, 3, 3, 3, 3, 3, 3, 3, 0])] });
  assert.equal(evaluateDetection(high).layer1Met.length, 0); // the platform invents no score threshold
});

ok("Layer 1 overrides the Layer 2 pattern on B-209: alert is Layer 1, patterns stay listed for context only", () => {
  const m = withCheckin(B, sessionCheckin({ screen: ["sudden_vision_change"], core: { q_offduty: 1, q_waking: 3 } }));
  const det = evaluateDetection(m);
  assert.equal(det.status, "act");
  assert.equal(det.alert.layer, 1);
  assert.ok(det.patternsPresent.length > 0);
  assert.match(det.alert.layer2SuppressedNote ?? "", /not used to reassure/);
});

ok("Every Layer 1 criterion cites at least one source that exists, and is labelled with its basis", () => {
  const { sourcesFile } = loadReference();
  const ids = new Set(sourcesFile.sources.map((s) => s.id));
  const l1 = layer1Criteria(A);
  assert.equal(l1.length, 15);
  for (const c of l1) {
    assert.ok(c.sources.length >= 1, c.id);
    assert.ok(c.sources.every((s) => ids.has(s.id)), c.id);
    assert.ok(c.basisLabel.startsWith("Based on published emergency criteria — "), c.id);
    assert.ok(c.action.length > 0, c.id);
  }
  assert.deepEqual(Array.from(new Set(l1.map((c) => c.domain))).sort(), ["cardiovascular", "neurological", "psychological"]);
});

/* ------------------------------------------- Layer 2: direction, not size */

ok("Layer 2 label is the exact required wording", () => {
  assert.equal(LAYER2_LABEL, "Experimental detection rule — this is not a validated clinical detection method");
});

ok("Layer 2 can never raise Act: every replayed day is Normal, Monitor or Investigate", () => {
  for (const a of [A, B]) {
    const det = evaluateDetection(a);
    assert.ok(det.history.every((h) => ["normal", "monitor", "investigate"].includes(h.level)));
    assert.notEqual(det.layer2Level, "act");
  }
});

ok("Layer 2 has no magnitude cut-off: shrinking B-209's sleep change tenfold changes nothing", () => {
  const m = clone(B);
  const base = m.profile.preflight_baseline.sleep_duration.value_min;
  for (const r of m.readings) r.sleep_duration_min = base + (r.sleep_duration_min - base) / 10;
  const before = evaluateDetection(B).signals.find((s) => s.id === "sleep_duration")!;
  const after = evaluateDetection(m).signals.find((s) => s.id === "sleep_duration")!;
  assert.equal(after.departing, true);
  assert.equal(after.drift.direction, before.drift.direction);
  assert.equal(after.shift.direction, before.shift.direction);
});

ok("Layer 2: one signal drifting alone is Monitor, not an alert pattern", () => {
  const m = clone(A);
  m.readings.filter((r) => r.mission_day >= 21).forEach((r, i) => (r.resting_hr_bpm = 59 + i * 0.3));
  const det = evaluateDetection(m);
  assert.equal(det.signals.find((s) => s.id === "resting_hr")!.departing, true);
  assert.equal(det.patternsPresent.length, 0);
  assert.equal(det.status, "monitor");
  assert.equal(buildMetricRows(m).find((r) => r.key === "heart_rate")!.status, "monitor");
});

ok("Layer 2: the same drift plus a related signal becomes a combination pattern (Investigate)", () => {
  const m = clone(A);
  m.readings.filter((r) => r.mission_day >= 21).forEach((r, i) => {
    r.resting_hr_bpm = 59 + i * 0.3;
    if (r.exercise_minutes !== null && r.exercise_minutes > 60) r.exercise_minutes = 130 - i * 3;
  });
  const det = evaluateDetection(m);
  assert.deepEqual(det.patternsPresent.map((p) => p.id), ["L2_heart_rate_exercise"]);
  assert.equal(det.status, "investigate");
});

ok("Layer 2: a level that changed and then stopped moving stays visible (shift), so a plateau is not reassurance", () => {
  const m = clone(A);
  // sleep drops by a fixed step from Mission Day 21 and then holds flat: no direction inside the window
  m.readings.filter((r) => r.mission_day >= 21).forEach((r) => (r.sleep_duration_min -= 70));
  const s = evaluateDetection(m).signals.find((x) => x.id === "sleep_duration")!;
  assert.equal(s.drift.unfavourable, false);
  assert.equal(s.shift.unfavourable, true);
  assert.equal(s.departing, true);
});

ok("Statistics: Mann-Kendall and rank-sum behave on known inputs", () => {
  const up = Array.from({ length: 14 }, (_, i) => i);
  assert.ok(mannKendall(up).p < 0.001 && mannKendall(up).s > 0);
  assert.equal(mannKendall(Array(14).fill(5)).p, 1);
  const lo = Array.from({ length: 12 }, (_, i) => i);
  const hi = lo.map((x) => x + 100);
  assert.ok(rankSum(lo, hi).z > 0 && rankSum(lo, hi).p < 0.001);
  assert.ok(rankSum(lo, lo).p > 0.9);
});

/* ------------------------------------------------ Intelligent Daily Questions */

ok("Derived indices reproduce the seeded values on every check-in day (formulas match the data)", () => {
  for (const a of [A, B]) {
    for (const c of a.checkins) {
      const r = a.readings.find((x) => x.mission_day === c.mission_day)!;
      const d = deriveIndices(c.answers);
      assert.ok(Math.abs(d.concentration_index - r.concentration_index) <= 0.11, `${a.id} MD${c.mission_day} concentration`);
      assert.ok(Math.abs(d.mood_index - r.mood_index) <= 0.11, `${a.id} MD${c.mission_day} mood`);
      assert.ok(Math.abs(d.social_engagement_index - r.social_engagement_index) <= 0.11, `${a.id} MD${c.mission_day} social`);
    }
  }
});

ok("Branching: sleep answer below own pattern -> concentration and headache follow-ups; otherwise none", () => {
  const det = evaluateDetection(A);
  const usual = usualAnswer(A, "q_waking")!;
  const open = decideBranches(A, { q_waking: usual + 1, q_offduty: 3 }, det).find((b) => b.id === "sleep")!;
  assert.equal(open.open, true);
  assert.deepEqual(open.questions.map((q) => q.id), ["f_focus", "q_head_comfort"]);
  const closed = decideBranches(A, { q_waking: usual, q_offduty: 3 }, det);
  assert.ok(closed.every((b) => !b.open));
});

ok("Branching: social answer below own pattern -> motivation and emotional state follow-ups", () => {
  const det = evaluateDetection(A);
  const usual = usualAnswer(A, "q_offduty")!;
  const b = decideBranches(A, { q_waking: 1, q_offduty: usual - 1 }, det).find((x) => x.id === "social")!;
  assert.equal(b.open, true);
  assert.deepEqual(b.questions.map((q) => q.id), ["f_motivation", "f_emotional_state"]);
});

ok("Branching: B-209's sleep follow-up opens from the drifting sleep signals even when today's answer is usual", () => {
  const usual = usualAnswer(B, "q_waking")!;
  const b = decideBranches(B, { q_waking: usual, q_offduty: 3 }, evaluateDetection(B)).find((x) => x.id === "sleep")!;
  assert.equal(b.open, true);
  assert.match(b.reasons.join(" "), /experimental detection rule/);
});

ok("Primary questions are indirect only; symptom-style questions exist only as follow-ups or in the safety check", () => {
  const { questionBank } = loadReference();
  assert.equal(questionBank.questions.length, 6);
  assert.ok(questionBank.questions.every((q) => q.kind === "indirect"));
  assert.ok(!questionBank.questions.some((q) => /headache|pain|symptom/i.test(q.prompt)));
  assert.ok(questionBank.follow_ups.every((q) => q.kind === "follow_up"));
});

ok("Session merge: a new check-in replaces today's, indices are recomputed, the seeded object is untouched", () => {
  assert.equal(applySession(A, emptyOverlay()), A);
  const m = withCheckin(A, sessionCheckin({ core: { q_offduty: 0, q_waking: 4, q_mealtime: 3 } }));
  assert.equal(m.checkins.filter((c) => c.mission_day === DAY).length, 1);
  assert.equal(m.checkins.find((c) => c.mission_day === DAY)!.source, "session");
  assert.equal(m.readings.find((r) => r.mission_day === DAY)!.social_engagement_index, 0);
  assert.equal(m.readings.find((r) => r.mission_day === DAY)!.mood_index, 0);
  assert.notEqual(A.readings.find((r) => r.mission_day === DAY)!.social_engagement_index, 0);
  assert.equal(m.checkins.find((c) => c.mission_day === DAY)!.answers.q_head_comfort, null); // not asked, not "none"
  assert.deepEqual(Object.keys(emptyScreen()).sort(), [...SCREEN_ITEM_IDS].sort());
});

ok("PHQ-9 and GAD-7: cited, never scheduled, required note present word for word", () => {
  const { questionnaires } = loadReference();
  assert.equal(
    questionnaires.required_note,
    "Administration frequency and interpretation in spaceflight context should follow guidance from your flight surgeon. These instruments are validated for general clinical populations."
  );
  assert.match(questionnaires.scheduling_policy, /NOT auto-scheduled/);
  const [phq, gad] = questionnaires.instruments;
  assert.equal(phq.items.length, 9);
  assert.equal(gad.items.length, 7);
  for (const q of questionnaires.instruments) {
    assert.ok(q.label.startsWith("Validated clinical instrument — "));
    assert.ok(!("schedule" in q) && !("frequency" in q) && !("due" in q));
  }
});

/* -------------------------------------------------------- Medical Assistant */

const say = (text: string): Turn => ({ kind: "text", text });
const ask = (a: AstronautData, text: string): AssistantResponse =>
  respond(say(text), evaluateDetection(a), emptyState()).response;

/** The five symptoms named in the Phase 6 safety rule, in several wordings each. */
const RED_FLAG_PHRASES: Record<string, string[]> = {
  L1_chest_pain: ["I have chest pain", "there is a tightness in my chest", "My chest hurts when I breathe in", "pressure across my chest"],
  L1_thunderclap_headache: ["sudden severe headache", "worst headache of my life", "a headache came on out of nowhere", "I got a severe headache"],
  L1_sudden_vision_change: ["I lost vision in my left eye", "sudden visual loss", "I can't see properly", "I am seeing double"],
  L1_new_confusion: ["I feel confused", "sudden confusion", "I am disoriented", "I don't know where I am"],
  L1_severe_breathlessness: ["I am short of breath", "significant shortness of breath", "I can't breathe", "trouble breathing"],
};

ok("Assistant safety rule: each named red-flag symptom in free text gives the serious protocol on a stable astronaut", () => {
  const det = evaluateDetection(A);
  assert.equal(det.status, "normal"); // every baseline comparison is normal
  for (const [criterion, phrases] of Object.entries(RED_FLAG_PHRASES)) {
    for (const phrase of phrases) {
      const r = ask(A, phrase);
      assert.equal(r.level, "serious", phrase);
      assert.equal(r.tone, "act", phrase);
      assert.ok(r.protocols.some((p) => p.triggers.some((t) => t.id === criterion)), phrase);
      assert.ok(r.mandatory.includes(SERIOUS_LINE), phrase);
      assert.equal(r.blocks.length, 0, phrase); // no baseline, signal or pattern content at all
    }
  }
});

ok("Assistant safety rule: a red flag wins over a Layer 2 pattern mentioned in the same message, and a mention is never negated away", () => {
  const mixed = ask(B, "I have been sleeping badly, getting headaches, and today I had chest pain");
  assert.equal(mixed.level, "serious");
  assert.ok(!responseText(mixed).includes(MODERATE_LINE));
  assert.match(mixed.lead.join(" "), /baseline is not used here/i);
  // No negation handling on purpose: a wrong "not reported" is the failure that matters.
  assert.equal(ask(A, "no chest pain today").level, "serious");
  assert.match(ask(A, "no chest pain today").lead.join(" "), /cannot reliably show whether you are reporting this/i);
});

ok("Assistant safety rule: every symptom criterion in Layer 1 has a keyword rule and a protocol card", () => {
  const det = evaluateDetection(A);
  const symptomCriteria = det.layer1.filter((c) => c.kind === "symptom").map((c) => c.id);
  assert.deepEqual([...SCREENED_CRITERIA].sort(), [...symptomCriteria].sort());
  const { sourcesFile } = loadReference();
  const ids = new Set(sourcesFile.sources.map((x) => x.id));
  for (const item of SCREEN.groups.flatMap((g) => g.items)) {
    const r = respond(say("hello"), evaluateDetection(withCheckin(A, sessionCheckin({ screen: [item.id] }))), emptyState()).response;
    assert.equal(r.level, "serious", item.id);
    const card = r.protocols.find((p) => p.triggers.some((t) => t.id === item.criterion && t.how === "data"));
    assert.ok(card, item.id);
    assert.ok(card!.followsLabel.startsWith(`${PROTOCOL_LABEL_PREFIX}: `), item.id);
    assert.ok(card!.sources.length >= 1 && card!.sources.every((x) => ids.has(x.id) && x.verified), item.id);
    assert.ok(card!.steps.every((st) => st.basis === "platform" || (st.sources ?? []).length >= 1), item.id);
  }
});

ok("Assistant: a measured red flag in the data gives the serious protocol whatever is asked, including the quick actions", () => {
  const hot = clone(A);
  hot.readings[hot.readings.length - 1].resting_hr_bpm = 104;
  const det = evaluateDetection(hot);
  for (const turn of [say("How is my sleep?"), { kind: "action", action: "why" } as Turn, { kind: "action", action: "escalate" } as Turn]) {
    const r = respond(turn, det, emptyState()).response;
    assert.equal(r.level, "serious");
    assert.ok(r.protocols.some((p) => p.id === "P_resting_tachycardia"));
    assert.ok(r.mandatory.includes(SERIOUS_LINE));
  }
  assert.match(respond({ kind: "action", action: "why" }, det, emptyState()).response.lead[0], /does not suggest explanations for a red flag/);
});

ok("Assistant: a red flag stays for the rest of the conversation; later messages and normal data cannot clear it", () => {
  const det = evaluateDetection(A);
  const { messages } = runConversation(
    [say("I have chest pain"), say("it is fine now, how is my sleep?"), { kind: "action", action: "why" }, { kind: "action", action: "escalate" }],
    det
  );
  const replies = messages.filter((m) => m.role === "assistant").map((m) => m.response!);
  assert.equal(replies.length, 4);
  assert.ok(replies.every((r) => r.level === "serious" && r.protocols.some((p) => p.id === "P_cardiac")));
});

ok("Assistant demo: B-209 sleep + headache + concentration is answered at moderate level with the experimental label", () => {
  const demo = demoConversation("B-209")!;
  assert.equal(demoConversation("A-104"), null);
  const { messages } = runConversation(demo.turns, evaluateDetection(B));
  const replies = messages.filter((m) => m.role === "assistant").map((m) => m.response!);
  assert.equal(replies.length, 3);
  assert.deepEqual(replies.map((r) => r.kind), ["answer", "why", "escalate"]);
  for (const r of replies) {
    assert.equal(r.level, "moderate");
    assert.equal(r.basis.label, LAYER2_LABEL);
    assert.ok(r.mandatory.includes(MODERATE_LINE));
    assert.equal(r.protocols.length, 0);
  }
  assert.match(replies[0].headline, /sleep with headache and concentration/);
  assert.ok(replies[0].links.some((l) => l.href === "/alerts/L2_sleep_headache_concentration"));
  assert.match(responseText(replies[0]), /may be consistent with/);
  assert.match(responseText(replies[1]), /SNNOOP10/);
});

ok("Assistant levels: routine on a stable astronaut, uncertain where the platform cannot interpret, never a guess", () => {
  const sleepA = ask(A, "I slept badly last night");
  assert.equal(sleepA.level, "routine");
  assert.equal(sleepA.tone, "normal");
  assert.match(responseText(sleepA), /Worth monitoring over the next 14 days/);
  assert.match(responseText(sleepA), /not a statement that you are well/);
  assert.deepEqual(
    ["signals", "questions", "explanations", "watch", "timeframe"],
    sleepA.blocks.map((b) => b.kind)
  );
  const loneB = ask(B, "feeling low and unmotivated");
  assert.equal(loneB.level, "routine");
  assert.equal(loneB.tone, "monitor");
  for (const text of ["My heart has been racing", "My vision seems blurry lately", "what should I take to sleep", "the weather is nice", "I cut my hand"]) {
    const r = ask(B, text);
    assert.equal(r.level, "uncertain", text);
    assert.ok(r.mandatory.includes(UNCERTAIN_LINE), text);
    assert.equal(r.blocks.length, 0, text);
  }
  // Palpitations alone are not a Layer 1 criterion; with light-headedness they are.
  assert.equal(ask(A, "my heart is racing and I feel dizzy").level, "serious");
});

ok("Assistant language rules hold in every reply: no 'you have', no reassurance, flight surgeon named where required", () => {
  const hot = clone(B);
  hot.readings[hot.readings.length - 1].bp_systolic_mmhg = 190;
  const cases: [AstronautData, Turn[]][] = [
    [B, demoConversation("B-209")!.turns],
    [B, [say("How am I doing?"), { kind: "action", action: "why" }, { kind: "action", action: "escalate" }]],
    [B, [say("I keep to myself and I am not hungry"), say("the schedule changed last week")]],
    [A, [say("hello"), say("How am I doing?"), { kind: "action", action: "why" }, { kind: "action", action: "escalate" }]],
    [A, [say("my blood pressure and heart rate"), say("I exercise less and feel low")]],
    [A, [say("My vision seems blurry lately"), { kind: "action", action: "why" }, { kind: "action", action: "escalate" }]],
    [hot, [say("anything wrong?")]],
    ...Object.values(RED_FLAG_PHRASES).map((p): [AstronautData, Turn[]] => [A, [say(p[0]), { kind: "action", action: "why" }]]),
    ...["I fainted", "my arm is numb", "I lost my balance", "I want to hurt myself", "I am hearing voices", "I can't function", "I want to hurt someone"].map(
      (t): [AstronautData, Turn[]] => [A, [say(t)]]
    ),
  ];
  let seen = 0;
  const levels = new Set<string>();
  for (const [a, turns] of cases) {
    for (const m of runConversation(turns, evaluateDetection(a)).messages) {
      if (!m.response) continue;
      const r = m.response;
      const text = responseText(r);
      seen++;
      levels.add(r.level);
      // "the worst you have had" is the Phase 5 safety-check prompt, quoted word for word.
      assert.doesNotMatch(text, /\byou have\b(?! had\))/i, r.headline);
      assert.doesNotMatch(text, /nothing to worry|no cause for concern|you are fine|you're fine|don't worry|perfectly normal|you are healthy|all clear/i, r.headline);
      if (r.level === "moderate" || r.level === "serious") assert.match(text, /contact your flight surgeon/i, r.headline);
      if (r.level === "moderate") assert.ok(text.includes(MODERATE_LINE), r.headline);
      if (r.level === "serious") assert.ok(text.includes(SERIOUS_LINE) && text.includes(`${PROTOCOL_LABEL_PREFIX}: `), r.headline);
      if (r.level === "uncertain") assert.ok(text.includes(UNCERTAIN_LINE), r.headline);
      if (r.level === "routine") assert.match(text, /flight surgeon/i, r.headline);
      assert.match(r.producedBy, /not (written by an AI model|AI-generated)/i);
    }
  }
  assert.ok(seen >= 30);
  assert.deepEqual(Array.from(levels).sort(), ["info", "moderate", "routine", "serious", "uncertain"]);
});

ok("Assistant keyword screen does not fire on look-alike words", () => {
  for (const text of ["my numbers look odd", "this chart is confusing", "I feel faintly amused", "I keep getting headaches", "blood pressure reading"]) {
    assert.deepEqual(screenRedFlags(text), [], text);
  }
});

/* ------------------------------------------------------- Phase 4 views kept */

ok("Rows carry correct layer labels: HR/BP have a Layer 1 criterion, others do not", () => {
  const rows = buildMetricRows(B);
  const has = Object.fromEntries(rows.map((r) => [r.key, r.layer1 !== null]));
  assert.deepEqual(has, { heart_rate: true, blood_pressure: true, sleep: false, activity: false, mood: false });
  assert.ok(rows.every((r) => r.measurementType));
});

ok("Timeline: 5 days, newest first, latest day carries Layer 1 and Layer 2 entries", () => {
  const t = buildTimeline(B);
  assert.equal(t.length, 5);
  assert.equal(t[0].day, 34);
  assert.equal(t[4].day, 30);
  assert.ok(t[0].events.some((e) => e.title.startsWith("Layer 1")));
  assert.ok(t[0].events.some((e) => e.title.startsWith("Layer 2")));
});

ok("Evolution: A-104 has no concerning items; B-209 has experimental items only", () => {
  const ea = buildEvolution(A, buildMetricRows(A));
  assert.equal(ea.concerning.none, true);
  const eb = buildEvolution(B, buildMetricRows(B));
  assert.ok(eb.concerning.items.length >= 2);
  assert.ok(eb.concerning.items.every((i) => i.tag === "Experimental"));
});

ok("Profile: Baseline Established with 56 readings; charts have 30 points", () => {
  const p = buildProfileView(A);
  assert.equal(p.baselineStatus.established, true);
  assert.equal(p.baselineStatus.readings, 56);
  assert.equal(p.sparklines.length, 3);
  assert.ok(buildMetricRows(A).every((r) => r.chart.data.length === 30));
});

/* ------------------------------------------------------------ Phase 7 */

const KNOWN_SOURCES = new Set((sourcesFile as unknown as { sources: { id: string }[] }).sources.map((x) => x.id));

ok("Learn: 8 hazards, each with all four parts and an open question", () => {
  assert.equal(HAZARDS.length, 8);
  assert.deepEqual([...HAZARD_IDS].sort(), HAZARDS.map((h) => h.id).sort());
  for (const h of HAZARDS) {
    assert.ok(h.whatItIs.length && h.whyItHappens.length && h.whatToWatch.length && h.preventiveActions.length, h.id);
    assert.ok(h.openQuestion.text.length > 20, h.id);
  }
});

ok("Learn: every source id exists, and every sourced claim has a source", () => {
  for (const id of allLearnSourceIds()) assert.ok(KNOWN_SOURCES.has(id), `unknown source id ${id}`);
  for (const c of allClaims()) {
    if (c.sourceCount === 0) {
      // A statement with no source is a platform note. It may not carry a statistic.
      assert.ok(!/%|mSv|mmHg|bpm|per ?cent/i.test(c.text), `unsourced statistic at ${c.where}: ${c.text}`);
    }
  }
  assert.ok(allClaims().filter((c) => c.sourceCount > 0).length > 60);
});

ok("Learn: SANS is presented as under investigation; phase at Mission Day 34 is in-flight", () => {
  assert.equal(getHazard("altered-gravity").research.level !== "established", true);
  assert.ok(HAZARDS.some((h) => h.research.level === "investigating"));
  assert.equal(currentPhase(34), "inflight");
  assert.equal(currentPhase(4), "early");
  assert.equal(currentPhase(0), "preflight");
});

ok("Crew: privacy note is verbatim, nothing shown can identify a person or a crew size", () => {
  assert.equal(
    PRIVACY_NOTE,
    "Privacy note: This demonstration uses a fictional scenario. Genuine anonymity in small crews cannot be guaranteed by software alone and would require a formal privacy impact assessment for real deployment."
  );
  assert.deepEqual(findPrivacyViolations(allCrewStrings()), []);
  assert.deepEqual(findPrivacyViolations(["Three of the crew slept badly"]).length, 1);
  assert.deepEqual(findPrivacyViolations(["B-209 slept badly"]).length, 1);
});

ok("Crew: three factors, indicator levels agree with the readings, opt-in is off by default", () => {
  const factors = buildFactors();
  assert.deepEqual(factors.map((f) => f.id).sort(), ["co2", "light", "temperature"].sort());
  const signals = buildSignals(factors);
  for (const s of signals.filter((x) => x.fromReading)) {
    const f = factors.find((x) => x.id === s.fromReading);
    assert.ok(f, s.id);
    assert.equal(s.level === "steady", f!.state === "within", `${s.id} level vs ${f!.state}`);
  }
  assert.ok(buildInsight(factors, signals).lines.length > 0);
  assert.equal(OPT_IN_DEFAULT, false);
});

ok("Action plan: A-104 has none; B-209 is experimental, plan starts MD22 (first non-normal day), review MD36", () => {
  const pa = buildActionPlan(evaluateDetection(A));
  assert.equal(pa.mode, "none");
  const dB = evaluateDetection(B);
  const pb = buildActionPlan(dB);
  assert.equal(pb.mode, "experimental");
  assert.equal(alertRunStart(dB), 22);
  assert.equal(pb.header.initiatedDay, 22);
  assert.equal(pb.header.patternsSince, 26);
  assert.equal(pb.header.reviewDay, 36);
  assert.equal(pb.header.followUpDay, 13);
  assert.equal(pb.changed.patterns.length, 3);
  assert.ok(pb.suggests.possibilities.length > 0 && pb.suggests.experimentalLabel === LAYER2_LABEL);
  assert.ok(pb.check.groups.length > 0 && pb.doSection.items.length > 0);
  assert.ok(pb.contact.nowGroups.length > 0 && pb.contact.soon.length > 0);
  assert.ok(pb.improvement.looks.length > 0 && pb.improvement.timeframe.length > 0);
  assert.equal(pb.doSection.protocols.length, 0);
});

ok("Action plan wording: no diagnosis language, every sourced item resolves", () => {
  const pb = buildActionPlan(evaluateDetection(B));
  // "You have been reporting..." describes the person's own answers and is fine.
  // What must never appear is a diagnosis: "you have <a condition>".
  const DIAGNOSIS = /\byou (?:have|are suffering from) (?:an? |the )?(?:sans|infection|depression|anxiety|syndrome|disease|disorder|condition|illness|concussion|hypertension)/i;
  for (const t of planStrings(pb)) assert.ok(!DIAGNOSIS.test(t), t);
  for (const g of pb.check.groups) for (const i of g.items) for (const src of i.sources) assert.ok(KNOWN_SOURCES.has(src.id));
  assert.equal(new Set(pb.checkableIds).size, pb.checkableIds.length);
});

ok("Action plan: a red flag gives the red-flag plan, with protocol cards and no Layer 2 content", () => {
  const d = evaluateDetection(withCheckin(B, sessionCheckin({ screen: ["chest_pain_or_pressure"] })));
  const p = buildActionPlan(d);
  assert.equal(p.mode, "redflag");
  assert.ok(p.changed.redFlags.length > 0);
  assert.ok(p.doSection.protocols.length > 0);
  assert.equal(p.changed.patterns.length, 0);
  assert.equal(p.suggests.possibilities.length, 0);
  assert.equal(p.suggests.experimentalLabel, null);
  assert.equal(p.check.groups.length, 0);
  assert.equal(p.improvement.looks.length, 0);
  assert.equal(p.header.followUpDay, null);
  assert.equal(p.doSection.seriousLine, SERIOUS_LINE);
});

/* ------------------------------------------------------------ Phase 8: demo checks */

ok("Demo: both profiles load from JSON with the expected scenario, on Mission Day 34", () => {
  assert.equal(A.profile.astronaut_id, "A-104");
  assert.equal(B.profile.astronaut_id, "B-209");
  for (const a of [A, B]) {
    assert.ok(a.readings.length >= 30, "readings present");
    assert.ok(a.checkins.length >= 7, "check-ins present");
    assert.equal(a.readings[a.readings.length - 1].mission_day, DAY);
  }
});

ok("Demo: A-104 is Normal; B-209 starts at Monitor (amber), reaches Investigate (orange) and never Act without a red flag", () => {
  const dA = evaluateDetection(A);
  const dB = evaluateDetection(B);
  assert.equal(dA.status, "normal");
  assert.equal(dB.layer1Met.length, 0);
  const firstMonitor = dB.history.find((h) => h.level === "monitor");
  const firstInvestigate = dB.history.find((h) => h.level === "investigate");
  assert.ok(firstMonitor, "an amber Monitor stage exists");
  assert.ok(firstInvestigate && firstInvestigate.day > firstMonitor!.day, "Investigate follows Monitor");
  assert.equal(dB.status, "investigate");
  assert.ok(dB.history.every((h) => (["normal", "monitor", "investigate"] as string[]).includes(h.level)), "Layer 2 never raises Act");
  assert.ok(LAYER2_LABEL.toLowerCase().includes("experimental"));
});

ok("Demo: every dashboard chart carries at least one personal-baseline or own-reference line", () => {
  for (const a of [A, B]) {
    const rows = buildMetricRows(a);
    assert.ok(rows.length >= 5);
    for (const r of rows) {
      assert.ok(r.chart.baselines.length >= 1, `${a.profile.astronaut_id} ${r.key} has no baseline line`);
      for (const b of r.chart.baselines) assert.ok(Number.isFinite(b.value), `${r.key} baseline is a number`);
    }
  }
});

ok("Demo: PHQ-9 and GAD-7 are present, cited, never auto-scheduled, and carry the flight surgeon note", () => {
  const { questionnaires } = loadReference();
  assert.ok(/flight surgeon/i.test(questionnaires.required_note));
  assert.ok(/NOT auto-scheduled/.test(questionnaires.scheduling_policy));
  const ids = (questionnaires.instruments as { id: string }[]).map((i) => i.id);
  assert.ok(ids.includes("PHQ-9") && ids.includes("GAD-7"));
});

ok("Demo: crew privacy note denies any guarantee of anonymity and names a formal impact assessment", () => {
  assert.ok(/cannot be guaranteed/i.test(PRIVACY_NOTE));
  assert.ok(/privacy impact assessment/i.test(PRIVACY_NOTE));
  assert.ok(!/\b(fully|completely|totally) anonymous\b/i.test(PRIVACY_NOTE));
});

ok("Demo: every seeded data file is labelled SIMULATED DEMONSTRATION DATA or REFERENCE CONTENT", () => {
  const dir = new URL("../data/", import.meta.url).pathname;
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const files = walk(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 20);
  for (const f of files) {
    const parsed = JSON.parse(readFileSync(f, "utf8")) as { _label?: string; meta?: { label?: string } };
    const label = parsed._label ?? parsed.meta?.label;
    assert.ok(label === "SIMULATED DEMONSTRATION DATA" || label === "REFERENCE CONTENT", `${f}: ${label}`);
  }
});

console.log(`\n${n} checks passed`);
