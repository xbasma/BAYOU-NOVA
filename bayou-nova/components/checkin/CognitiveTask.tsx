"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, Package, Radio, Timer } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { GlassSection, MeasurementBadge } from "@/components/health/Glass";
import { sourceRef } from "@/lib/detection";
import { currentMissionDay } from "@/lib/health";
import type { CognitiveResult } from "@/lib/health-data";
import { useStore } from "@/lib/store";

/** The label that must accompany this task wherever it appears. */
export const COGNITIVE_LABEL =
  "Structured cognitive observation — not a validated neuropsychological assessment";

/* Timing: 20 s + 60 s + 40 s = 2 minutes. */
const MEMORISE_SECONDS = 20;
const TRIAL_MS = 1500; // one code every 1.5 s
const SHOWN_MS = 1100; // visible for 1.1 s, then a short blank
const TRIALS = 40; // 40 x 1.5 s = 60 s
const TARGETS = 10; // repeats of the previous code
const RECALL_SECONDS = 40;

const ITEMS = ["Torque wrench", "Sample bags", "Spare filter", "Camera lens", "Water valve kit", "Cable ties", "Headset", "Battery pack"];
const LOCATIONS = ["Locker A1", "Locker B2", "Deck 3 rack", "Airlock bin", "Galley drawer", "Lab bench"];
const LETTERS = ["A", "C", "E", "H", "K", "R"];
const DIGITS = ["2", "4", "5", "7", "9"];

