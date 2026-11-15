/**
 * BAYOU-NOVA Phase 7: Action and Follow-Up plan.
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. Pure functions, no React, no network.
 *
 * The plan is built from the live detection result and pre-written wording in
 * data/shared/action-content.json. It adds no detection of its own and no AI
 * model writes any of it.
 *
 * ORDER OF PRIORITY (never relaxed):
 *   1. A published red flag (Layer 1) gives the red-flag plan: the pre-defined
 *      protocol card(s), contact now. Layer 2 and the personal baseline are not
 *      used, and nothing in the plan reassures.
 *   2. Otherwise an experimental pattern or lone signal (Layer 2) gives the
 *      experimental plan, labelled as such, with uncertainty stated.
 *   3. Otherwise there is no plan to open.
 *
 * Section order is fixed: What changed, What it may suggest, What to check,
 * What to do, When to contact Earth, What improvement looks like.
 */

import actionFile from "../data/shared/action-content.json";
import { loadReference } from "./health-data";
import {
  DETECTION_METHOD,
  DOMAINS,
  LAYER2_LABEL,
  sourceRef,
  type DetectionResult,
  type SignalResult,
  type SourceRef,
  type StatusLevel,
} from "./detection";
import { emptyState, respond, SERIOUS_LINE, SERIOUS_ONBOARD_LINE, type BasisTag, type ProtocolCardView } from "./assistant";
import { hazardsForStream } from "./learn";

/* ------------------------------------------------------------------ types */

export type PlanMode = "none" | "experimental" | "redflag";

export interface PlanLink {
  href: string;
  label: string;
}

export interface PlanItem {
  id: string;
  title: string;
  text: string;
  basis: BasisTag;
  sources: SourceRef[];
  link?: PlanLink;
  /** True when the step comes from a published protocol or instrument. */
  protocol: boolean;
}

export interface ChangedLine {
  id: string;
  streamLabel: string;
  text: string;
  measurementType: string;
}

export interface PatternView {
  id: string;
  title: string;
  statement: string;
  summary: string;
  observedSinceDay: number | null;
  lines: ChangedLine[];
}

export interface RedFlagLine {
  id: string;
  title: string;
  detail: string;
  previouslyReportedDay: number | null;
  sources: SourceRef[];
  action: string;
}

export interface Possibility {
  streamTitle: string;
  text: string;
  basis: "spaceflight" | "earth" | "general";
  sources: SourceRef[];
  emphasis: boolean;
}

export interface ContactTrigger {
  text: string;
  basis?: BasisTag;
  sources: SourceRef[];
}

export interface ActionPlan {
  mode: PlanMode;
  level: StatusLevel;
  day: number;
  header: {
    title: string;
    headline: string;
    initiatedDay: number | null;
    initiatedBasis: string;
    todayDay: number;
    followUpDay: number | null;
    reviewDay: number | null;
    reviewDays: number;
    reviewBasis: string;
    reviewPassed: boolean;
    conferenceNote: string;
    patternsSince: number | null;
  };
  changed: {
    intro: string;
    patterns: PatternView[];
    alone: ChangedLine[];
    aloneTitle: string;
    aloneNote: string;
    layer1Note: string | null;
    redFlags: RedFlagLine[];
  };
  suggests: {
    lead: string;
    experimental: boolean;
    possibilitiesTitle: string;
    possibilitiesNote: string;
    possibilities: Possibility[];
    cannotSeeTitle: string;
    cannotSee: { streamTitle: string; text: string }[];
    uncertainty: string;
    layer2Note: string | null;
    experimentalLabel: string | null;
  };
  check: {
    intro: string;
    groups: { group: number; title: string; items: PlanItem[] }[];
  };
  doSection: {
    intro: string;
    noProtocolNote: string;
    items: PlanItem[];
    protocols: ProtocolCardView[];
    seriousLine: string;
    onboardLine: string;
  };
  contact: {
    nowTitle: string;
    nowNote: string;
    nowGroups: { title: string; items: string[] }[];
    measured: string[];
    onboardLine: string;
    seriousLine: string;
    soonTitle: string;
    soonNote: string;
    soon: ContactTrigger[];
    routineTitle: string;
    routine: string[];
    review: string | null;
  };
  improvement: {
    looksTitle: string;
    looksNote: string;
    looks: string[];
    timeframeTitle: string;
    timeframe: string[];
    notTitle: string;
    not: string[];
    worseTitle: string;
    worse: string | null;
    redflag: string[];
  };
  /** Ids of every tick-box in the plan. */
  checkableIds: string[];
  related: { id: string; title: string }[];
}

