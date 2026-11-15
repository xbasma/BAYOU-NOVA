/**
 * BAYOU-NOVA Phase 6: Medical Assistant engine.
 * ----------------------------------------------------------------------------
 * SIMULATED DEMONSTRATION DATA. Pure functions, no React, no network, no
 * database, and NO AI MODEL. Every response is assembled by the fixed rules in
 * this file from:
 *   data/shared/assistant-content.json    wording, keyword screen, demo script
 *   data/shared/assistant-protocols.json  pre-defined protocol cards (serious)
 *   data/shared/detection-context.json    "why might this be happening" content
 *   lib/detection.ts                      the live result of both layers
 *
 * ORDER OF EVALUATION (never relaxed here):
 *
 *   1. Red flags. The message is screened for red-flag words, and Layer 1 is
 *      read from the detection result. If either finds anything, the response
 *      is SERIOUS: a pre-defined protocol card, word for word from the JSON.
 *      This branch returns before any baseline, signal or pattern is looked
 *      at, so a normal-looking baseline cannot soften it. Once a red flag has
 *      been mentioned it stays for the rest of the conversation.
 *   2. Things the platform cannot interpret -> UNCERTAIN.
 *   3. A topic the platform follows -> MODERATE when an experimental pattern
 *      involves it, otherwise ROUTINE.
 *   4. Anything else -> UNCERTAIN. The assistant never guesses.
 */

import contentFile from "../data/shared/assistant-content.json";
import protocolFile from "../data/shared/assistant-protocols.json";
import contextFile from "../data/shared/detection-context.json";
import questionBank from "../data/shared/checkin-questions.json";
import {
  LAYER1_LABEL,
  LAYER2_LABEL,
  sourceRef,
  type DetectionResult,
  type PatternResult,
  type SourceRef,
  type StreamResult,
} from "./detection";
import type { AstronautData, AstronautId } from "./health-data";

/* ------------------------------------------------------------------ types */

export type AssistantLevel = "routine" | "moderate" | "serious" | "uncertain";
/** "info" is used only for the greeting and for notes; it makes no health statement. */
export type ResponseLevel = AssistantLevel | "info";
/** Colour of the card: green, amber, orange, red, or neutral. */
export type AssistantTone = "normal" | "monitor" | "investigate" | "act" | "neutral";
export type QuickAction = "why" | "escalate";
export type Turn = { kind: "text"; text: string } | { kind: "action"; action: QuickAction };

export const QUICK_ACTIONS: { id: QuickAction; label: string }[] = [
  { id: "why", label: "Why might this be happening?" },
  { id: "escalate", label: "When should I escalate?" },
];

export type BasisTag = "spaceflight" | "earth" | "general" | "platform";
export type BlockKind =
  | "signals"
  | "questions"
  | "explanations"
  | "watch"
  | "timeframe"
  | "investigate"
  | "cannot_see"
  | "next_steps"
  | "escalate_now"
  | "escalate_soon"
  | "escalate_routine";

export interface BlockItem {
  text: string;
  /** Short label shown before the text, e.g. a measurement type or a stream name. */
  tag?: string;
  basis?: BasisTag;
  sources?: SourceRef[];
  emphasis?: boolean;
}

export interface Block {
  kind: BlockKind;
  title: string;
  note?: string;
  items: BlockItem[];
}

export interface ProtocolCardView {
  id: string;
  title: string;
  /** The red flags that brought this card up, and how each was found. */
  triggers: { id: string; title: string; how: "mentioned" | "data"; detail: string }[];
  /** "This response follows: <sources>" */
  followsLabel: string;
  followsNote: string;
  sources: SourceRef[];
  spaceflightGap: string;
  steps: BlockItem[];
  cannot: string;
  visitorNote: string | null;
}

export interface AssistantResponse {
  kind: "answer" | "why" | "escalate" | "note" | "greeting";
  level: ResponseLevel;
  tone: AssistantTone;
  levelLabel: string;
  headline: string;
  lead: string[];
  basis: { kind: "published" | "experimental" | "none"; label: string };
  blocks: Block[];
  protocols: ProtocolCardView[];
  /** Sentences that must appear word for word at this level. */
  mandatory: string[];
  footnotes: string[];
  links: { href: string; label: string }[];
  /** How this response was produced. Never an AI model. */
  producedBy: string;
}

