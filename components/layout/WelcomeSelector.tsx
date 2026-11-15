"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";
import NovaOrb from "@/components/brand/NovaOrb";
import { SimulatedBadge } from "@/components/health/Glass";
import { loadAstronaut } from "@/lib/health-data";
import { currentMissionDay } from "@/lib/health";
import { useStore } from "@/lib/store";
import { WORKFLOW_STAGES } from "@/lib/nav";
import type { AstronautId } from "@/lib/types";

export const TAGLINE = "Intelligent Health Monitoring for the Space Frontier";

const OPTIONS: {
  id: AstronautId;
  title: string;
  kicker: string;
  blurb: string;
  icon: typeof ShieldCheck;
  tone: "normal" | "watch";
}[] = [
  {
    id: "A-104",
    title: "Stable profile",
    kicker: "Astronaut A-104",
    blurb: "Readings stay close to personal baselines. See what a steady monitoring picture looks like.",
    icon: ShieldCheck,
    tone: "normal",
  },
  {
    id: "B-209",
    title: "Alert profile",
    kicker: "Astronaut B-209",
    blurb: "Readings drift gradually over several weeks. See how slow changes are surfaced early.",
    icon: TriangleAlert,
    tone: "watch",
  },
];

export default function WelcomeSelector() {
  const { selectAstronaut } = useStore();
  const router = useRouter();

  function choose(id: AstronautId) {
    selectAstronaut(id);
    router.push("/dashboard");
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      {/* ---- Name, tagline, description ---- */}
      <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <div className="order-2 animate-fade-up lg:order-1">
          <p className="font-wordmark text-sm tracking-[0.34em] text-ink">BAYOU-NOVA</p>
          <h1 className="mt-5 !text-[2.2rem] sm:!text-[3.4rem]" style={{ fontStretch: "125%" }}>
            {TAGLINE}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            A proof-of-concept health awareness platform for long-duration missions, where a clinic is not down the road.
            It follows each astronaut&apos;s own baseline, checks published emergency red flags first, and helps decide what
            to do next.
          </p>
          <p className="mt-4">
            <SimulatedBadge />
          </p>
        </div>

        <div className="order-1 mx-auto w-[min(60vw,260px)] sm:w-[320px] lg:order-2 lg:w-full lg:max-w-[440px]">
          <NovaOrb fluid tone="light" priority />
        </div>
      </div>

      {/* ---- Core workflow banner ---- */}
      <section
        aria-labelledby="workflow-heading"
        className="glass-panel mt-10 overflow-hidden px-4 py-5 sm:px-6 lg:mt-14"
      >
        <h2 id="workflow-heading" className="text-xs !font-semibold text-muted" style={{ fontStretch: "100%" }}>
          Core workflow
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-5 sm:gap-0">
          {WORKFLOW_STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.stage} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2 sm:pr-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-white/70 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.stage}
                  </span>
                  <span className="block text-xs leading-snug text-muted">{s.caption}</span>
                </span>
                {i < WORKFLOW_STAGES.length - 1 && (
                  <ChevronRight
                    className="absolute right-0 top-3 hidden h-5 w-5 text-accent/70 sm:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---- Two demo profiles ---- */}
      <h2 className="mt-10 !text-base text-ink sm:!text-lg">Choose a demonstration profile</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {OPTIONS.map((opt) => {
          const astronaut = loadAstronaut(opt.id);
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.id)}
              className="group rounded-[34px_8px_8px_8px] text-left focus-visible:outline-offset-4"
              aria-label={`${opt.title}, ${opt.kicker}. Open the dashboard.`}
            >
              <div className="glass-panel glass-panel-hover h-full p-6">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                      opt.tone === "normal" ? "border-safe/50 bg-safe/10 text-safe" : "border-caution/60 bg-caution/10 text-caution"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-muted">Mission Day {currentMissionDay(astronaut)}</span>
                </div>
                <p className="mt-4 text-xs font-medium text-muted">{opt.kicker}</p>
                <h3 className="mt-0.5 !text-xl leading-snug">{opt.title}</h3>
                <p className="mt-2 text-sm text-muted">{opt.blurb}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
                  <span className="text-xs text-muted">{astronaut.profile.role}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    Open dashboard
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-muted">
        Demo mode needs no account or sign-in. All data is fictional and simulated. Your chosen profile, and anything you add
        during the demo, stays in this browser only. BAYOU-NOVA is not a medical device.
      </p>
    </main>
  );
}