type Phase = "intro" | "memorise" | "attention" | "recall" | "result";
interface Pair {
  item: string;
  location: string;
  choices: string[];
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePairs(): Pair[] {
  const items = shuffle(ITEMS).slice(0, 5);
  return items.map((item) => {
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const others = shuffle(LOCATIONS.filter((l) => l !== location)).slice(0, 3);
    return { item, location, choices: shuffle([location, ...others]) };
  });
}

/** A stream of panel codes in which exactly TARGETS codes repeat the one before. */
function makeSequence(): { code: string; target: boolean }[] {
  const targetSlots = new Set<number>();
  while (targetSlots.size < TARGETS) {
    const i = 1 + Math.floor(Math.random() * (TRIALS - 1));
    if (!targetSlots.has(i - 1) && !targetSlots.has(i + 1)) targetSlots.add(i);
  }
  const randomCode = () =>
    LETTERS[Math.floor(Math.random() * LETTERS.length)] + DIGITS[Math.floor(Math.random() * DIGITS.length)];
  const out: { code: string; target: boolean }[] = [];
  for (let i = 0; i < TRIALS; i++) {
    if (targetSlots.has(i)) {
      out.push({ code: out[i - 1].code, target: true });
    } else {
      let code = randomCode();
      while (i > 0 && code === out[i - 1].code) code = randomCode();
      out.push({ code, target: false });
    }
  }
  return out;
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

function Countdown({ seconds, label }: { seconds: number; label: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs font-semibold tabular-nums text-ink">
      <Timer className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      {seconds}s
    </p>
  );
}

/**
 * Two-minute attention and memory task, framed as two ordinary jobs:
 * noting where stowed items went, then watching a stream of panel codes.
 *
 * It records raw counts only. There are no norms, no pass mark and no
 * comparison with other people, and neither detection layer uses it.
 */
export default function CognitiveTask() {
  const { data, overlay, saveCognitive } = useStore();
  const [phase, setPhase] = useState<Phase>("intro");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [sequence, setSequence] = useState<{ code: string; target: boolean }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [trial, setTrial] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [pressedFlash, setPressedFlash] = useState(false);
  const [recall, setRecall] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CognitiveResult | null>(null);

  // Timing-sensitive values live in refs so a key press never waits for a render.
  const trialRef = useRef(-1);
  const onsetRef = useRef(0);
  const respondedRef = useRef<Set<number>>(new Set());
  const hitTimesRef = useRef<number[]>([]);
  const falseAlarmsRef = useRef(0);
  const sequenceRef = useRef<{ code: string; target: boolean }[]>([]);
  const day = data ? currentMissionDay(data) : 0;

  /* ---------------------------------------------------------- memorise */
  function start() {
    const seq = makeSequence();
    sequenceRef.current = seq;
    setSequence(seq);
    setPairs(makePairs());
    setRecall({});
    respondedRef.current = new Set();
    hitTimesRef.current = [];
    falseAlarmsRef.current = 0;
    trialRef.current = -1;
    setTrial(-1);
    setSecondsLeft(MEMORISE_SECONDS);
    setPhase("memorise");
  }

  // One-second countdown for the timed phases; moves on at zero.
  useEffect(() => {
    if (phase !== "memorise" && phase !== "recall") return;
    if (secondsLeft <= 0) {
      if (phase === "memorise") setPhase("attention");
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, secondsLeft]);

  /* --------------------------------------------------------- attention */
  useEffect(() => {
    if (phase !== "attention") return;
    let i = -1;
    let blank: number | undefined;
    const next = () => {
      i += 1;
      if (i >= TRIALS) {
        window.clearInterval(timer);
        setVisible(false);
        setSecondsLeft(RECALL_SECONDS);
        setPhase("recall");
        return;
      }
      trialRef.current = i;
      onsetRef.current = performance.now();
      setTrial(i);
      setVisible(true);
      blank = window.setTimeout(() => setVisible(false), SHOWN_MS);
    };
    next();
    const timer = window.setInterval(next, TRIAL_MS);
    return () => {
      window.clearInterval(timer);
      if (blank) window.clearTimeout(blank);
    };
  }, [phase]);

  const respond = useCallback(() => {
    const i = trialRef.current;
    if (i < 0 || respondedRef.current.has(i)) return; // one response per code
    respondedRef.current.add(i);
    if (sequenceRef.current[i]?.target) hitTimesRef.current.push(performance.now() - onsetRef.current);
    else falseAlarmsRef.current += 1;
    setPressedFlash(true);
    window.setTimeout(() => setPressedFlash(false), 160);
  }, []);

  useEffect(() => {
    if (phase !== "attention") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        respond();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, respond]);

  /* ------------------------------------------------------------ recall */
  const finish = useCallback(() => {
    const hits = hitTimesRef.current.length;
    const correct = pairs.filter((p) => recall[p.item] === p.location).length;
    const answered = pairs.filter((p) => recall[p.item] !== undefined).length;
    const r: CognitiveResult = {
      id: `cog-${Date.now()}`,
      mission_day: day,
      completed_at: new Date().toISOString(),
      attention: {
        targets: TARGETS,
        hits,
        misses: TARGETS - hits,
        false_alarms: falseAlarmsRef.current,
        median_response_ms: medianOf(hitTimesRef.current),
      },
      memory: { shown: pairs.length, correct, wrong_picks: answered - correct },
    };
    saveCognitive(r);
    setResult(r);
    setPhase("result");
  }, [pairs, recall, day, saveCognitive]);

  // Recall ends by itself when the time runs out.
  useEffect(() => {
    if (phase === "recall" && secondsLeft <= 0) finish();
  }, [phase, secondsLeft, finish]);

  if (!data) return null;
  const cognition = sourceRef("basner2015_cognition");
  const earlier = overlay.cognitive.filter((c) => c.id !== result?.id);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6 pb-4">
      <Link href="/check-in" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Daily Check-In
      </Link>
      <PageHeader
        icon={BrainCircuit}
        eyebrow={`Mission Day ${day} · about 2 minutes`}
        title="Stowage and panel check"
        description="Two short jobs: note where five items were stowed, then watch a stream of panel codes."
        actions={<MeasurementBadge type="functional indicator" />}
      />

      <p className="rounded-xl border border-dashed border-secondary/60 bg-secondary/[0.07] px-4 py-3 text-sm font-semibold leading-snug text-secondary">
        {COGNITIVE_LABEL}
      </p>

      {phase === "intro" && (
        <GlassSection title="How it works">
          <ol className="space-y-3 text-sm leading-relaxed text-ink/90">
            <li className="flex gap-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">Stowage list, {MEMORISE_SECONDS} seconds.</span> Five items and where
                each one went. Take them in; you will be asked about them at the end.
              </span>
            </li>
            <li className="flex gap-3">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">Panel codes, 60 seconds.</span> Codes such as K7 appear one at a time.
                Press the button, or the space bar, whenever a code is the same as the one just before it.
              </span>
            </li>
            <li className="flex gap-3">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">Back to the stowage list, up to {RECALL_SECONDS} seconds.</span> Say
                where each item went.
              </span>
            </li>
          </ol>
          <div className="mt-5 rounded-xl border border-ink/10 bg-canvas/50 p-4 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-ink/80">What this is, and is not</p>
            <p className="mt-1">
              It records counts: repeats caught, extra presses, a typical response time, items placed correctly. There is no
              pass mark, no comparison with other people and no interpretation. Results improve with practice and vary with
              the device you use. Neither detection layer uses them.
            </p>
            <p className="mt-1">
              The validated cognitive battery for spaceflight is NASA&apos;s Cognition ({cognition.short}). This task is not
              that battery and is not a substitute for it.
            </p>
          </div>
          <button
            type="button"
            onClick={start}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent"
          >
            Start
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </GlassSection>
      )}

      {phase === "memorise" && (
        <GlassSection
          eyebrow="Part 1 of 3"
          title="Today's stowage changes"
          icon={Package}
          right={<Countdown seconds={secondsLeft} label="Time left" />}
        >
          <ul className="divide-y divide-ink/10">
            {pairs.map((p) => (
              <li key={p.item} className="flex items-center justify-between gap-4 py-3">
                <span className="text-base font-medium text-ink">{p.item}</span>
                <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-champagne">{p.location}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPhase("attention")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            I have them, continue
          </button>
        </GlassSection>
      )}

      {phase === "attention" && (
        <GlassSection
          eyebrow="Part 2 of 3"
          title="Panel codes"
          icon={Radio}
          right={<Countdown seconds={Math.max(0, Math.ceil(((TRIALS - Math.max(trial, 0)) * TRIAL_MS) / 1000))} label="Time left" />}
        >
          <p className="text-sm text-ink/90">Press when a code is the same as the one just before it.</p>
          <div
            className="mt-4 flex h-44 items-center justify-center rounded-[28px_8px_8px_8px] bg-ink"
            aria-live="off"
          >
            <span
              className="font-display text-7xl font-bold tracking-wide text-champagne"
              style={{ fontStretch: "125%", opacity: visible ? 1 : 0 }}
            >
              {sequence[Math.max(trial, 0)]?.code ?? ""}
            </span>
          </div>
          <button
            type="button"
            onClick={respond}
            className={`mt-4 w-full rounded-2xl border-2 px-5 py-5 text-base font-semibold transition-colors ${
              pressedFlash ? "border-ember bg-ember text-white" : "border-ink bg-white/70 text-ink hover:bg-white"
            }`}
          >
            Same as the last one
            <span className="mt-0.5 block text-xs font-normal opacity-70">or press the space bar</span>
          </button>
        </GlassSection>
      )}

      {phase === "recall" && (
        <GlassSection
          eyebrow="Part 3 of 3"
          title="Where did each item go?"
          icon={Package}
          right={<Countdown seconds={secondsLeft} label="Time left" />}
        >
          <div className="space-y-4">
            {pairs.map((p) => (
              <fieldset key={p.item}>
                <legend className="text-sm font-semibold text-ink">{p.item}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {p.choices.map((c) => {
                    const checked = recall[p.item] === c;
                    return (
                      <label
                        key={c}
                        className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-medium focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                          checked ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/60 text-ink hover:border-accent/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`recall-${p.item}`}
                          className="sr-only"
                          checked={checked}
                          onChange={() => setRecall((r) => ({ ...r, [p.item]: c }))}
                        />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent"
          >
            Done
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </GlassSection>
      )}

      {phase === "result" && result && (
        <>
          <GlassSection eyebrow={`Recorded on Mission Day ${result.mission_day}`} title="What was observed">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <div>
                <dt className="text-[11px] text-muted">Repeats caught</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-ink">
                  {result.attention.hits}
                  <span className="text-sm font-semibold text-muted"> of {result.attention.targets}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Extra presses</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-ink">{result.attention.false_alarms}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Typical response</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-ink">
                  {result.attention.median_response_ms ?? "n/a"}
                  {result.attention.median_response_ms !== null && <span className="text-sm font-semibold text-muted"> ms</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Items placed correctly</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-ink">
                  {result.memory.correct}
                  <span className="text-sm font-semibold text-muted"> of {result.memory.shown}</span>
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-relaxed text-ink/90">
              These are counts from one two-minute task on this device. They are not a score, they are not compared with
              anyone else, and the platform draws no conclusion from them. If today felt harder than usual, that is worth
              mentioning to your flight surgeon whatever these numbers show.
            </p>
            <p className="mt-3 rounded-xl border border-dashed border-secondary/60 bg-secondary/[0.07] px-3 py-2 text-xs font-semibold text-secondary">
              {COGNITIVE_LABEL}
            </p>
            <p className="mt-3 text-xs text-muted">
              Typical response is the median time for the repeats you caught. Stored in this browser only, for this demo
              session. Not used by Layer 1 or Layer 2.
            </p>
          </GlassSection>

          {earlier.length > 0 && (
            <GlassSection eyebrow="This demo session" title="Your earlier observations">
              <ul className="space-y-1.5 text-sm text-ink/90">
                {earlier.map((c) => (
                  <li key={c.id}>
                    Mission Day {c.mission_day}: {c.attention.hits} of {c.attention.targets} repeats, {c.attention.false_alarms}{" "}
                    extra presses, {c.memory.correct} of {c.memory.shown} items
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Expect later runs to look better: practice alone does that.</p>
            </GlassSection>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/check-in" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-champagne hover:bg-accent">
              Back to Daily Check-In
            </Link>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPhase("intro");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
            >
              Run it again
            </button>
          </div>
        </>
      )}
    </div>
  );
}