export interface ConversationState {
  /** Layer 1 criterion ids mentioned in free text so far. Sticky. */
  flagged: string[];
  focusStreams: string[];
  focusLevel: AssistantLevel | null;
  /** True when the last answer asked follow-up questions. */
  askedQuestions: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  /** User messages: the text typed, or the quick action's label. */
  text?: string;
  viaQuickAction?: boolean;
  response?: AssistantResponse;
}

export const emptyState = (): ConversationState => ({
  flagged: [],
  focusStreams: [],
  focusLevel: null,
  askedQuestions: false,
});

/* ---------------------------------------------------------------- content */

const C = contentFile;
const P = protocolFile;

export const ASSISTANT_NAME = C.assistant_name;
export const HOW_IT_WORKS = C.how_it_works;
export const MODERATE_LINE = C.mandatory.moderate;
export const UNCERTAIN_LINE = C.mandatory.uncertain;
export const ROUTINE_CONTACT_LINE = C.mandatory.routine_contact;
export const SERIOUS_LINE = P.required_line;
export const SERIOUS_ONBOARD_LINE = P.onboard_line;
export const PROTOCOL_LABEL_PREFIX = P.label_prefix;
export const PROTOCOL_FIXED_TEXT_NOTE = P.fixed_text_note;
export const PROTOCOL_CLINICAL_REVIEW = P.clinical_review;
export const PROTOCOL_SOURCING_FINDING = P.sourcing_finding;
export const SCREEN_LABEL = C.red_flag_screen.label;
export const SCREEN_NOTE = C.red_flag_screen.note;
export const SUGGESTION_NOTE = C.suggestion_note;
export const BASIS_TAG_LABEL: Record<BasisTag, string> = {
  spaceflight: P.basis_labels.spaceflight,
  earth: P.basis_labels.earth,
  platform: P.basis_labels.platform,
  general: contextFile.basis_labels.general,
};

interface ProtocolDef {
  id: string;
  title: string;
  criteria: string[];
  follows: string[];
  follows_note: string;
  spaceflight_gap: string;
  steps: { text: string; basis: string; source_ids: string[] }[];
  cannot: string;
  visitor_note?: boolean;
}
const PROTOCOLS = P.protocols as unknown as ProtocolDef[];

interface FlagRule {
  criterion: string;
  mention: string;
  any?: string[];
  all?: string[];
}
interface UncertainRule {
  id: string;
  any: string[];
  headline: string;
  reason: string;
  say_if: string;
  source_ids?: string[];
}
interface TopicDef {
  stream: string;
  noun: string;
  any: string[];
  follow_ups: string[];
  observations: string[];
}
interface StreamContext {
  title: string;
  possibilities: { basis: "spaceflight" | "earth" | "general"; text: string; source_ids: string[]; emphasis?: boolean }[];
  cannot_see: string;
}

const FLAG_RULES = C.red_flag_screen.rules as unknown as FlagRule[];
const UNCERTAIN_RULES = C.uncertain_rules as unknown as UncertainRule[];
const TOPICS = C.topics as unknown as TopicDef[];
const STREAM_CONTEXT = contextFile.streams as unknown as Record<string, StreamContext>;
const PATTERN_NOTES = contextFile.patterns as unknown as Record<string, { summary: string }>;

/* ------------------------------------------------------------ text screen */

/** Lower-case, straight apostrophes, single spaces. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const REGEX_CACHE = new Map<string, RegExp>();
/** A pattern from the JSON, matched as whole words unless it carries its own anchor. */
function rx(pattern: string): RegExp {
  let r = REGEX_CACHE.get(pattern);
  if (!r) {
    r = pattern.startsWith("^")
      ? new RegExp(pattern, "i")
      : new RegExp(`(?:^|[^a-z])(?:${pattern})(?![a-z])`, "i");
    REGEX_CACHE.set(pattern, r);
  }
  return r;
}
const anyMatch = (patterns: string[], text: string) => patterns.some((p) => rx(p).test(text));

/**
 * SAFETY RULE. Which published red flags does this text mention?
 * Deliberately one-sided: a mention is a match. There is no negation
 * handling, because a wrong "not reported" is the failure that matters.
 */
