import Link from "next/link";
import { ArrowRight, CircleCheck, FlaskConical, ShieldAlert } from "lucide-react";
import { ExperimentalRuleNote, GlassSection, LayerOneLabel, LayerTwoLabel } from "@/components/health/Glass";
import { DOMAINS, type DetectionResult } from "@/lib/detection";

/**
 * Dashboard summary of both detection layers. The full view, with the drift
 * and combination charts, is the Early Detection page.
 */
export default function TwoLayerPanel({ detection }: { detection: DetectionResult }) {
  const anyL1 = detection.layer1Met.length > 0;
  const measured = detection.layer1.filter((c) => c.kind === "measured");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassSection
        eyebrow="Layer 1 · always evaluated first"
        title="Published red flag criteria"
        icon={ShieldAlert}
        className={anyL1 ? "!border-danger/70" : ""}
        right={<LayerOneLabel met={anyL1}>{anyL1 ? "Criteria met" : "None met"}</LayerOneLabel>}
      >
        <ul className="space-y-3">
          {DOMAINS.map((d) => {
            const list = detection.layer1.filter((c) => c.domain === d.id);
            const met = list.filter((c) => c.met);
            return (
              <li
                key={d.id}
                className={`rounded-xl border p-3 ${met.length ? "border-danger/60 bg-danger/[0.08]" : "border-accent/25 bg-canvas/50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{d.title}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      met.length ? "border-danger/70 bg-danger/25 text-danger" : "border-safe/50 bg-safe/10 text-safe"
                    }`}
                  >
                    {met.length ? `${met.length} MET` : "None met"}
                  </span>
                </div>
                {met.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {met.map((c) => (
                      <li key={c.id} className="text-xs text-ink">
                        <span className="font-semibold">{c.title}.</span> {c.valueAtEvaluation}.
                        <span className="mt-0.5 block font-medium text-danger">{c.basisLabel}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    {list.length} published criteria checked: {list.map((c) => c.title.toLowerCase()).join(", ")}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Latest measured values: {measured.map((c) => c.valueAtEvaluation).join("; ")}.
        </p>
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          “None met” is not a statement that you are well. Layer 1 overrides personal baselines and is never softened by them.
        </p>
      </GlassSection>

      <GlassSection
        eyebrow="Layer 2 · secondary"
        title="Pattern observations"
        icon={FlaskConical}
        right={<LayerTwoLabel />}
      >
        <ul className="space-y-2">
          {detection.patterns.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border p-3 ${p.present ? "border-dashed border-caution/70 bg-caution/[0.07]" : "border-accent/25 bg-canvas/50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{p.title}</p>
                <span className={`text-[11px] font-semibold ${p.present ? "text-caution" : "text-muted"}`}>
                  {p.present ? `Observed${p.observedSinceDay ? ` since MD ${p.observedSinceDay}` : ""}` : "Not observed"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {p.present
                  ? `Departing together: ${p.departingStreams.map((s) => s.label.toLowerCase()).join(", ")}.`
                  : `${p.anchor.label} with ${p.companions.map((c) => c.label.toLowerCase()).join(" or ")}: no combination.`}
              </p>
            </li>
          ))}
        </ul>
        {detection.loneSignals.length > 0 && (
          <p className="mt-3 text-xs text-ink/85">
            <span className="font-semibold text-warning">Departing on their own: </span>
            {detection.loneSignals.map((s) => s.label.toLowerCase()).join(", ")}.
          </p>
        )}
        <ExperimentalRuleNote className="mt-3" />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Direction over 14 days plus a combination of related signals. No percentage or size cut-off. It may be consistent
          with a change from your own usual pattern and is not a diagnosis.
        </p>
        <Link
          href="/alerts"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Open Early Detection
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </GlassSection>
    </div>
  );
}
