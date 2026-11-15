import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Bone,
  Brain,
  CircleHelp,
  Eye,
  HeartPulse,
  Moon,
  Orbit,
  Radiation,
  ShieldCheck,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import MeasurementBadge from "@/components/learn/MeasuredAsBadge";
import { ClaimList, SourceTags } from "@/components/learn/SourceTags";
import type { Hazard, ResearchLevel } from "@/lib/learn";

const ICONS: Record<string, LucideIcon> = {
  Radiation,
  Orbit,
  Bone,
  HeartPulse,
  ShieldPlus,
  Brain,
  Apple,
  Moon,
};

const RESEARCH_STYLE: Record<ResearchLevel, string> = {
  established: "border-safe/50 bg-safe/10 text-safe",
  partly: "border-warning/60 bg-warning/10 text-warning",
  investigating: "border-caution/60 bg-caution/10 text-caution",
};

function Part({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink/10 pt-4">
      <h4 className="mb-2.5 flex items-center gap-2 !text-sm">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * One hazard. The four required parts are always present: what it is, why it
 * happens, what to watch for and preventive actions. Every statement carries
 * its sources, or is labelled as a BAYOU-NOVA note.
 */
export default function HazardCard({
  hazard,
  defaultOpen = false,
  showPageLink = false,
}: {
  hazard: Hazard;
  defaultOpen?: boolean;
  showPageLink?: boolean;
}) {
  const Icon = ICONS[hazard.icon] ?? Orbit;

  return (
    <article id={hazard.id} className="glass-panel scroll-mt-24 p-5 sm:p-6" aria-labelledby={`${hazard.id}-title`}>
      <header className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-canvas/60 text-accent"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id={`${hazard.id}-title`} className="!text-base sm:!text-lg">
            {hazard.title}
          </h3>
          <p className="mt-1 text-sm text-ink/85">{hazard.summary}</p>
          <p className="mt-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${RESEARCH_STYLE[hazard.research.level]}`}
            >
              {hazard.research.label}
            </span>
          </p>
        </div>
      </header>

      <details className="group mt-4" open={defaultOpen}>
        <summary className="cursor-pointer text-sm font-semibold text-accent underline-offset-4 hover:underline">
          <span className="group-open:hidden">Show what it is, why, what to watch and prevention</span>
          <span className="hidden group-open:inline">Hide details</span>
        </summary>

        <div className="mt-4 space-y-4">
          <Part icon={CircleHelp} title="What it is">
            <ClaimList claims={hazard.whatItIs} />
          </Part>
          <Part icon={Orbit} title="Why it happens">
            <ClaimList claims={hazard.whyItHappens} />
          </Part>
          <Part icon={Eye} title="What to watch for">
            <ClaimList claims={hazard.whatToWatch} />
          </Part>
          <Part icon={ShieldCheck} title="Preventive actions">
            <ClaimList claims={hazard.preventiveActions} />
          </Part>

          <section className="rounded-xl border border-warning/50 bg-warning/[0.07] p-4">
            <h4 className="!text-sm text-warning">Open question</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{hazard.openQuestion.text}</p>
            <p className="mt-1.5">
              <SourceTags sources={hazard.openQuestion.sources} />
            </p>
          </section>

          <section className="rounded-xl border border-ink/10 bg-canvas/50 p-4">
            <h4 className="!text-sm">What BAYOU-NOVA can and cannot see</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{hazard.platformSees.summary}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {hazard.platformSees.items.map((i) => (
                <li key={i.what} className="flex items-center gap-1.5 text-xs text-ink/85">
                  <span>{i.what}</span>
                  <MeasurementBadge type={i.type} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </details>

      {showPageLink && (
        <p className="mt-4">
          <Link
            href={`/learn/${hazard.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            Open as its own page
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> for {hazard.title}</span>
          </Link>
        </p>
      )}
    </article>
  );
}