export function screenRedFlags(text: string): string[] {
  const t = normalise(text);
  if (!t) return [];
  return FLAG_RULES.filter((r) =>
    r.all ? r.all.every((p) => rx(p).test(t)) : anyMatch(r.any ?? [], t)
  ).map((r) => r.criterion);
}

/** Every Layer 1 criterion that can be reported as a symptom has a keyword rule. */
export const SCREENED_CRITERIA: string[] = FLAG_RULES.map((r) => r.criterion);

function matchUncertain(text: string): UncertainRule | null {
  const t = normalise(text);
  return UNCERTAIN_RULES.find((r) => anyMatch(r.any, t)) ?? null;
}

/** Streams the message is about, in the platform's own stream order. */
export function matchTopics(text: string): string[] {
  const t = normalise(text);
  return TOPICS.filter((d) => anyMatch(d.any, t)).map((d) => d.stream);
}

const isStatusQuestion = (text: string) => anyMatch(C.status_intent, normalise(text));
const isGreeting = (text: string) => anyMatch(C.greeting_intent, normalise(text));

/* ---------------------------------------------------------------- helpers */

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Lower-case a leading capital, but leave acronyms such as PHQ-9 alone. */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));
const topic = (stream: string) => TOPICS.find((t) => t.stream === stream);
const refs = (ids: string[]) => ids.map(sourceRef);

const LEVEL_LABEL: Record<ResponseLevel, string> = {
  routine: "Routine",
  moderate: "Moderate · experimental pattern",
  serious: "Serious · published red flag",
  uncertain: "Uncertain · needs human judgement",
  info: "Information",
};
const PRODUCED_RULES = "Assembled by fixed rules from pre-written text and your simulated data. Not written by an AI model.";
const PRODUCED_PROTOCOL = "Pre-defined protocol card. Fixed text, not AI-generated guidance.";

/** Patterns that involve any of these streams. */
function patternsFor(streams: string[], d: DetectionResult): PatternResult[] {
  return d.patternsPresent.filter((p) => p.departingStreams.some((s) => streams.includes(s.id)));
}
const departingIn = (streams: string[], d: DetectionResult): StreamResult[] =>
  d.streams.filter((s) => s.departing && streams.includes(s.id));

function signalItems(streams: StreamResult[], onlyDeparting: boolean): BlockItem[] {
  return streams.flatMap((s) =>
    s.signals
      .filter((x) => !onlyDeparting || x.departing)
      .map((x) => ({ tag: cap(x.measurementType), text: `${x.label}: ${x.summary}` }))
  );
}

function explanationItems(streams: string[], full: boolean): BlockItem[] {
  return streams.flatMap((id) => {
    const ctx = STREAM_CONTEXT[id];
    if (!ctx) return [];
    const picked = full ? ctx.possibilities : ctx.possibilities.filter((p, i) => i === 0 || p.emphasis);
    return picked.map((p) => ({
      tag: ctx.title,
      text: p.text,
      basis: p.basis,
      sources: refs(p.source_ids),
      emphasis: p.emphasis,
    }));
  });
}

const cannotSeeItems = (streams: string[]): BlockItem[] =>
  streams.filter((id) => STREAM_CONTEXT[id]).map((id) => ({ tag: STREAM_CONTEXT[id].title, text: STREAM_CONTEXT[id].cannot_see }));

function questionItems(streams: string[], perStream: number): BlockItem[] {
  return streams.flatMap((id) => (topic(id)?.follow_ups ?? []).slice(0, perStream).map((text) => ({ text })));
}
const watchItems = (streams: string[]): BlockItem[] =>
  streams.flatMap((id) => (topic(id)?.observations ?? []).map((text) => ({ text })));

const timeframeBlock = (): Block => ({
  kind: "timeframe",
  title: C.routine.timeframe_title,
  note: C.timeframe.basis,
  items: [{ text: C.routine.timeframe_text.replace("{days}", String(C.timeframe.days)) }],
});

/* ---------------------------------------------------------------- SERIOUS */

/**
 * The serious response. Built only from the protocol JSON and the Layer 1
 * result. It takes no signal, stream, pattern or baseline as input.
 */
