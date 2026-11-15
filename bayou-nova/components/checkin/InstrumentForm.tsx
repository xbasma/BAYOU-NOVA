"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarOff, FileCheck2, OctagonAlert, Stethoscope } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { GlassSection, MeasurementBadge, PublishedBasisNote } from "@/components/health/Glass";
import { sourceRef } from "@/lib/detection";
import { currentMissionDay } from "@/lib/health";
import { loadReference, type InstrumentId, type QuestionnaireResult } from "@/lib/health-data";
import { useStore } from "@/lib/store";

interface Instrument {
  id: InstrumentId;
  slug: string;
  name: string;
  measures: string;
  source_id: string;
  label: string;
  validated_in: string;
  stem: string;
  items: string[];
  max_score: number;
  score_bands: { min: number; max: number; label: string }[];
  bands_source: string;
  spaceflight_overlap_note: string;
  layer1_item: { item_index: number; criterion: string; note: string } | null;
}

export function getInstruments(): Instrument[] {
  return loadReference().questionnaires.instruments as unknown as Instrument[];
}

/** "Validated clinical instrument — <full citation>", shown wherever an instrument appears. */
export function ValidatedInstrumentNote({ label, className = "" }: { label: string; className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-secondary/45 bg-secondary/[0.07] px-3 py-2 text-xs font-semibold leading-snug text-secondary ${className}`}
    >
      <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

/** The required note, shown wherever a validated instrument appears. */
export function FlightSurgeonNote({ className = "" }: { className?: string }) {
  const { questionnaires } = loadReference();
  return (
    <p
      className={`flex items-start gap-2.5 rounded-xl border border-accent/50 bg-accent/[0.07] p-3 text-sm font-medium leading-relaxed text-ink ${className}`}
    >
      <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{questionnaires.required_note}</span>
    </p>
  );
}

/**
 * PHQ-9 or GAD-7, administered exactly as published.
 * Available on request only: the platform never schedules these, never
 * reminds, and never suggests a due date.
 */
export default function InstrumentForm({ slug }: { slug: string }) {
  const { questionnaires } = loadReference();
  const instrument = getInstruments().find((i) => i.slug === slug)!;
  const { data, detection, overlay, saveQuestionnaire } = useStore();
  const [scores, setScores] = useState<(number | undefined)[]>(() => Array(instrument.items.length).fill(undefined));
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [initiatedBy, setInitiatedBy] = useState<QuestionnaireResult["initiated_by"]>("self");
  const [result, setResult] = useState<QuestionnaireResult | null>(null);

  if (!data || !detection) return null;
  const day = currentMissionDay(data);
  const source = sourceRef(instrument.source_id);
  const complete = scores.every((s) => s !== undefined);
  const earlier = overlay.questionnaires.filter((q) => q.instrument === instrument.id && q.id !== result?.id);

  function submit() {
    if (!complete) return;
    const item_scores = scores as number[];
    const r: QuestionnaireResult = {
      id: `${instrument.slug}-${Date.now()}`,
      instrument: instrument.id,
      mission_day: day,
      item_scores,
      total: item_scores.reduce((s, x) => s + x, 0),
      difficulty,
      initiated_by: initiatedBy,
      completed_at: new Date().toISOString(),
    };
    saveQuestionnaire(r);
    setResult(r);
    window.scrollTo({ top: 0 });
  }

  const header = (
    <>
      <Link href="/check-in" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Daily Check-In
      </Link>
      <PageHeader
        icon={FileCheck2}
        eyebrow="Validated questionnaire · available on request"
        title={`${instrument.id} · ${instrument.name}`}
        description={`${instrument.measures}.`}
        actions={<MeasurementBadge type="self-reported" />}
      />
      <GlassSection>
        <ValidatedInstrumentNote label={instrument.label} />
        <FlightSurgeonNote className="mt-3" />
        <p className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-ink/90">
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold">Not scheduled. </span>
            BAYOU-NOVA did not ask you to complete this, will not remind you, and does not decide how often it should be
            done. That is for you and your flight surgeon.
          </span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Validated in: {instrument.validated_in}
          {!source.verified && " (Citation unverified.)"}
        </p>
      </GlassSection>
    </>
  );

  /* ------------------------------------------------------------ result */
  if (result) {
    const band = instrument.score_bands.find((b) => result.total >= b.min && result.total <= b.max);
    const l1 = instrument.layer1_item;
    const flagged = !!l1 && (result.item_scores[l1.item_index] ?? 0) >= 1;
    const criterion = l1 ? detection.layer1.find((c) => c.id === l1.criterion) : undefined;
    return (
      <div className="animate-fade-up mx-auto max-w-3xl space-y-6 pb-4">
        {header}

        {flagged && criterion && (
          <GlassSection
            eyebrow="Layer 1 · published red flag"
            title="Your answer to item 9 needs attention now"
            icon={OctagonAlert}
            className="!border-2 !border-danger"
          >
            <p className="text-sm leading-relaxed text-ink">
              You answered above “Not at all” to thoughts that you would be better off dead, or of hurting yourself. This is
              treated as a red flag whatever the total score is.
            </p>
            <p className="mt-3 text-sm font-semibold text-ink">{criterion.action}</p>
            <PublishedBasisNote label={criterion.basisLabel} className="mt-3" />
            {criterion.spaceflightCaveat && (
              <p className="mt-2 text-xs leading-relaxed text-muted">{criterion.spaceflightCaveat}</p>
            )}
          </GlassSection>
        )}

        <GlassSection eyebrow={`Completed on Mission Day ${result.mission_day}`} title="Your result">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-muted">Total score</p>
              <p className="font-display text-5xl font-bold leading-none text-ink" style={{ fontStretch: "122%" }}>
                {result.total}
                <span className="text-xl font-semibold text-muted"> / {instrument.max_score}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Published score band</p>
              <p className="mt-1 text-lg font-semibold text-ink">{band?.label ?? "Not banded"}</p>
            </div>
          </div>
          <ol className="mt-4 flex overflow-hidden rounded-full border border-ink/15" aria-label="Published score bands">
            {instrument.score_bands.map((b) => (
              <li
                key={b.label}
                style={{ flexGrow: b.max - b.min + 1 }}
                className={`basis-0 px-2 py-1.5 text-center text-[11px] ${
                  b === band ? "bg-ink font-semibold text-champagne" : "bg-white/50 text-muted"
                }`}
              >
                {b.label}
                <span className="block text-[10px] opacity-75">
                  {b.min} to {b.max}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
            <p>
              <span className="font-semibold">A score is not a diagnosis.</span> {instrument.bands_source} The platform adds
              no threshold of its own.
            </p>
            <p>{instrument.spaceflight_overlap_note}</p>
          </div>
          <FlightSurgeonNote className="mt-4" />
          <p className="mt-3 text-xs text-muted">
            Started by: {result.initiated_by === "self" ? "you" : "you, at your flight surgeon's request"}.
            {result.difficulty ? ` Difficulty item: ${result.difficulty}.` : ""} Stored in this browser only, for this demo
            session.
          </p>
        </GlassSection>

        <div className="flex flex-wrap gap-3">
          <Link href="/check-in" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent">
            Back to Daily Check-In
          </Link>
          <Link href="/alerts" className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent">
            Early Detection <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- form */
  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6 pb-4">
      {header}

      <GlassSection>
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Who asked for this?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["self", "My own choice"],
                ["flight_surgeon_request", "My flight surgeon asked me to"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                  initiatedBy === value ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/55 text-ink hover:border-accent/60"
                }`}
              >
                <input
                  type="radio"
                  name="initiated-by"
                  className="sr-only"
                  checked={initiatedBy === value}
                  onChange={() => setInitiatedBy(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <h2 className="mt-6 !text-lg">{instrument.stem}</h2>

        <ol className="mt-4 space-y-4">
          {instrument.items.map((item, i) => (
            <li key={i} className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
              <fieldset>
                <legend className="text-sm leading-relaxed text-ink">
                  <span className="mr-1.5 font-semibold tabular-nums text-muted">{i + 1}.</span>
                  {item}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {questionnaires.response_options.map((o) => {
                    const checked = scores[i] === o.score;
                    return (
                      <label
                        key={o.score}
                        className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                          checked ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/60 text-ink hover:border-accent/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`item-${i}`}
                          className="sr-only"
                          checked={checked}
                          onChange={() => setScores((s) => s.map((v, k) => (k === i ? o.score : v)))}
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <fieldset className="mt-5 rounded-xl border border-ink/10 bg-canvas/50 p-4">
          <legend className="sr-only">Difficulty</legend>
          <p className="text-sm leading-relaxed text-ink">{questionnaires.difficulty_item.prompt}</p>
          <p className="mt-0.5 text-xs text-muted">Optional. Not part of the score.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {questionnaires.difficulty_item.options.map((o) => (
              <label
                key={o}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-medium focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                  difficulty === o ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/60 text-ink hover:border-accent/60"
                }`}
              >
                <input type="radio" name="difficulty" className="sr-only" checked={difficulty === o} onChange={() => setDifficulty(o)} />
                {o}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
          <p className="text-xs text-muted" aria-live="polite">
            {scores.filter((s) => s !== undefined).length} of {instrument.items.length} answered
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!complete}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-champagne hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            See my result
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">{questionnaires.permission}</p>
      </GlassSection>

      {earlier.length > 0 && (
        <GlassSection eyebrow="This demo session" title={`Earlier ${instrument.id} results`}>
          <ul className="space-y-1.5 text-sm text-ink/90">
            {earlier.map((q) => (
              <li key={q.id}>
                Mission Day {q.mission_day}: total {q.total} of {instrument.max_score}
              </li>
            ))}
          </ul>
        </GlassSection>
      )}
    </div>
  );
}
