/**
 * BAYOU-NOVA Phase 7: Spaceflight Hazard Awareness and Prevention (Learn tab).
 * ----------------------------------------------------------------------------
 * Pure functions, no React. All wording lives in data/shared/learn-content.json;
 * every citation resolves through data/shared/sources.json.
 *
 * Rule enforced here and in the logic checks: a statement either carries at
 * least one source id, or it is explicitly a BAYOU-NOVA note (no source ids).
 * Nothing in between.
 */

import contentFile from "../data/shared/learn-content.json";
import { sourceRef, type SourceRef } from "./detection";

/* ------------------------------------------------------------------ types */

export const HAZARD_IDS = [
  "radiation",
  "altered-gravity",
  "bone-muscle",
  "cardiovascular",
  "immune",
  "behavioural",
  "nutrition",
  "sleep",
] as const;
export type HazardId = (typeof HAZARD_IDS)[number];

export type ResearchLevel = "established" | "partly" | "investigating";
export type MeasuredAs =
  | "direct measurement"
  | "functional indicator"
  | "self-reported"
  | "behavioural inference"
  | "not measured";

interface RawClaim {
  text: string;
  source_ids: string[];
}

/** One statement on a card. `sources` is empty only for a BAYOU-NOVA note. */
export interface Claim {
  text: string;
  sources: SourceRef[];
  /** True when the statement is the platform's own wording and carries no source. */
  platformNote: boolean;
}

export interface OpenQuestion {
  text: string;
  sources: SourceRef[];
}

export interface PlatformSees {
  summary: string;
  items: { what: string; type: MeasuredAs }[];
}

export interface Hazard {
  id: HazardId;
  title: string;
  icon: string;
  summary: string;
  research: { level: ResearchLevel; label: string };
  /** Detection streams this hazard relates to (used to link from the action plan). */
  streams: string[];
  whatItIs: Claim[];
  whyItHappens: Claim[];
  whatToWatch: Claim[];
  preventiveActions: Claim[];
  openQuestion: OpenQuestion;
  platformSees: PlatformSees;
}

export interface PhaseItem {
  id: string;
  title: string;
  when: string;
  summary: string;
  tips: Claim[];
  awareness: Claim[];
}

export interface ToolkitExerciseType {
  id: string;
  title: string;
  targets: string;
  why: string;
  evidence: Claim[];
  limits: string;
}

export interface ToolkitItem {
  title: string;
  text: string;
  sources: SourceRef[];
  platformNote: boolean;
}

/* --------------------------------------------------------------- building */

const claim = (c: RawClaim): Claim => ({
  text: c.text,
  sources: c.source_ids.map(sourceRef),
  platformNote: c.source_ids.length === 0,
});

interface RawHazard {
  id: string;
  title: string;
  icon: string;
  summary: string;
  research_status: { level: string; label: string };
  streams: string[];
  what_it_is: RawClaim[];
  why_it_happens: RawClaim[];
  what_to_watch: RawClaim[];
  preventive_actions: RawClaim[];
  open_question: RawClaim;
  platform_sees: { summary: string; items: { what: string; type: string }[] };
}

const RAW_HAZARDS = contentFile.hazards as unknown as RawHazard[];

export const HAZARDS: Hazard[] = RAW_HAZARDS.map((h) => ({
  id: h.id as HazardId,
  title: h.title,
  icon: h.icon,
  summary: h.summary,
  research: { level: h.research_status.level as ResearchLevel, label: h.research_status.label },
  streams: h.streams,
  whatItIs: h.what_it_is.map(claim),
  whyItHappens: h.why_it_happens.map(claim),
  whatToWatch: h.what_to_watch.map(claim),
  preventiveActions: h.preventive_actions.map(claim),
  openQuestion: { text: h.open_question.text, sources: h.open_question.source_ids.map(sourceRef) },
  platformSees: {
    summary: h.platform_sees.summary,
    items: h.platform_sees.items.map((i) => ({ what: i.what, type: i.type as MeasuredAs })),
  },
}));

export const HAZARD_LABELS: Record<HazardId, string> = Object.fromEntries(
  HAZARDS.map((h) => [h.id, h.title])
) as Record<HazardId, string>;

export const isHazardId = (id: string): id is HazardId => (HAZARD_IDS as readonly string[]).includes(id);