function serious(
  kind: AssistantResponse["kind"],
  mentionedNow: string[],
  flagged: string[],
  d: DetectionResult
): AssistantResponse {
  const dataMet = d.layer1Met.map((c) => c.id);
  const active = uniq([...dataMet, ...flagged]);
  const title = (id: string) => d.layer1.find((c) => c.id === id)?.title ?? id;

  const protocols: ProtocolCardView[] = PROTOCOLS.filter((p) => p.criteria.some((c) => active.includes(c))).map((p) => {
    const sources = refs(p.follows);
    return {
      id: p.id,
      title: p.title,
      triggers: p.criteria
        .filter((c) => active.includes(c))
        .map((c) => {
          const inData = d.layer1Met.find((m) => m.id === c);
          return inData
            ? { id: c, title: inData.title, how: "data" as const, detail: inData.valueAtEvaluation }
            : { id: c, title: title(c), how: "mentioned" as const, detail: "Mentioned in this conversation" };
        }),
      followsLabel: `${PROTOCOL_LABEL_PREFIX}: ${sources.map((s) => s.short).join("; ")}`,
      followsNote: p.follows_note,
      sources,
      spaceflightGap: p.spaceflight_gap,
      steps: p.steps.map((s) => ({ text: s.text, basis: s.basis as BasisTag, sources: refs(s.source_ids) })),
      cannot: p.cannot,
      visitorNote: p.visitor_note ? P.visitor_note : null,
    };
  });

  const lead: string[] = [];
  const mentions = FLAG_RULES.filter((r) => mentionedNow.includes(r.criterion)).map((r) => r.mention);
  if (kind === "why") {
    lead.push(C.why.serious_refusal);
  } else if (kind === "escalate") {
    lead.push(C.escalate.serious_now, C.escalate.serious_more);
  } else {
    if (mentions.length) lead.push(`Your message mentions ${joinWords(mentions)}. ${C.red_flag_screen.ambiguity_line}`);
    if (d.layer1Met.length)
      lead.push(
        `Your latest data meets ${d.layer1Met.length === 1 ? "a published red-flag criterion" : "published red-flag criteria"}: ${d.layer1Met
          .map((c) => `${c.title.toLowerCase()} (${lowerFirst(c.valueAtEvaluation)})`)
          .join("; ")}.`
      );
    if (!mentions.length && flagged.length) lead.push(C.red_flag_screen.sticky_line);
  }
  lead.push(
    d.layer2Level === "normal"
      ? "Your personal baseline is not used here. Readings that look normal for you are not reassurance."
      : "Your personal baseline is not used here, and the Layer 2 pattern observations do not change this response."
  );

  const published = uniq(
    d.layer1.filter((c) => active.includes(c.id)).flatMap((c) => c.sources.map((s) => s.short))
  );
  const onlyMentioned = flagged.filter((id) => !dataMet.includes(id));
  const footnotes = [PROTOCOL_FIXED_TEXT_NOTE, PROTOCOL_CLINICAL_REVIEW];
  if (onlyMentioned.length) footnotes.unshift(C.red_flag_screen.record_line);

  return {
    kind,
    level: "serious",
    tone: "act",
    levelLabel: LEVEL_LABEL.serious,
    headline:
      kind === "why"
        ? "A red flag is acted on, not explained"
        : kind === "escalate"
          ? "This is already the level to act on"
          : `Published red flag: ${joinWords(active.map(title)).toLowerCase()}`,
    lead,
    basis: { kind: "published", label: `${LAYER1_LABEL} — ${published.join("; ")}` },
    blocks: [],
    protocols,
    mandatory: [SERIOUS_LINE, SERIOUS_ONBOARD_LINE],
    footnotes,
    links: [
      ...(onlyMentioned.length ? [{ href: "/check-in/daily", label: "Record it in today's safety check" }] : []),
      { href: "/alerts", label: "Open Early Detection for the criteria and sources" },
    ],
    producedBy: PRODUCED_PROTOCOL,
  };
}

/* -------------------------------------------------------------- UNCERTAIN */

