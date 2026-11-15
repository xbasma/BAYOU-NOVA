"use client";

import { Compass, Flag, Hourglass, Info, Lightbulb } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { ClaimList } from "@/components/learn/SourceTags";
import { currentMissionDay } from "@/lib/health";
import {
  currentPhase,
  PHASES,
  PHASES_CONVENTION_NOTE,
  PHASES_INTRO,
  phaseRelation,
  phaseTitle,
} from "@/lib/learn";
import { useStore } from "@/lib/store";

const RELATION_LABEL = { past: "Behind you", current: "You are here", upcoming: "Ahead" } as const;

/**
 * By Mission Phase: a current-phase banner, the prevention tips that matter in
 * that phase, and an awareness section for what changes over time and what
 * comes next. Phase boundaries are a platform convention and the page says so.
 */
export default function MissionPhasePanel() {
  const { data, activeId } = useStore();
  if (!data) return null;

  const day = currentMissionDay(data);
  const phaseId = currentPhase(day);
  const current = PHASES.find((p) => p.id === phaseId)!;
  const others = PHASES.filter((p) => p.id !== phaseId);

  return (
    <>
      <section
        aria-labelledby="phase-banner-title"
        className="glass-panel relative overflow-hidden !border-2 !border-accent/60 p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px_6px_6px_6px] bg-ink text-champagne"
              aria-hidden="true"
            >
              <Compass className="h-7 w-7" />
            </span>
            <div>
              <p className="label-mono">Current mission phase</p>
              <h2 id="phase-banner-title" className="mt-1 !text-xl sm:!text-2xl">
                {current.title}
              </h2>
              <p className="mt-1 text-sm text-ink/85">{current.when}</p>
            </div>
          </div>
          <dl className="text-right text-xs">
            <div className="flex justify-end gap-2">
              <dt className="text-muted">Mission day</dt>
              <dd className="font-semibold text-ink">{day}</dd>
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <dt className="text-muted">Demonstration astronaut</dt>
              <dd className="font-semibold text-ink">{activeId}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink">{current.summary}</p>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{PHASES_CONVENTION_NOTE}</span>
        </p>
      </section>

      <GlassPanel eyebrow="The whole mission" title="Where each phase sits" icon={Flag}>
        <p className="mb-4 max-w-3xl text-sm text-ink/85">{PHASES_INTRO}</p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((p) => {
            const rel = phaseRelation(p.id, phaseId);
            return (
              <li
                key={p.id}
                aria-current={rel === "current" ? "step" : undefined}
                className={`rounded-xl border p-3 text-sm ${
                  rel === "current" ? "border-accent bg-accent/10" : "border-ink/10 bg-canvas/50"
                }`}
              >
                <p className={`text-[11px] font-semibold ${rel === "current" ? "text-accent" : "text-muted"}`}>
                  {RELATION_LABEL[rel]}
                </p>
                <p className="mt-0.5 font-semibold text-ink">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">{p.when}</p>
              </li>
            );
          })}
        </ol>
      </GlassPanel>

      <GlassPanel eyebrow={`Relevant now · ${current.title}`} title="Prevention tips for this phase" icon={Lightbulb}>
        <ClaimList claims={current.tips} />
      </GlassPanel>

      {current.awareness.length > 0 && (
        <GlassPanel eyebrow="Mission phase awareness" title={`What tends to change during ${phaseTitle(phaseId).toLowerCase()}`} icon={Hourglass}>
          <ClaimList claims={current.awareness} />
        </GlassPanel>
      )}

      <GlassPanel eyebrow="Mission phase awareness" title="The other phases" icon={Flag}>
        <p className="mb-3 max-w-3xl text-sm text-ink/85">
          Open a phase to read what a published source says about it. You are not in these phases now.
        </p>
        <div className="space-y-3">
          {others.map((p) => (
            <details key={p.id} className="group rounded-xl border border-ink/10 bg-canvas/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {p.title} <span className="font-normal text-muted">· {RELATION_LABEL[phaseRelation(p.id, phaseId)]}</span>
              </summary>
              <p className="mt-2 text-sm text-ink/85">{p.summary}</p>
              <div className="mt-3">
                <ClaimList claims={[...p.tips, ...p.awareness]} />
              </div>
            </details>
          ))}
        </div>
      </GlassPanel>
    </>
  );
}
