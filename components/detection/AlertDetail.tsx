"use client";

import Link from "next/link";
import { ArrowLeft, FlaskConical, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import {
  ExperimentalRuleNote,
  GlassSection,
  MeasurementBadge,
  PublishedBasisNote,
  StatusChip,
} from "@/components/health/Glass";
import CurrentAlertCard from "@/components/detection/CurrentAlertCard";
import CombinationPanel from "@/components/detection/CombinationPanel";
import WhyPanel from "@/components/detection/WhyPanel";
import SourceList from "@/components/detection/SourceList";
import { LAYER1_MEANING, LAYER2_MEANING } from "@/lib/detection";
import { useStore } from "@/lib/store";

const Back = () => (
  <Link href="/alerts" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-ink">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Early Detection
  </Link>
);

/**
 * One alert in detail: which layer it belongs to, what was observed, what it
 * was compared with, and on what basis.
 *   /alerts/current        the current alert
 *   /alerts/L1_...         one published red-flag criterion (Layer 1)
 *   /alerts/L2_...         one combination pattern (Layer 2)
 */
export default function AlertDetail({ alertId }: { alertId: string }) {
  const { detection } = useStore();
  if (!detection) return null;

  const criterion = detection.layer1.find((c) => c.id === alertId);
  const pattern = detection.patterns.find((p) => p.id === alertId);

  if (criterion) {
    return (
      <div className="animate-fade-up space-y-6 pb-4">
        <Back />
        <PageHeader
          icon={ShieldAlert}
          eyebrow={`Layer 1 · Published emergency red flag · ${criterion.domainTitle}`}
          title={criterion.title}
          description={`${criterion.description}.`}
          actions={<StatusChip status={criterion.met ? "act" : "normal"} />}
        />
        <GlassSection
          eyebrow="Status"
          title={criterion.met ? "This criterion is met" : "This criterion is not met"}
          className={criterion.met ? "!border-2 !border-danger" : ""}
        >
          <dl className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
              <dt className="text-xs font-semibold text-muted">What was observed</dt>
              <dd className="mt-1 text-sm text-ink">{criterion.valueAtEvaluation}.</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
              <dt className="text-xs font-semibold text-muted">What it was compared with</dt>
              <dd className="mt-1 text-sm text-ink">
                The published criterion itself: {criterion.description.toLowerCase()}. Your personal baseline is not part of
                this check.
              </dd>
            </div>
          </dl>
          <PublishedBasisNote label={criterion.basisLabel} className="mt-4" />
          <p className="mt-3 text-sm leading-relaxed text-ink/90">{LAYER1_MEANING}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/90">
            <span className="font-semibold">Evidence: </span>
            {criterion.evidence}. {criterion.sourceNote}
          </p>
          {criterion.spaceflightCaveat && (
            <p className="mt-2 text-sm leading-relaxed text-ink/90">
              <span className="font-semibold">In spaceflight: </span>
              {criterion.spaceflightCaveat}
            </p>
          )}
          {criterion.requiresClinicalReview && (
            <p className="mt-2 text-sm text-warning">The published basis for this criterion is not spaceflight-specific, or is not a validated criterion. It is flagged for clinical review.</p>
          )}
          <p className={`mt-4 rounded-xl border p-3 text-sm ${criterion.met ? "border-danger/50 bg-danger/[0.08] font-semibold text-ink" : "border-ink/10 bg-canvas/50 text-ink/90"}`}>
            {criterion.met ? criterion.action : `If this happens: ${criterion.action}`}
          </p>
          {!criterion.met && (
            <p className="mt-3 text-xs text-muted">“Not met” is not a statement that you are well.</p>
          )}
        </GlassSection>
        <SourceList onlyIds={criterion.sources.map((s) => s.id)} />
      </div>
    );
  }

  if (pattern) {
    const streamIds = [pattern.anchor.id, ...pattern.companions.map((c) => c.id)];
    const signals = [pattern.anchor, ...pattern.companions].flatMap((s) => s.signals);
    return (
      <div className="animate-fade-up space-y-6 pb-4">
        <Back />
        <PageHeader
          icon={FlaskConical}
          eyebrow="Layer 2 · Combination pattern"
          title={pattern.title}
          description={pattern.rule}
          actions={<StatusChip status={pattern.present ? "investigate" : "normal"} />}
        />
        <GlassSection
          eyebrow="Status"
          title={pattern.present ? "This pattern is observed" : "This pattern is not observed"}
          className={pattern.present ? "!border-2 !border-dashed !border-caution/70" : ""}
        >
          <ExperimentalRuleNote />
          {pattern.present && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              {pattern.statement}
              {pattern.observedSinceDay ? ` Observed since Mission Day ${pattern.observedSinceDay}.` : ""} This is not a
              diagnosis.
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink/90">{LAYER2_MEANING}</p>
          {detection.layer1Met.length > 0 && (
            <p className="mt-3 rounded-xl border border-danger/50 bg-danger/[0.08] p-3 text-sm text-ink">
              <span className="font-semibold text-danger">A Layer 1 red flag is met. </span>
              It takes priority over this pattern, whatever the pattern shows.
            </p>
          )}
          <h3 className="mt-5 text-sm font-semibold text-ink">What was observed, and what it was compared with</h3>
          <ul className="mt-2 space-y-2">
            {signals.map((s) => (
              <li key={s.id} className={`rounded-xl border p-3 ${s.departing ? "border-caution/50 bg-caution/[0.06]" : "border-ink/10 bg-canvas/50"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{s.label}</p>
                  <MeasurementBadge type={s.measurementType} />
                  <span className={`text-[11px] font-semibold ${s.departing ? "text-caution" : "text-muted"}`}>
                    {s.departing ? "Departing" : "Not departing"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink/85">{s.summary}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Compared with itself only: {s.window.n} values in the last 14 days against {s.reference.n} of your own
                  early-flight days.
                </p>
              </li>
            ))}
          </ul>
        </GlassSection>
        <CombinationPanel detection={detection} onlyStreams={streamIds} />
        <WhyPanel detection={detection} onlyStreams={streamIds} />
      </div>
    );
  }

  // "current" (or anything else): the current alert.
  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <Back />
      <h1 className="sr-only">Current alert</h1>
      <CurrentAlertCard detection={detection} />
      <WhyPanel detection={detection} />
    </div>
  );
}