function uncertain(headline: string, reason: string, sayIf: string | null, sourceIds: string[] = []): AssistantResponse {
  const srcs = refs(sourceIds);
  return {
    kind: "answer",
    level: "uncertain",
    tone: "neutral",
    levelLabel: LEVEL_LABEL.uncertain,
    headline,
    lead: [reason, ...(sayIf ? [sayIf] : [])],
    basis: { kind: "none", label: "No reliable basis for interpretation" },
    blocks: [],
    protocols: [],
    mandatory: [UNCERTAIN_LINE],
    footnotes: srcs.length ? [`Source: ${srcs.map((s) => s.short).join("; ")}.`] : [],
    links: [{ href: "/check-in/daily", label: "Open the daily check-in and its safety check" }],
    producedBy: PRODUCED_RULES,
  };
}

/* ------------------------------------------------------ MODERATE / ROUTINE */

function moderate(patterns: PatternResult[], d: DetectionResult): { response: AssistantResponse; streams: string[] } {
  const streams = uniq(patterns.flatMap((p) => p.departingStreams.map((s) => s.id)));
  const streamResults = d.streams.filter((s) => streams.includes(s.id));
  const others = d.patternsPresent.filter((p) => !patterns.includes(p));

  const lead = patterns.flatMap((p) => [
    `${p.statement}${p.observedSinceDay ? ` Observed since Mission Day ${p.observedSinceDay}.` : ""}`,
    PATTERN_NOTES[p.id]?.summary ?? "",
  ]);
  lead.push(C.moderate.lead_suffix);
  if (others.length)
    lead.push(
      `${others.length === 1 ? "One other pattern is" : `${others.length} other patterns are`} also observed (${joinWords(
        others.map((p) => p.title.toLowerCase())
      )}). Ask about ${others.length === 1 ? "it" : "them"}, or open Early Detection.`
    );

  const response: AssistantResponse = {
    kind: "answer",
    level: "moderate",
    tone: "investigate",
    levelLabel: LEVEL_LABEL.moderate,
    headline:
      patterns.length === 1
        ? `An experimental pattern is observed: ${patterns[0].title.toLowerCase()}`
        : `${patterns.length} experimental patterns are observed`,
    lead: lead.filter(Boolean),
    basis: { kind: "experimental", label: LAYER2_LABEL },
    blocks: [
      { kind: "signals", title: "What your signals show", items: signalItems(streamResults, true) },
      { kind: "investigate", title: C.moderate.investigate_title, items: C.moderate.investigate_items.map((text) => ({ text })) },
      {
        kind: "questions",
        title: C.routine.questions_title,
        note: C.routine.questions_note,
        items: questionItems(streams, 1),
      },
      {
        kind: "explanations",
        title: C.moderate.explain_title,
        note: C.moderate.explain_note,
        items: explanationItems(streams, false),
      },
      {
        kind: "next_steps",
        title: C.moderate.next_title,
        note: C.moderate.next_note,
        items: C.moderate.next_items.map((text) => ({ text })),
      },
    ],
    protocols: [],
    mandatory: [MODERATE_LINE],
    footnotes: [],
    links: [
      ...patterns.map((p) => ({ href: `/alerts/${p.id}`, label: `Open the pattern: ${p.title.toLowerCase()}` })),
      { href: "/check-in", label: "Daily check-in, questionnaires and cognitive observation" },
    ],
    producedBy: PRODUCED_RULES,
  };
  return { response, streams };
}

