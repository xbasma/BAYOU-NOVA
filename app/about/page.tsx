import { FlaskConical, Info, Layers, Lock, Ruler, TriangleAlert } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import MeasurementTypeTag from "@/components/ui/MeasurementTypeTag";
import PageHeader from "@/components/layout/PageHeader";
import type { MeasurementType } from "@/lib/types";

const LABELS: { type: MeasurementType; meaning: string }[] = [
  { type: "direct_measurement", meaning: "A sensor or instrument measured the value itself." },
  {
    type: "functional_indicator",
    meaning: "A test of how something works. It points toward a body system but does not measure it.",
  },
  { type: "self_reported", meaning: "The crew member rated or reported it." },
  {
    type: "behavioural_inference",
    meaning: "Worked out from behaviour or motion data, so it is an estimate.",
  },
];

export const metadata = { title: "About | BAYOU-NOVA" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        icon={Info}
        eyebrow="Methods and limitations"
        title="About BAYOU-NOVA"
        description="What this demonstration is, how its alerts are meant to work, and what it cannot do."
      />

      <GlassPanel eyebrow="Scope" title="A proof of concept" icon={FlaskConical}>
        <p className="text-sm text-ink/90">
          BAYOU-NOVA is a 2026 NASA Space Apps Challenge demonstration of one idea: helping an
          astronaut monitor, detect, investigate and act on health concerns, then follow up. All
          people, readings and events are fictional and labelled SIMULATED DEMONSTRATION DATA. It is
          not a medical device and does not diagnose or treat any condition.
        </p>
      </GlassPanel>

      <GlassPanel eyebrow="Alert design" title="Two layers, one priority" icon={Layers}>
        <ul className="space-y-3 text-sm text-ink/90">
          <li>
            <span className="font-semibold text-danger">Layer 1: published red flags.</span> Criteria
            taken from published medical sources, each cited. They are checked first and always
            override Layer 2. When one is met, personal baseline readings are never used to reassure.
          </li>
          <li>
            <span className="font-semibold text-warning">Layer 2: personal baseline deviation.</span>{" "}
            An experimental rule that looks for a consistent direction over 14 days in your own
            readings, and reports a pattern only when related signals move together. It uses no
            percentage or size cut-off. No published threshold exists for this, so every observation
            is labelled “Experimental detection rule — this is not a validated clinical detection
            method”. It can raise amber or orange, never red.
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          Both layers are shown on the Early Detection page with their sources. Wording says “may be
          consistent with”, never “you have”, and states its uncertainty. No clinician has reviewed
          the criteria, and almost all of the published sources were written for people on Earth.
        </p>
      </GlassPanel>

      <GlassPanel eyebrow="Prevention, crew and follow-up" title="Learn, Crew and Action" icon={Layers}>
        <ul className="space-y-3 text-sm text-ink/90">
          <li>
            <span className="font-semibold">Learn.</span> Eight spaceflight hazards, a mission-phase view and a
            prevention toolkit. Each statement carries its published source, or is labelled as BAYOU-NOVA wording
            pending clinical review. Open scientific questions are stated, and SANS is shown as under active
            investigation.
          </li>
          <li>
            <span className="font-semibold">Crew.</span> A fictional habitat scenario with environmental framing
            only. It cannot guarantee anonymity in a small crew and would need a formal privacy impact assessment
            before any real use. The opt-in switch is a local preference, not a data-sharing system.
          </li>
          <li>
            <span className="font-semibold">Action and follow-up.</span> A six-section plan built from the detection
            result. A published red flag gives the red-flag plan. Otherwise the plan is an experimental pattern
            observation, and no published spaceflight protocol exists for acting on one. Its 14-day review date is
            the experimental rule&apos;s own window, not a clinical interval.
          </li>
        </ul>
      </GlassPanel>

      <GlassPanel eyebrow="Measurement honesty" title="How every value is labelled" icon={Ruler}>
        <ul className="space-y-3">
          {LABELS.map((l) => (
            <li key={l.type} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <span className="sm:w-52">
                <MeasurementTypeTag type={l.type} />
              </span>
              <span className="text-sm text-ink/90">{l.meaning}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          BAYOU-NOVA does not measure bone density or immune function, directly or indirectly.
          Spaceflight-associated neuro-ocular syndrome (SANS) is under active investigation and
          cannot be assessed by this platform.
        </p>
      </GlassPanel>

      <GlassPanel eyebrow="Limitations" title="What it cannot do" icon={TriangleAlert}>
        <ul className="space-y-2 text-sm text-ink/90">
          <li>It cannot replace the flight surgeon or real mission medical procedures.</li>
          <li>
            PHQ-9 and GAD-7 are validated instruments, but they are never auto-scheduled. How often
            they are given, and how results are read in spaceflight, should follow flight surgeon
            guidance.
          </li>
          <li>
            Published criteria were mostly validated on Earth. They may not apply the same way in
            spaceflight, and each will say so.
          </li>
        </ul>
      </GlassPanel>

      <GlassPanel eyebrow="Privacy" title="Your data and the crew view" icon={Lock}>
        <p className="text-sm text-ink/90">
          Demo mode has no accounts and sends nothing to a server. Your chosen profile and anything
          you add are stored in this browser only. The Crew page
          uses fictional environmental signals only. BAYOU-NOVA cannot guarantee privacy without a
          formal privacy impact assessment, and it makes no claim of anonymity.
        </p>
      </GlassPanel>
    </main>
  );
}
