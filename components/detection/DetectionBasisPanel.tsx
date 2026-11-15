import Link from "next/link";
import { FlaskConical, ScrollText, ShieldAlert } from "lucide-react";
import { ExperimentalRuleNote, GlassSection, LayerOneLabel } from "@/components/health/Glass";
import {
  DETECTION_METHOD,
  DOMAINS,
  LAYER1_LABEL,
  sourceRef,
  type DetectionResult,
  type Layer1Result,
} from "@/lib/detection";
import { loadReference } from "@/lib/health-data";

/** One Layer 1 criterion: what it is, whether it is met, and its published basis. */
export function CriterionRow({ c, expanded = false }: { c: Layer1Result; expanded?: boolean }) {
  return (
    <li className={`rounded-xl border p-3 ${c.met ? "border-danger/60 bg-danger/[0.08]" : "border-ink/10 bg-canvas/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            <Link href={`/alerts/${c.id}`} className="underline-offset-4 hover:text-accent hover:underline">
              {c.title}
            </Link>
          </p>
          <p data-keep className="mt-0.5 text-xs text-muted">{c.valueAtEvaluation}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            c.met ? "border-danger/70 bg-danger/25 text-danger" : "border-ink/15 text-muted"
          }`}
        >
          {c.met ? "MET" : "Not met"}
        </span>
      </div>
      <p className={`mt-1.5 text-[11px] leading-relaxed ${c.met ? "font-medium text-danger" : "text-accent"}`}>{c.basisLabel}</p>
      {(expanded || c.met) && (
        <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink/85">
          <p>{c.description}.</p>
          <p data-keep className="text-muted">
            Evidence: {c.evidence}. {c.sourceNote}
          </p>
          {c.spaceflightCaveat && <p data-keep className="text-muted">In spaceflight: {c.spaceflightCaveat}</p>}
        </div>
      )}
      {c.previouslyReportedDay !== null && !c.met && (
        <p className="mt-1.5 text-[11px] text-warning">Reported earlier, on Mission Day {c.previouslyReportedDay}.</p>
      )}
      {c.requiresClinicalReview && (
        <p data-keep className="mt-1.5 text-[11px] text-muted">Published basis is not spaceflight-specific or not a validated criterion: flagged for clinical review.</p>
      )}
    </li>
  );
}

/**
 * Detection basis. Says, for both layers, exactly what is being checked and
 * on what authority: published criteria with their sources (Layer 1) and the
 * platform's own experimental rule with its parameters (Layer 2).
 */
export default function DetectionBasisPanel({ detection }: { detection: DetectionResult }) {
  const { detectionRules, sourcesFile } = loadReference();
  const m = DETECTION_METHOD;
  const methodSources = m.source_ids.map(sourceRef);
  const anyMet = detection.layer1Met.length > 0;

  return (
    <div className="space-y-6">
      <GlassSection
        id="layer-1"
        eyebrow="Layer 1 · always evaluated first"
        title="Published emergency red flags"
        icon={ShieldAlert}
        className={anyMet ? "!border-danger/70" : ""}
        right={
          <LayerOneLabel met={anyMet}>
            {anyMet ? `${detection.layer1Met.length} met` : `None of ${detection.layer1.length} met`}
          </LayerOneLabel>
        }
      >
        <p className="max-w-3xl text-sm leading-relaxed text-ink/90">
          Each criterion below comes from a published source and is checked on the value or symptom itself. Your personal
          baseline is never consulted, so a baseline that looks normal cannot soften a red flag. Any one of them raises a
          red alert.
        </p>
        <div className="mt-4 grid items-start gap-5 xl:grid-cols-3">
          {DOMAINS.map((d) => {
            const list = detection.layer1.filter((c) => c.domain === d.id);
            return (
              <div key={d.id}>
                <h3 className="text-sm font-semibold text-ink">{d.title}</h3>
                <ul className="mt-2 space-y-2">
                  {list.map((c) => (
                    <CriterionRow key={c.id} c={c} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
          <p>
            “Not met” is not a statement that you are well. Symptom criteria are read from your latest daily check-in (Mission
            Day {detection.latestCheckinDay ?? "none"}); measured criteria from your latest reading.
          </p>
          <p>
            Label used on every Layer 1 alert: <span className="font-semibold text-accent">“{LAYER1_LABEL} — [source]”</span>.
            These sources were written for people on Earth and have not been validated in spaceflight.
          </p>
          <p className="text-warning">{sourcesFile.clinical_review_status}</p>
        </div>
      </GlassSection>

      <GlassSection
        id="layer-2"
        eyebrow="Layer 2 · secondary, experimental"
        title="How the pattern rule decides"
        icon={FlaskConical}
      >
        <ExperimentalRuleNote />
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/90">{m.summary}</p>

        <ol className="mt-4 grid items-start gap-3 lg:grid-cols-3">
          {[
            {
              n: 1,
              title: `Direction inside the last ${m.window_days} days (drift)`,
              text: m.drift_test,
            },
            {
              n: 2,
              title: "Level against your own early flight (shift)",
              text: m.shift_test,
            },
            {
              n: 3,
              title: "Combination of related signals",
              text: "One departing signal alone is only Monitor. An alert (Investigate) needs a pattern: one stream and at least one related stream departing together.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-3 rounded-xl border border-ink/10 bg-canvas/50 p-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-champagne"
                aria-hidden="true"
              >
                {s.n}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink">
          <ScrollText className="h-4 w-4 text-accent" aria-hidden="true" />
          Every parameter, stated
        </h3>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted">Observation window</dt>
            <dd className="text-ink">{m.window_days} days (at least {m.min_points_in_window} values)</dd>
          </div>
          <div>
            <dt className="text-muted">Own reference</dt>
            <dd className="text-ink">
              Your Mission Day {m.own_reference_mission_days[0]} to {m.own_reference_mission_days[1]} (at least{" "}
              {m.min_points_in_reference} values)
            </dd>
          </div>
          <div>
            <dt className="text-muted">Percentage or points cut-off</dt>
            <dd className="text-ink">None</dd>
          </div>
          <div>
            <dt className="text-muted">Standard-deviation multiplier</dt>
            <dd className="text-ink">None</dd>
          </div>
        </dl>
        <div className="mt-3 max-w-4xl space-y-2 text-xs leading-relaxed text-muted">
          <p>{m.consistency_convention}</p>
          <p>{m.launch_adaptation_note}</p>
          <p>{m.chance_note}</p>
          <p>
            Levels: Investigate = {detectionRules.layer2.levels.investigate.toLowerCase()} Monitor ={" "}
            {detectionRules.layer2.levels.monitor.toLowerCase()} Layer 2 can never raise Act.
          </p>
          <p>
            Statistical methods (not health sources): {methodSources.map((s) => s.short).join("; ")}. Their use for health
            pattern observation here is the experiment.
          </p>
        </div>
      </GlassSection>
    </div>
  );
}