function routine(streams: string[], d: DetectionResult, reported: boolean): AssistantResponse {
  const departing = departingIn(streams, d);
  const amber = departing.length > 0;
  const nouns = joinWords(streams.map((id) => topic(id)?.noun ?? id));
  const lead: string[] = [];

  if (amber) {
    const signals = departing.flatMap((s) => s.signals.filter((x) => x.departing).map((x) => x.label.toLowerCase()));
    lead.push(
      C.routine.monitor_lead.replace("{signals}", cap(joinWords(signals))).replace("{verb}", signals.length === 1 ? "shows" : "show")
    );
  } else if (streams.length) {
    lead.push(C.routine.normal_lead.replace("{noun}", cap(nouns)));
  } else {
    lead.push(C.routine.status_normal_lead);
  }
  if (reported && !amber && streams.length) lead.push(C.routine.reported_not_in_data.replace("{noun}", nouns));

  const shown = d.streams.filter((s) => streams.includes(s.id));
  const blocks: Block[] = [];
  if (shown.length) blocks.push({ kind: "signals", title: "What your signals show", items: signalItems(shown, false) });
  if (streams.length) {
    blocks.push({
      kind: "questions",
      title: C.routine.questions_title,
      note: C.routine.questions_note,
      items: questionItems(streams, streams.length > 1 ? 2 : 3),
    });
    blocks.push({
      kind: "explanations",
      title: "What this may be consistent with",
      note: contextFile.intro,
      items: explanationItems(streams, false),
    });
    blocks.push({ kind: "watch", title: C.routine.watch_title, items: watchItems(streams) });
  } else {
    blocks.push({
      kind: "watch",
      title: C.routine.watch_title,
      items: [
        { text: "Complete the daily check-in so both detection layers stay current." },
        { text: "Report any new symptom in the safety check, whatever this page shows." },
      ],
    });
  }
  blocks.push(timeframeBlock());

  return {
    kind: "answer",
    level: "routine",
    tone: amber ? "monitor" : "normal",
    levelLabel: amber ? "Routine · monitor" : LEVEL_LABEL.routine,
    headline: amber
      ? `Warrants monitoring: ${joinWords(departing.map((s) => s.label.toLowerCase()))}`
      : streams.length
        ? `No consistent unfavourable direction in ${nouns}`
        : "No alert from either layer",
    lead,
    basis: amber
      ? { kind: "experimental", label: LAYER2_LABEL }
      : { kind: "none", label: "Both layers evaluated. Not a statement that you are well." },
    blocks,
    protocols: [],
    mandatory: [ROUTINE_CONTACT_LINE],
    footnotes: [],
    links: [{ href: "/alerts", label: "Open Early Detection" }],
    producedBy: PRODUCED_RULES,
  };
}

/* ------------------------------------------------------------ quick actions */

function why(state: ConversationState, d: DetectionResult): AssistantResponse {
  if (state.focusLevel === "uncertain") {
    return { ...uncertain("Why this may be happening cannot be said here", C.why.uncertain_refusal, null), kind: "why" };
  }
  const streams = state.focusStreams.length ? state.focusStreams : d.streams.filter((s) => s.departing).map((s) => s.id);
  const patterns = patternsFor(streams, d);
  const isModerate = patterns.length > 0;
  const departing = departingIn(streams, d);

  if (!streams.length) {
    return {
      kind: "why",
      level: "routine",
      tone: "normal",
      levelLabel: LEVEL_LABEL.routine,
      headline: C.why.title,
      lead: [C.why.nothing_departing],
      basis: { kind: "none", label: "Both layers evaluated. Not a statement that you are well." },
      blocks: [],
      protocols: [],
      mandatory: [ROUTINE_CONTACT_LINE],
      footnotes: [],
      links: [],
      producedBy: PRODUCED_RULES,
    };
  }

  return {
    kind: "why",
    level: isModerate ? "moderate" : "routine",
    tone: isModerate ? "investigate" : departing.length ? "monitor" : "normal",
    levelLabel: isModerate ? LEVEL_LABEL.moderate : departing.length ? "Routine · monitor" : LEVEL_LABEL.routine,
    headline: C.why.title,
    lead: [
      contextFile.intro,
      ...patterns.map((p) => PATTERN_NOTES[p.id]?.summary ?? "").filter(Boolean),
      "Each line below says where it comes from. \"May be consistent with\" is as far as any of them goes.",
    ],
    basis: isModerate || departing.length
      ? { kind: "experimental", label: LAYER2_LABEL }
      : { kind: "none", label: "Context only. Not a finding." },
    blocks: [
      {
        kind: "explanations",
        title: C.moderate.explain_title,
        note: C.moderate.explain_note,
        items: explanationItems(streams, true),
      },
      { kind: "cannot_see", title: C.moderate.cannot_see_title, items: cannotSeeItems(streams) },
    ],
    protocols: [],
    mandatory: [isModerate ? MODERATE_LINE : ROUTINE_CONTACT_LINE],
    footnotes: [],
    links: patterns.map((p) => ({ href: `/alerts/${p.id}`, label: `Open the pattern: ${p.title.toLowerCase()}` })),
    producedBy: PRODUCED_RULES,
  };
}