/* ---------------------------------------------------------------- content */

interface RawItem {
  id: string;
  group?: number;
  order?: number;
  title: string;
  text: string;
  streams: string[];
  basis: BasisTag;
  source_ids: string[];
  protocol?: boolean;
  link?: PlanLink;
}

const A = actionFile;
const SECTIONS = A.sections;
const CHECK_ITEMS = A.check_items as unknown as RawItem[];
const DO_ITEMS = A.do_items as unknown as RawItem[];
const PLAIN = A.plain as Record<string, string>;
const REVIEW_DAYS = A.header.review_days;

const { detectionContext } = loadReference();
const STREAM_CONTEXT = detectionContext.streams as unknown as Record<
  string,
  {
    title: string;
    possibilities: { basis: "spaceflight" | "earth" | "general"; text: string; source_ids: string[]; emphasis?: boolean }[];
    cannot_see: string;
  }
>;
const PATTERN_NOTES = detectionContext.patterns as unknown as Record<string, { summary: string }>;

export const ACTION_CONTENT = {
  empty: A.empty,
  disclaimer: A._disclaimer,
  sectionTitles: {
    changed: SECTIONS.changed.title,
    suggests: SECTIONS.suggests.title,
    check: SECTIONS.check.title,
    do: SECTIONS.do.title,
    contact: SECTIONS.contact.title,
    improvement: SECTIONS.improvement.title,
  },
};

/* ---------------------------------------------------------------- helpers */

const uniq = <T,>(xs: T[]): T[] => Array.from(new Set(xs));

/** "6.5 h", "88%", "5.8/10", "113 min". */
export function formatSignalValue(s: SignalResult, v: number): string {
  const n = v.toFixed(s.decimals);
  return s.unit.startsWith("/") || s.unit === "%" ? `${n}${s.unit}` : `${n} ${s.unit}`;
}

function plainLine(s: SignalResult): ChangedLine {
  const tpl = PLAIN[s.id];
  const now = s.window.median;
  const before = s.reference.median;
  let text: string;
  if (tpl && (!/\{now\}|\{before\}/.test(tpl) || (now !== null && before !== null))) {
    text = tpl
      .replace("{now}", now !== null ? formatSignalValue(s, now) : "")
      .replace("{before}", before !== null ? formatSignalValue(s, before) : "");
  } else {
    text = `${s.label}: ${s.summary}`;
  }
  return { id: s.id, streamLabel: s.streamLabel, text, measurementType: s.measurementType };
}

const departingSignals = (streamIds: string[], d: DetectionResult): SignalResult[] =>
  d.signals.filter((s) => s.departing && streamIds.includes(s.stream));

/** First mission day of the unbroken run of non-normal days that ends today. */
export function alertRunStart(d: DetectionResult): number {
  const h = [...d.history].sort((a, b) => a.day - b.day);
  let start = d.day;
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].level === "normal") break;
    start = h[i].day;
  }
  return start;
}

const toItem = (r: RawItem): PlanItem => ({
  id: r.id,
  title: r.title,
  text: r.text,
  basis: r.basis,
  sources: r.source_ids.map(sourceRef),
  link: r.link,
  protocol: !!r.protocol,
});

const applies = (r: RawItem, streams: string[]) => r.streams.includes("*") || r.streams.some((s) => streams.includes(s));

/* ------------------------------------------------------------------ build */

