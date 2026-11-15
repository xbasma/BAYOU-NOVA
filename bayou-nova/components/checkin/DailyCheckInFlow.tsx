"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, CircleHelp, ClipboardCheck, OctagonAlert, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import OptionList from "@/components/checkin/OptionList";
import { ExperimentalRuleNote, GlassSection, MeasurementBadge, StatusChip } from "@/components/health/Glass";
import {
  buildCheckin,
  CORE_QUESTIONS,
  decideBranches,
  deriveIndices,
  SCREEN,
  type CoreAnswers,
  type CoreQuestionId,
  type FollowUpId,
  type Question,
} from "@/lib/checkin";
import { currentMissionDay } from "@/lib/health";
import { answerLabel, type Checkin } from "@/lib/health-data";
import { useStore } from "@/lib/store";

const REST_DAY = -1; // UI-only value for "rest day"; stored as null

type Step =
  | { kind: "core"; question: Question }
  | { kind: "followup"; question: Question; branchTitle: string; followsUpOn: string; reasons: string[] }
  | { kind: "safety" }
  | { kind: "review" };

/**
 * Intelligent Daily Questions.
 *   1. Six indirect, behaviour-framed questions (never symptom questions).
 *   2. Follow-ups only where an answer sits below your own usual pattern:
 *        sleep  -> concentration and headache experience
 *        social -> motivation and emotional state
 *   3. The safety check (published emergency warning signs), asked every day.
 * Saving feeds both detection layers immediately.
 */