function escalate(state: ConversationState, d: DetectionResult): AssistantResponse {
  if (state.focusLevel === "uncertain") {
    return { ...uncertain("Escalation points cannot be set for this", C.escalate.uncertain_text, null), kind: "escalate" };
  }
  const streams = state.focusStreams.length ? state.focusStreams : d.streams.filter((s) => s.departing).map((s) => s.id);
  const patterns = patternsFor(streams, d);
  const isModerate = patterns.length > 0;
  const departing = departingIn(streams, d);
  const days = String(C.timeframe.days);

  const screenItems: BlockItem[] = questionBank.red_flag_screen.groups.flatMap((g) =>
    g.items.map((i) => ({ tag: g.title, text: i.prompt }))
  );

  return {
    kind: "escalate",
    level: isModerate ? "moderate" : "routine",
    tone: isModerate ? "investigate" : departing.length ? "monitor" : "normal",
    levelLabel: isModerate ? LEVEL_LABEL.moderate : departing.length ? "Routine · monitor" : LEVEL_LABEL.routine,
    headline: C.escalate.title,
    lead: [
      isModerate
        ? "Three tiers. Only the first rests on published criteria; the other two are general medical principle, and your flight surgeon may set different ones."
        : "Nothing here calls for escalation today. These are the points at which that changes.",
    ],
    basis: isModerate || departing.length
      ? { kind: "experimental", label: LAYER2_LABEL }
      : { kind: "none", label: "Both layers evaluated. Not a statement that you are well." },
    blocks: [
      {
        kind: "escalate_now",
        title: C.escalate.now_title,
        note: C.escalate.now_note,
        items: [...screenItems, ...C.escalate.measured.map((text) => ({ tag: "Measured", text }))],
      },
      {
        kind: "escalate_soon",
        title: C.escalate.soon_title,
        note: C.escalate.soon_note,
        items: (isModerate ? C.escalate.soon_items_moderate : C.escalate.soon_items_routine).map((text) => ({ text })),
      },
      {
        kind: "escalate_routine",
        title: C.escalate.routine_title,
        items: (isModerate ? C.escalate.routine_items_moderate : C.escalate.routine_items_routine).map((text) => ({
          text: text.replace("{days}", days),
        })),
      },
    ],
    protocols: [],
    mandatory: [isModerate ? MODERATE_LINE : ROUTINE_CONTACT_LINE],
    footnotes: [`${LAYER1_LABEL}. The safety-check wording and its sources are listed in Early Detection.`],
    links: [
      { href: "/check-in/daily", label: "Open the daily check-in and its safety check" },
      { href: "/alerts", label: "Open Early Detection for the criteria and sources" },
    ],
    producedBy: PRODUCED_RULES,
  };
}

function info(kind: "greeting" | "note", headline: string, text: string): AssistantResponse {
  return {
    kind,
    level: "info",
    tone: "neutral",
    levelLabel: LEVEL_LABEL.info,
    headline,
    lead: [text],
    basis: { kind: "none", label: "No health statement is made here" },
    blocks: [],
    protocols: [],
    mandatory: [],
    footnotes: [],
    links: [],
    producedBy: PRODUCED_RULES,
  };
}

/* ---------------------------------------------------------------- respond */

/**
 * One turn of the conversation. Red flags are decided first and return
 * before anything else is read.
 */