export function getHazard(id: HazardId): Hazard {
  const h = HAZARDS.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown hazard: ${id}`);
  return h;
}

/** The hazards that relate to a detection stream, for linking from the action plan. */
export function hazardsForStream(stream: string): Hazard[] {
  return HAZARDS.filter((h) => h.streams.includes(stream));
}

export const LEARN_HOW_TO_READ = contentFile.how_to_read;

/* ----------------------------------------------------------------- phases */

export const PHASES_INTRO = contentFile.phases.intro;
export const PHASES_CONVENTION_NOTE = contentFile.phases.convention_note;
const EARLY_LAST_DAY = contentFile.phases.early_adaptation_last_day;

interface RawPhase {
  id: string;
  title: string;
  when: string;
  summary: string;
  tips: RawClaim[];
  awareness: RawClaim[];
}

export const PHASES: PhaseItem[] = (contentFile.phases.items as unknown as RawPhase[]).map((p) => ({
  id: p.id,
  title: p.title,
  when: p.when,
  summary: p.summary,
  tips: p.tips.map(claim),
  awareness: p.awareness.map(claim),
}));

export type PhaseId = "preflight" | "early" | "inflight" | "return" | "postflight";

/**
 * The current mission phase from the mission day. The demo only runs in flight,
 * so this only separates early adaptation (the platform's own convention, the
 * same days its detection windows leave out) from the rest of the flight.
 * It never reports return or post-flight: nothing in the data says the mission is ending.
 */
export function currentPhase(missionDay: number): PhaseId {
  if (missionDay <= 0) return "preflight";
  return missionDay <= EARLY_LAST_DAY ? "early" : "inflight";
}

export const phaseTitle = (id: PhaseId): string => PHASES.find((p) => p.id === id)?.title ?? id;

/** Where a phase sits relative to the current one, for the timeline. */
export function phaseRelation(id: string, current: PhaseId): "past" | "current" | "upcoming" {
  const order = PHASES.map((p) => p.id);
  const a = order.indexOf(id);
  const b = order.indexOf(current);
  return a === b ? "current" : a < b ? "past" : "upcoming";
}

/* ---------------------------------------------------------------- toolkit */

const T = contentFile.toolkit;

export const TOOLKIT_INTRO = T.intro;
export const TOOLKIT_EXERCISE = {
  title: T.exercise.title,
  note: T.exercise.note,
  noteSources: T.exercise.note_sources.map(sourceRef),
  types: (T.exercise.types as unknown as {
    id: string;
    title: string;
    targets: string;
    why: string;
    evidence: RawClaim[];
    limits: string;
  }[]).map(
    (t): ToolkitExerciseType => ({
      id: t.id,
      title: t.title,
      targets: t.targets,
      why: t.why,
      evidence: t.evidence.map(claim),
      limits: t.limits,
    })
  ),
};

const toolkitItems = (items: { title: string; text: string; source_ids: string[] }[]): ToolkitItem[] =>
  items.map((i) => ({
    title: i.title,
    text: i.text,
    sources: i.source_ids.map(sourceRef),
    platformNote: i.source_ids.length === 0,
  }));

export const TOOLKIT_NUTRITION = {
  title: T.nutrition.title,
  note: T.nutrition.note,
  items: toolkitItems(T.nutrition.items),
};
export const TOOLKIT_PSYCHOLOGICAL = {
  title: T.psychological.title,
  note: T.psychological.note,
  items: toolkitItems(T.psychological.items),
};

/* ------------------------------------------------------------ validation */

/** Every source id used anywhere in the Learn content. */
export function allLearnSourceIds(): string[] {
  const ids: string[] = [];
  const add = (xs: { source_ids?: string[] }[]) => xs.forEach((x) => ids.push(...(x.source_ids ?? [])));
  for (const h of RAW_HAZARDS) {
    add(h.what_it_is);
    add(h.why_it_happens);
    add(h.what_to_watch);
    add(h.preventive_actions);
    add([h.open_question]);
  }
  for (const p of contentFile.phases.items as unknown as RawPhase[]) {
    add(p.tips);
    add(p.awareness);
  }
  ids.push(...T.exercise.note_sources);
  for (const t of T.exercise.types as unknown as { evidence: RawClaim[] }[]) add(t.evidence);
  add(T.nutrition.items);
  add(T.psychological.items);
  return ids;
}

/** Every statement across the Learn content, for the sourcing checks. */
export function allClaims(): { where: string; text: string; sourceCount: number }[] {
  const out: { where: string; text: string; sourceCount: number }[] = [];
  const push = (where: string, c: { text: string; sources: SourceRef[] }) =>
    out.push({ where, text: c.text, sourceCount: c.sources.length });
  for (const h of HAZARDS) {
    h.whatItIs.forEach((c) => push(`${h.id}/what`, c));
    h.whyItHappens.forEach((c) => push(`${h.id}/why`, c));
    h.whatToWatch.forEach((c) => push(`${h.id}/watch`, c));
    h.preventiveActions.forEach((c) => push(`${h.id}/prevent`, c));
    push(`${h.id}/open`, h.openQuestion);
  }
  for (const p of PHASES) {
    p.tips.forEach((c) => push(`${p.id}/tip`, c));
    p.awareness.forEach((c) => push(`${p.id}/awareness`, c));
  }
  for (const t of TOOLKIT_EXERCISE.types) t.evidence.forEach((c) => push(`exercise/${t.id}`, c));
  return out;
}
