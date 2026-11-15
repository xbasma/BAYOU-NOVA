"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarOff,
  ClipboardList,
  FileCheck2,
  GitBranch,
  History,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { GlassSection, MeasurementBadge, SimulatedBadge } from "@/components/health/Glass";
import { COGNITIVE_LABEL } from "@/components/checkin/CognitiveTask";
import { FlightSurgeonNote, getInstruments, ValidatedInstrumentNote } from "@/components/checkin/InstrumentForm";
import { CORE_QUESTIONS, FOLLOW_UPS, INSTRUMENT_NOTE, reportedScreenItems, SCREEN_ITEM_IDS } from "@/lib/checkin";
import { currentMissionDay } from "@/lib/health";
import { answerLabel, getCheckin, loadReference, type Checkin } from "@/lib/health-data";
import { useStore } from "@/lib/store";

const primaryButton =
  "inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent";
const quietButton =
  "inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-4 py-2 text-sm font-semibold text-ink hover:border-accent";

function AnswerList({ checkin }: { checkin: Checkin }) {
  const followUps = FOLLOW_UPS.filter((q) =>
    q.id === "q_head_comfort"
      ? checkin.answers.q_head_comfort !== null
      : checkin.follow_ups?.[q.id as keyof NonNullable<Checkin["follow_ups"]>] !== undefined
  );
  const flagged = reportedScreenItems(checkin);
  return (
    <dl className="divide-y divide-ink/10 text-sm">
      {CORE_QUESTIONS.map((q) => (
        <div key={q.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
          <dt className="text-muted">{q.domain}</dt>
          <dd className="text-ink">{answerLabel(q.id, checkin.answers[q.id as keyof Checkin["answers"]])}</dd>
        </div>
      ))}
      {followUps.map((q) => (
        <div key={q.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
          <dt className="text-secondary">{q.domain} (follow-up)</dt>
          <dd className="text-ink">
            {answerLabel(
              q.id,
              q.id === "q_head_comfort"
                ? checkin.answers.q_head_comfort
                : (checkin.follow_ups?.[q.id as keyof NonNullable<Checkin["follow_ups"]>] ?? null)
            )}
          </dd>
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
        <dt className={flagged.length ? "font-semibold text-danger" : "text-muted"}>Safety check</dt>
        <dd className={flagged.length ? "font-semibold text-danger" : "text-ink"}>
          {flagged.length ? flagged.map((f) => f.prompt).join("; ") : "None of these"}
        </dd>
      </div>
      {checkin.free_text && (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
          <dt className="text-muted">Note</dt>
          <dd className="max-w-md text-right text-ink">“{checkin.free_text}”</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * Daily Check-In hub (Feature 3: Intelligent Daily Questions).
 * Four things live here: today's check-in, the cognitive observation, the two
 * validated questionnaires (available, never scheduled), and recent history.
 */
export default function CheckInHub() {
  const { data, overlay, hasSessionData, resetDemo } = useStore();
  const { questionBank, questionnaires } = loadReference();
  if (!data) return null;

  const day = currentMissionDay(data);
  const today = getCheckin(data, day);
  const fromSession = today?.source === "session";
  const recent = [...data.checkins].sort((a, b) => b.mission_day - a.mission_day).slice(0, 7);
  const lastCognitive = overlay.cognitive[overlay.cognitive.length - 1];

  return (
    <div className="space-y-6">
      {/* ---- Today's check-in ---- */}
      <GlassSection
        eyebrow={`Mission Day ${day}`}
        title="Today's check-in"
        icon={ClipboardList}
        right={<SimulatedBadge />}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-sm leading-relaxed text-ink/90">
              Six questions about how your day went, a couple of follow-ups if an answer sits below your own usual pattern,
              and a short safety check. About two minutes.
            </p>
            <p className="mt-3 text-sm text-ink/90">
              {fromSession
                ? "You completed today's check-in in this demo session. Both detection layers are using it."
                : "A seeded check-in is on file for today. Complete your own to see the questions adapt and both detection layers respond."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/check-in/daily" className={primaryButton}>
                {fromSession ? "Redo today's check-in" : "Start today's check-in"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {hasSessionData && (
                <button type="button" onClick={resetDemo} className={quietButton}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset demo session
                </button>
              )}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Anything you enter stays in this browser and replaces the seeded entry for this demo session only.
            </p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                On file for Mission Day {day} {fromSession ? "(yours)" : "(seeded)"}
              </h3>
              <MeasurementBadge type="self-reported" />
            </div>
            {today ? <AnswerList checkin={today} /> : <p className="text-sm text-muted">No check-in recorded.</p>}
          </div>
        </div>
      </GlassSection>

      {/* ---- How the questions work ---- */}
      <GlassSection eyebrow="Intelligent daily questions" title="How the questions work" icon={GitBranch}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Six indirect questions, every day</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{questionBank.design_note}</p>
            <ul className="mt-3 space-y-2">
              {CORE_QUESTIONS.map((q) => (
                <li key={q.id} className="rounded-xl border border-ink/10 bg-canvas/50 px-3 py-2">
                  <p className="text-xs font-semibold text-secondary">{q.domain}</p>
                  <p className="text-sm text-ink">{q.prompt}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Follow-ups, only when your own pattern shifts</h3>
            <ul className="mt-3 space-y-3">
              {questionBank.branches.map((b) => (
                <li key={b.id} className="rounded-xl border border-secondary/35 bg-secondary/[0.06] p-3">
                  <p className="text-sm font-semibold text-ink">
                    {b.title} <span className="font-normal text-muted">→ {b.follows_up_on.toLowerCase()}</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/85">{b.trigger_rule}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-xl border border-danger/35 bg-danger/[0.05] p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
                Safety check, every day
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink/85">
                {SCREEN_ITEM_IDS.length} published emergency warning signs across heart and breathing, head, vision and
                movement, and state of mind. Any one raises a Layer 1 red alert and is never compared with your baseline.
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">{INSTRUMENT_NOTE}</p>
          </div>
        </div>
      </GlassSection>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* ---- Cognitive observation ---- */}
        <GlassSection
          eyebrow="About 2 minutes"
          title="Stowage and panel check"
          icon={BrainCircuit}
          right={<MeasurementBadge type="functional indicator" />}
        >
          <p className="rounded-lg border border-dashed border-secondary/60 bg-secondary/[0.07] px-3 py-2 text-xs font-semibold leading-snug text-secondary">
            {COGNITIVE_LABEL}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/90">
            A short attention and memory task framed as two ordinary jobs: note where five items were stowed, then watch a
            stream of panel codes for repeats. It records counts only, with no pass mark and no interpretation.
          </p>
          <p className="mt-3 text-xs text-muted">
            {lastCognitive
              ? `Last run this session: ${lastCognitive.attention.hits} of ${lastCognitive.attention.targets} repeats caught, ${lastCognitive.memory.correct} of ${lastCognitive.memory.shown} items placed.`
              : "Not run in this demo session."}
          </p>
          <Link href="/check-in/cognitive" className={`${quietButton} mt-4`}>
            Open the task
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </GlassSection>

        {/* ---- Validated questionnaires ---- */}
        <GlassSection eyebrow="Available, never scheduled" title="Validated questionnaires" icon={FileCheck2}>
          <FlightSurgeonNote />
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <CalendarOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {questionnaires.scheduling_policy}
          </p>
          <ul className="mt-4 space-y-3">
            {getInstruments().map((q) => {
              const last = [...overlay.questionnaires].reverse().find((r) => r.instrument === q.id);
              return (
                <li key={q.id} className="rounded-xl border border-ink/10 bg-canvas/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {q.id} <span className="font-normal text-muted">· {q.items.length} items</span>
                    </p>
                    <Link href={`/check-in/${q.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-4 hover:underline">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{q.measures}.</p>
                  <ValidatedInstrumentNote label={q.label} className="mt-2" />
                  {last && (
                    <p className="mt-2 text-xs text-ink/85">
                      Completed this session on Mission Day {last.mission_day}: total {last.total} of {q.max_score}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </GlassSection>
      </div>

      {/* ---- Recent check-ins ---- */}
      <GlassSection eyebrow="Last 7 days" title="Recent check-ins" icon={History} right={<MeasurementBadge type="self-reported" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <caption className="sr-only">Check-in answers for the last seven mission days</caption>
            <thead>
              <tr className="border-b border-ink/15 text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Day</th>
                {CORE_QUESTIONS.map((q) => (
                  <th key={q.id} scope="col" className="py-2 pr-3 font-medium">
                    {q.domain}
                  </th>
                ))}
                <th scope="col" className="py-2 pr-3 font-medium">Headache (follow-up)</th>
                <th scope="col" className="py-2 font-medium">Safety check</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => {
                const flagged = reportedScreenItems(c);
                return (
                  <tr key={c.mission_day} className="border-b border-ink/10 align-top">
                    <th scope="row" className="whitespace-nowrap py-2 pr-3 font-semibold text-ink">
                      {c.mission_day}
                      {c.source === "session" && <span className="ml-1 font-normal text-accent">(yours)</span>}
                    </th>
                    {CORE_QUESTIONS.map((q) => (
                      <td key={q.id} className="py-2 pr-3 text-ink/85">
                        {answerLabel(q.id, c.answers[q.id as keyof Checkin["answers"]])}
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-ink/85">{answerLabel("q_head_comfort", c.answers.q_head_comfort)}</td>
                    <td className={`py-2 ${flagged.length ? "font-semibold text-danger" : "text-ink/85"}`}>
                      {flagged.length ? `${flagged.length} reported` : "None"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {questionBank.follow_ups.find((f) => f.id === "q_head_comfort")?.history_note}
        </p>
      </GlassSection>
    </div>
  );
}