export default function DailyCheckInFlow() {
  const { data, detection, saveCheckin } = useStore();
  const [core, setCore] = useState<Partial<Record<CoreQuestionId, number>>>({});
  const [followUps, setFollowUps] = useState<Partial<Record<FollowUpId, number>>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<Checkin | null>(null);

  const coreAnswers = useMemo(() => {
    const out: Partial<CoreAnswers> = {};
    for (const [k, v] of Object.entries(core)) {
      (out as Record<string, number | null>)[k] = v === REST_DAY ? null : v;
    }
    return out;
  }, [core]);

  const coreDone = CORE_QUESTIONS.every((q) => core[q.id as CoreQuestionId] !== undefined);

  // Branches are decided from the answers given so far, against the astronaut's own usual pattern.
  const branches = useMemo(
    () => (data && detection ? decideBranches(data, coreAnswers, detection) : []),
    [data, detection, coreAnswers]
  );
  const openBranches = coreDone ? branches.filter((b) => b.open) : [];

  const steps: Step[] = useMemo(() => {
    const s: Step[] = CORE_QUESTIONS.map((question) => ({ kind: "core", question }));
    for (const b of openBranches)
      for (const question of b.questions)
        s.push({ kind: "followup", question, branchTitle: b.title, followsUpOn: b.followsUpOn, reasons: b.reasons });
    s.push({ kind: "safety" }, { kind: "review" });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreDone, openBranches.map((b) => b.id).join(",")]);

  if (!data || !detection) return null;
  const day = currentMissionDay(data);
  const step = steps[Math.min(index, steps.length - 1)];

  const canContinue =
    step.kind === "core"
      ? core[step.question.id as CoreQuestionId] !== undefined
      : step.kind === "followup"
        ? followUps[step.question.id as FollowUpId] !== undefined
        : step.kind === "safety"
          ? noneSelected || selected.length > 0
          : true;

  function save() {
    if (!coreDone) return;
    const asked = new Set(openBranches.flatMap((b) => b.questions.map((q) => q.id)));
    const kept = Object.fromEntries(Object.entries(followUps).filter(([id]) => asked.has(id)));
    const checkin = buildCheckin({
      missionDay: day,
      core: coreAnswers as CoreAnswers,
      followUps: kept,
      branchesOpened: openBranches.map((b) => b.id),
      screen: Object.fromEntries(selected.map((id) => [id, true])),
      freeText,
      completedAt: new Date().toISOString(),
    });
    saveCheckin(checkin);
    setSaved(checkin);
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------------------------------------ result */
  if (saved) {
    const indices = deriveIndices(saved.answers);
    const l1 = detection.layer1Met;
    return (
      <div className="animate-fade-up mx-auto max-w-3xl space-y-6 pb-4">
        <PageHeader
          icon={CircleCheck}
          eyebrow={`Daily Check-In · Mission Day ${day}`}
          title="Check-in saved"
          description="Both detection layers were re-evaluated with what you reported."
        />

        <GlassSection
          eyebrow="Layer 1 · published red flags"
          title={l1.length ? "A red flag was raised from your safety check" : "No published red-flag criterion is met"}
          icon={ShieldAlert}
          className={l1.length ? "!border-2 !border-danger" : ""}
        >
          {l1.length ? (
            <>
              <ul className="space-y-1.5 text-sm text-ink">
                {l1.map((c) => (
                  <li key={c.id}>
                    <span className="font-semibold">{c.title}.</span> <span className="text-danger">{c.basisLabel}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold text-ink">{detection.alert.action}</p>
              <p className="mt-2 text-xs text-muted">
                The red banner now shows on every screen. Your baseline readings are not used to reassure.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink/90">
              Nothing in today&apos;s safety check or latest readings meets a published emergency criterion. That is not a
              statement that you are well: if something changes, report it straight away.
            </p>
          )}
        </GlassSection>

        <GlassSection
          eyebrow="Layer 2 · pattern observation"
          title="What the experimental rule sees now"
          right={<StatusChip status={detection.layer2Level} />}
        >
          <p className="text-sm leading-relaxed text-ink/90">
            {detection.patternsPresent.length
              ? `Observed: ${detection.patternsPresent.map((p) => p.title.toLowerCase()).join("; ")}.`
              : detection.loneSignals.length
                ? `Departing on their own: ${detection.loneSignals.map((s) => s.label.toLowerCase()).join(", ")}. No combination pattern.`
                : "No signal shows a consistent unfavourable direction."}{" "}
            One day&apos;s answers rarely change a 14-day direction, so this may look the same as before.
          </p>
          {l1.length > 0 && (
            <p className="mt-2 text-sm font-medium text-danger">
              This is not reassurance. The red flag above takes priority over anything shown here.
            </p>
          )}
          <ExperimentalRuleNote className="mt-3" />
        </GlassSection>

        <GlassSection eyebrow="Recorded today" title="What was derived from your answers">
          <dl className="grid grid-cols-3 gap-4">
            {[
              ["Concentration index", indices.concentration_index],
              ["Mood index", indices.mood_index],
              ["Social engagement", indices.social_engagement_index],
            ].map(([label, v]) => (
              <div key={label as string}>
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="mt-1 font-display text-xl font-bold text-ink">{(v as number).toFixed(1)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <MeasurementBadge type="behavioural inference" />
            <span>Arithmetic on your answers, on a 0 to 10 scale. Not PHQ-9 or GAD-7, and not a diagnosis.</span>
          </div>
          <p className="mt-3 text-xs text-muted">
            {saved.branches_opened?.length
              ? `Follow-up questions were asked today: ${saved.branches_opened.join(" and ")}.`
              : "No follow-up questions were needed today."}{" "}
            This check-in replaced the seeded Mission Day {day} entry for this demo session only.
          </p>
        </GlassSection>

        <div className="flex flex-wrap gap-3">
          <Link href="/alerts" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent">
            Open Early Detection <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/check-in" className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent">
            Back to Daily Check-In
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- flow */
  const coreIndex = CORE_QUESTIONS.findIndex((q) => step.kind === "core" && q.id === step.question.id);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6 pb-4">
      <Link href="/check-in" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Daily Check-In
      </Link>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow={`Mission Day ${day}`}
        title="Today's check-in"
        description="A few questions about your day. They ask how the day went, not about symptoms."
      />

      {/* Progress */}
      <div>
        <ol className="flex gap-1.5" aria-label="Progress">
          {steps.map((s, i) => (
            <li
              key={i}
              aria-current={i === index ? "step" : undefined}
              className={`h-1.5 flex-1 rounded-full ${
                i < index ? "bg-ink" : i === index ? "bg-ember" : s.kind === "followup" ? "bg-secondary/35" : "bg-ink/15"
              }`}
            >
              <span className="sr-only">
                Step {i + 1} of {steps.length}
                {i < index ? ", done" : ""}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {step.kind === "core"
            ? `Question ${coreIndex + 1} of ${CORE_QUESTIONS.length}`
            : step.kind === "followup"
              ? `Follow-up · ${step.branchTitle}`
              : step.kind === "safety"
                ? "Safety check"
                : "Review and save"}
        </p>
      </div>

      <GlassSection>
        {step.kind === "core" && (
          <>
            <p className="text-xs font-semibold text-secondary">{step.question.domain}</p>
            <h2 className="mt-1 !text-xl sm:!text-2xl" id="question-prompt">
              {step.question.prompt}
            </h2>
            <div className="mt-5">
              <OptionList
                name={step.question.id}
                legend={step.question.prompt}
                hideLegend
                value={core[step.question.id as CoreQuestionId]}
                onChange={(v) => setCore((c) => ({ ...c, [step.question.id]: v }))}
                options={[
                  ...step.question.options,
                  ...(step.question.rest_day_option ? [{ value: REST_DAY, label: step.question.rest_day_option }] : []),
                ]}
              />
            </div>
            <p className="mt-4 text-xs text-muted">
              Indirect question{step.question.proxy_for ? `: ${step.question.proxy_for.toLowerCase()}` : ""}. Your answer is
              compared only with your own earlier answers.
            </p>
          </>
        )}

        {step.kind === "followup" && (
          <>
            <p className="text-xs font-semibold text-secondary">Follow-up · {step.question.domain}</p>
            <h2 className="mt-1 !text-xl sm:!text-2xl">{step.question.prompt}</h2>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-secondary/40 bg-secondary/[0.07] p-3 text-xs leading-relaxed text-ink/85">
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              <div>
                <p className="font-semibold text-secondary">Why am I being asked this?</p>
                {step.reasons.map((r) => (
                  <p key={r}>{r}</p>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <OptionList
                name={step.question.id}
                legend={step.question.prompt}
                hideLegend
                value={followUps[step.question.id as FollowUpId]}
                onChange={(v) => setFollowUps((f) => ({ ...f, [step.question.id]: v }))}
                options={step.question.options.map((o) =>
                  o.value === step.question.red_flag_value
                    ? { ...o, note: "Treated as a published red flag (Layer 1), not compared with your baseline" }
                    : o
                )}
              />
            </div>
          </>
        )}

        {step.kind === "safety" && (
          <>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Layer 1 · published emergency warning signs
            </p>
            <h2 className="mt-1 !text-xl sm:!text-2xl">{SCREEN.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/90">{SCREEN.intro}</p>

            <div className="mt-5 space-y-5">
              {SCREEN.groups.map((g) => (
                <fieldset key={g.domain}>
                  <legend className="text-sm font-semibold text-ink">{g.title}</legend>
                  <div className="mt-2 space-y-2">
                    {g.items.map((item) => {
                      const checked = selected.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                            checked ? "border-danger bg-danger/[0.1] text-ink" : "border-ink/15 bg-white/55 text-ink hover:border-danger/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#B3261E]"
                            checked={checked}
                            onChange={(e) => {
                              setNoneSelected(false);
                              setSelected((s) => (e.target.checked ? [...s, item.id] : s.filter((x) => x !== item.id)));
                            }}
                          />
                          <span>{item.prompt}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                  noneSelected ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/55 text-ink hover:border-accent/60"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[#F06018]"
                  checked={noneSelected}
                  onChange={(e) => {
                    setNoneSelected(e.target.checked);
                    if (e.target.checked) setSelected([]);
                  }}
                />
                {SCREEN.none_label}
              </label>
            </div>

            {selected.length > 0 && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/50 bg-danger/[0.08] p-3 text-sm text-ink">
                <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <span>
                  Saving this will raise a red alert. If this is happening now, do not wait for the check-in: contact your
                  flight surgeon or crew medical officer, following your mission medical procedures.
                </span>
              </p>
            )}
          </>
        )}

        {step.kind === "review" && (
          <>
            <h2 className="!text-xl sm:!text-2xl">Anything else about today?</h2>
            <label className="mt-3 block text-sm text-muted" htmlFor="free-text">
              Optional note. Notes are stored as written and are not scanned for warning signs, so use the safety check for
              those.
            </label>
            <textarea
              id="free-text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              maxLength={400}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/70 p-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="For example: woke twice, hard to settle again"
            />

            <h3 className="mt-5 text-sm font-semibold text-ink">Your answers</h3>
            <dl className="mt-2 divide-y divide-ink/10 text-sm">
              {CORE_QUESTIONS.map((q) => (
                <div key={q.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                  <dt className="text-muted">{q.domain}</dt>
                  <dd className="text-ink">{answerLabel(q.id, coreAnswers[q.id as CoreQuestionId] ?? null)}</dd>
                </div>
              ))}
              {openBranches
                .flatMap((b) => b.questions)
                .map((q) => (
                  <div key={q.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                    <dt className="text-secondary">{q.domain} (follow-up)</dt>
                    <dd className="text-ink">{answerLabel(q.id, followUps[q.id as FollowUpId] ?? null)}</dd>
                  </div>
                ))}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                <dt className={selected.length ? "font-semibold text-danger" : "text-muted"}>Safety check</dt>
                <dd className={selected.length ? "font-semibold text-danger" : "text-ink"}>
                  {selected.length ? `${selected.length} item${selected.length === 1 ? "" : "s"} selected` : "None of these"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Mission Day {day} already has a seeded check-in. Saving replaces it for this demo session only; nothing leaves
              this browser.
            </p>
          </>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {step.kind === "review" ? (
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-champagne hover:bg-accent"
            >
              Save check-in
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={!canContinue}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-champagne hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </GlassSection>
    </div>
  );
}