/** The follow-up plan for the current detection result. */
export function buildActionPlan(d: DetectionResult): ActionPlan {
  const mode: PlanMode = d.status === "act" ? "redflag" : d.status === "normal" ? "none" : "experimental";
  const red = mode === "redflag";

  // Streams that are departing. A red-flag plan ignores them on purpose.
  const patternStreams = uniq(d.patternsPresent.flatMap((p) => p.departingStreams.map((s) => s.id)));
  const aloneStreams = uniq(d.loneSignals.map((s) => s.stream));
  const streams = red ? [] : uniq([...patternStreams, ...aloneStreams]);

  /* ---- header */
  const initiatedDay = mode === "none" ? null : red ? d.latestCheckinDay ?? d.day : alertRunStart(d);
  const reviewDay = mode === "experimental" && initiatedDay !== null ? initiatedDay + REVIEW_DAYS : null;
  const followUpDay = mode === "experimental" && initiatedDay !== null ? d.day - initiatedDay + 1 : null;
  const [refFrom, refTo] = DETECTION_METHOD.own_reference_mission_days;

  /* ---- 1. What changed */
  const patterns: PatternView[] = red
    ? []
    : d.patternsPresent.map((p) => ({
        id: p.id,
        title: p.title,
        statement: p.statement,
        summary: PATTERN_NOTES[p.id]?.summary ?? "",
        observedSinceDay: p.observedSinceDay,
        lines: departingSignals(
          p.departingStreams.map((s) => s.id),
          d
        ).map(plainLine),
      }));
  const alone: ChangedLine[] = red ? [] : d.loneSignals.map(plainLine);
  const redFlags: RedFlagLine[] = d.layer1Met.map((c) => ({
    id: c.id,
    title: c.title,
    detail: c.valueAtEvaluation,
    previouslyReportedDay: c.previouslyReportedDay,
    sources: c.sources,
    action: c.action,
  }));

  /* ---- 2. What it may suggest */
  const possibilities: Possibility[] = streams.flatMap((id) =>
    (STREAM_CONTEXT[id]?.possibilities ?? []).map((p) => ({
      streamTitle: STREAM_CONTEXT[id].title,
      text: p.text,
      basis: p.basis,
      sources: p.source_ids.map(sourceRef),
      emphasis: !!p.emphasis,
    }))
  );
  const cannotSee = streams
    .filter((id) => STREAM_CONTEXT[id])
    .map((id) => ({ streamTitle: STREAM_CONTEXT[id].title, text: STREAM_CONTEXT[id].cannot_see }));

  /* ---- 3. What to check, 4. What to do */
  const checkItems = red ? [] : CHECK_ITEMS.filter((r) => applies(r, streams)).map(toItem);
  const groups = [1, 2, 3, 4]
    .map((g) => ({
      group: g,
      title: (SECTIONS.check.groups as Record<string, string>)[String(g)],
      items: CHECK_ITEMS.filter((r) => r.group === g && applies(r, streams) && !red).map(toItem),
    }))
    .filter((g) => g.items.length);

  const doItems = red
    ? []
    : DO_ITEMS.filter((r) => applies(r, streams))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(toItem);
  const protocols = red ? respond({ kind: "action", action: "escalate" }, d, emptyState()).response.protocols : [];

  /* ---- 5. When to contact Earth */
  const nowGroups = DOMAINS.map((dom) => ({
    title: dom.title,
    items: d.layer1.filter((c) => c.domain === dom.id && c.kind === "symptom").map((c) => c.title),
  })).filter((g) => g.items.length);

  const soon: ContactTrigger[] = A.contact.soon_items.map((text) => ({ text, sources: [] }));
  const extra = A.contact.soon_extra as unknown as Record<
    string,
    { text: string; basis: BasisTag; source_ids: string[] }[]
  >;
  for (const id of streams)
    for (const e of extra[id] ?? []) soon.push({ text: e.text, basis: e.basis, sources: e.source_ids.map(sourceRef) });

  const review = reviewDay !== null ? SECTIONS.contact.review_item.replace("{review}", `Mission Day ${reviewDay}`) : null;

  /* ---- 6. What improvement looks like */
  const looks: string[] = red
    ? []
    : departingSignals(streams, d).map((s) => {
        const before = s.reference.median;
        return PLAIN[s.id]?.includes("{before}") && before !== null
          ? `${s.label}: back toward about ${formatSignalValue(s, before)}.`
          : `${s.label}: answers back toward your usual ones.`;
      });

  const checkableIds = red ? [] : [...checkItems.map((i) => i.id), ...doItems.map((i) => i.id)];

  const relatedMap = new Map<string, string>();
  for (const stream of streams) for (const h of hazardsForStream(stream)) relatedMap.set(h.id, h.title);
  const related = Array.from(relatedMap, ([id, title]) => ({ id, title }));

  return {
    mode,
    level: d.status,
    day: d.day,
    header: {
      title: A.header.title,
      headline: d.alert.headline,
      initiatedDay,
      initiatedBasis: A.header.initiated_basis,
      todayDay: d.day,
      followUpDay,
      reviewDay,
      reviewDays: REVIEW_DAYS,
      reviewBasis: red ? A.header.redflag_basis : A.header.review_basis,
      reviewPassed: reviewDay !== null && d.day >= reviewDay,
      conferenceNote: A.header.conference_note,
      patternsSince: d.patternsPresent.length
        ? Math.min(...d.patternsPresent.map((p) => p.observedSinceDay ?? d.day))
        : null,
    },
    changed: {
      intro: red
        ? SECTIONS.changed.intro_redflag
        : SECTIONS.changed.intro_experimental.replace("{from}", String(refFrom)).replace("{to}", String(refTo)),
      patterns,
      alone,
      aloneTitle: SECTIONS.changed.alone_title,
      aloneNote: SECTIONS.changed.alone_note,
      layer1Note: red ? null : SECTIONS.changed.layer1_none,
      redFlags,
    },
    suggests: {
      lead: red ? SECTIONS.suggests.lead_redflag : SECTIONS.suggests.lead_experimental,
      experimental: !red,
      possibilitiesTitle: SECTIONS.suggests.possibilities_title,
      possibilitiesNote: SECTIONS.suggests.possibilities_note,
      possibilities: red ? [] : possibilities,
      cannotSeeTitle: SECTIONS.suggests.cannot_see_title,
      cannotSee: red ? [] : cannotSee,
      uncertainty: SECTIONS.suggests.uncertainty,
      layer2Note: red ? d.alert.layer2SuppressedNote : null,
      experimentalLabel: red ? null : LAYER2_LABEL,
    },
    check: {
      intro: red ? SECTIONS.check.intro_redflag : SECTIONS.check.intro,
      groups,
    },
    doSection: {
      intro: red ? SECTIONS.do.redflag_intro : SECTIONS.do.intro,
      noProtocolNote: A.header.no_protocol_note,
      items: doItems,
      protocols,
      seriousLine: SERIOUS_LINE,
      onboardLine: SERIOUS_ONBOARD_LINE,
    },
    contact: {
      nowTitle: SECTIONS.contact.now_title,
      nowNote: SECTIONS.contact.now_note,
      nowGroups,
      measured: A.contact.now_measured,
      onboardLine: SERIOUS_ONBOARD_LINE,
      seriousLine: SERIOUS_LINE,
      soonTitle: SECTIONS.contact.soon_title,
      soonNote: SECTIONS.contact.soon_note,
      soon: red ? [] : soon,
      routineTitle: SECTIONS.contact.routine_title,
      routine: red ? [] : SECTIONS.contact.routine_items,
      review,
    },
    improvement: {
      looksTitle: SECTIONS.improvement.looks_title,
      looksNote: SECTIONS.improvement.looks_note,
      looks,
      timeframeTitle: SECTIONS.improvement.timeframe_title,
      timeframe: red ? [] : SECTIONS.improvement.timeframe_items,
      notTitle: SECTIONS.improvement.not_title,
      not: red ? [] : SECTIONS.improvement.not_items,
      worseTitle: SECTIONS.improvement.worse_title,
      worse: red ? null : SECTIONS.improvement.worse_text,
      redflag: red ? SECTIONS.improvement.redflag : [],
    },
    checkableIds,
    related,
  };
}

/** Every string a plan can show, for the wording checks. */
export function planStrings(p: ActionPlan): string[] {
  const out: string[] = [p.header.headline, p.changed.intro, p.suggests.lead, p.check.intro, p.doSection.intro];
  for (const x of p.changed.patterns) out.push(x.statement, x.summary, ...x.lines.map((l) => l.text));
  for (const x of p.changed.alone) out.push(x.text);
  for (const x of p.suggests.possibilities) out.push(x.text);
  for (const g of p.check.groups) for (const i of g.items) out.push(i.title, i.text);
  for (const i of p.doSection.items) out.push(i.title, i.text);
  for (const t of p.contact.soon) out.push(t.text);
  out.push(...p.improvement.looks, ...p.improvement.timeframe, ...p.improvement.not);
  return out;
}