export function respond(
  turn: Turn,
  d: DetectionResult,
  state: ConversationState
): { response: AssistantResponse; state: ConversationState } {
  // ---- 1. RED FLAGS. Free text first, then Layer 1 from the data.
  const mentionedNow = turn.kind === "text" ? screenRedFlags(turn.text) : [];
  const flagged = uniq([...state.flagged, ...mentionedNow]);
  if (flagged.length || d.layer1Met.length) {
    const kind = turn.kind === "action" ? turn.action : "answer";
    return {
      response: serious(kind, mentionedNow, flagged, d),
      state: { flagged, focusStreams: [], focusLevel: "serious", askedQuestions: false },
    };
  }

  // ---- Quick actions answer about whatever the conversation is on.
  if (turn.kind === "action") {
    const response = turn.action === "why" ? why(state, d) : escalate(state, d);
    return { response, state: { ...state, askedQuestions: false } };
  }

  // ---- 2. Things the platform cannot interpret.
  const rule = matchUncertain(turn.text);
  if (rule) {
    return {
      response: uncertain(rule.headline, rule.reason, rule.say_if, rule.source_ids),
      state: { flagged, focusStreams: [], focusLevel: "uncertain", askedQuestions: false },
    };
  }

  // ---- 3. A topic the platform follows, or a question about overall status.
  let streams = matchTopics(turn.text);
  const status = isStatusQuestion(turn.text);
  const reported = streams.length > 0;
  if (!streams.length && status) streams = d.streams.filter((s) => s.departing).map((s) => s.id);

  if (streams.length || status) {
    const patterns = patternsFor(streams, d);
    if (patterns.length) {
      const m = moderate(patterns, d);
      return {
        response: m.response,
        state: { flagged, focusStreams: uniq([...streams, ...m.streams]), focusLevel: "moderate", askedQuestions: true },
      };
    }
    return {
      response: routine(streams, d, reported),
      state: { flagged, focusStreams: streams, focusLevel: "routine", askedQuestions: streams.length > 0 },
    };
  }

  if (isGreeting(turn.text)) {
    return { response: info("greeting", C.greeting.headline, C.greeting.text), state };
  }

  // ---- An answer to the follow-up questions: kept, not interpreted.
  if (state.askedQuestions && (state.focusLevel === "routine" || state.focusLevel === "moderate")) {
    return { response: info("note", C.note.headline, C.note.text), state };
  }

  // ---- 4. Anything else. The assistant does not guess.
  return {
    response: uncertain(C.unknown.headline, C.unknown.reason, "If any item in the safety check applies, act on it straight away, whatever your readings show."),
    state: { flagged, focusStreams: [], focusLevel: "uncertain", askedQuestions: false },
  };
}

/** Replay a list of turns. The same turns and the same data always give the same messages. */
export function runConversation(turns: Turn[], d: DetectionResult): { messages: Message[]; state: ConversationState } {
  let state = emptyState();
  const messages: Message[] = [];
  turns.forEach((turn, i) => {
    const out = respond(turn, d, state);
    state = out.state;
    messages.push({
      id: `u${i}`,
      role: "user",
      text: turn.kind === "text" ? turn.text : QUICK_ACTIONS.find((a) => a.id === turn.action)!.label,
      viaQuickAction: turn.kind === "action",
    });
    messages.push({ id: `a${i}`, role: "assistant", response: out.response });
  });
  return { messages, state };
}

/* ------------------------------------------------------------------- demo */

export interface DemoConversation {
  title: string;
  note: string;
  turns: Turn[];
}

/** The pre-built conversation for an astronaut, if one is defined. */
export function demoConversation(id: AstronautId): DemoConversation | null {
  const all = C.demo_conversations as unknown as Record<string, DemoConversation>;
  return all[id] ?? null;
}

export function suggestionsFor(id: AstronautId): string[] {
  return (C.suggestions as Record<string, string[]>)[id] ?? [];
}

/** The opening message. Says what the layers show before anything is asked. */
export function openingSummary(a: AstronautData, d: DetectionResult): string {
  const who = `Mission Day ${d.day}, astronaut ${a.id}.`;
  if (d.layer1Met.length) return `${who} A published red flag is met in your data. Ask anything and the protocol card will be shown first.`;
  if (d.patternsPresent.length)
    return `${who} No published red flag is met. The experimental rule sees ${d.patternsPresent.length === 1 ? "one pattern" : `${d.patternsPresent.length} patterns`}.`;
  if (d.loneSignals.length) return `${who} No published red flag is met. One or more signals are moving on their own.`;
  return `${who} No published red flag is met and the experimental rule sees no unfavourable direction. That is not a statement that you are well.`;
}

/** Every string in a response, for the language-rule checks. */
export function responseText(r: AssistantResponse): string {
  return [
    r.levelLabel,
    r.headline,
    ...r.lead,
    r.basis.label,
    ...r.blocks.flatMap((b) => [b.title, b.note ?? "", ...b.items.flatMap((i) => [i.tag ?? "", i.text])]),
    ...r.protocols.flatMap((p) => [
      p.title,
      p.followsLabel,
      p.followsNote,
      p.spaceflightGap,
      p.cannot,
      p.visitorNote ?? "",
      ...p.steps.map((s) => s.text),
      ...p.triggers.map((t) => `${t.title} ${t.detail}`),
    ]),
    ...r.mandatory,
    ...r.footnotes,
    ...r.links.map((l) => l.label),
    r.producedBy,
  ].join("\n");
}
