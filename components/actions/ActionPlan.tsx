"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, Radar, Rocket, Globe2, Wrench } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import ProtocolCard from "@/components/assistant/ProtocolCard";
import { SourceTags } from "@/components/learn/SourceTags";
import { ExperimentalRuleNote, GlassSection, MeasurementBadge, PublishedBasisNote, SimulatedBadge, StatusChip } from "@/components/health/Glass";
import { ACTION_CONTENT, buildActionPlan, type ActionPlan as Plan, type PlanItem } from "@/lib/actions";
import { BASIS_TAG_LABEL, type BasisTag } from "@/lib/assistant";
import { useStore } from "@/lib/store";

const BASIS_STYLE: Record<BasisTag, string> = {
  spaceflight: "border-secondary/50 bg-secondary/10 text-secondary",
  earth: "border-accent/50 bg-accent/10 text-accent",
  platform: "border-ink/25 bg-white/60 text-muted",
  general: "border-ink/20 text-muted",
};
const BASIS_ICON = { spaceflight: Rocket, earth: Globe2, platform: Wrench, general: Wrench } as const;

function BasisChip({ basis }: { basis: BasisTag }) {
  const Icon = BASIS_ICON[basis];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BASIS_STYLE[basis]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {BASIS_TAG_LABEL[basis]}
    </span>
  );
}

function Numbered({ n, title, children, id }: { n: number; title: string; children: React.ReactNode; id: string }) {
  return (
    <GlassSection id={id}>
      <header className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-champagne"
        >
          {n}
        </span>
        <h2 className="font-display text-base font-semibold text-ink sm:text-lg">
          <span className="sr-only">Section {n}: </span>
          {title}
        </h2>
      </header>
      {children}
    </GlassSection>
  );
}

function Check({
  item,
  checked,
  onToggle,
}: {
  item: PlanItem;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const inputId = `plan-${item.id}`;
  return (
    <li className="rounded-xl border border-ink/10 bg-white/60 p-3.5">
      <div className="flex gap-3">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item.id)}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#2f6f4f]"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className={`cursor-pointer text-sm font-semibold ${checked ? "text-muted line-through" : "text-ink"}`}>
            {item.title}
          </label>
          <p className="mt-1 text-sm leading-relaxed text-ink/90">{item.text}</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            <BasisChip basis={item.basis} />
            {item.protocol && (
              <span className="rounded-full border border-safe/50 bg-safe/10 px-2 py-0.5 text-[11px] font-semibold text-safe">
                Published protocol or instrument
              </span>
            )}
            <SourceTags sources={item.sources} />
            {item.link && (
              <Link href={item.link.href} className="text-[11px] font-semibold text-accent underline underline-offset-2">
                {item.link.label}
              </Link>
            )}
          </p>
        </div>
      </div>
    </li>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-ink/90">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  const e = ACTION_CONTENT.empty;
  return (
    <GlassSection icon={ClipboardList} title={e.headline}>
      <p className="max-w-3xl text-sm leading-relaxed text-ink/90">{e.text}</p>
      <p className="mt-3 max-w-3xl rounded-lg border border-ink/10 bg-canvas/60 p-3 text-sm text-ink">{e.hint}</p>
      <Link
        href="/alerts"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
      >
        <Radar className="h-3.5 w-3.5" aria-hidden="true" />
        See how detection works
      </Link>
    </GlassSection>
  );
}

function FollowUpHeader({ plan }: { plan: Plan }) {
  const h = plan.header;
  const red = plan.mode === "redflag";
  return (
    <GlassSection
      icon={CalendarClock}
      eyebrow={red ? "Published red flag" : "Experimental pattern observation"}
      title={h.title}
      right={<StatusChip status={plan.level} />}
      className={red ? "!border-danger" : ""}
    >
      <p className="text-sm font-semibold text-ink">{h.headline}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-ink/10 bg-white/60 p-3">
          <dt className="text-[11px] font-medium text-muted">Plan initiated</dt>
          <dd className="mt-0.5 font-display text-sm font-semibold text-ink">Mission Day {h.initiatedDay}</dd>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white/60 p-3">
          <dt className="text-[11px] font-medium text-muted">Today</dt>
          <dd className="mt-0.5 font-display text-sm font-semibold text-ink">
            Mission Day {h.todayDay}
            {h.followUpDay !== null && (
              <span className="block text-xs font-normal text-muted">
                Day {h.followUpDay} of {h.reviewDays}
              </span>
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white/60 p-3">
          <dt className="text-[11px] font-medium text-muted">{red ? "Review date" : "Review on"}</dt>
          <dd className="mt-0.5 font-display text-sm font-semibold text-ink">
            {h.reviewDay !== null ? `Mission Day ${h.reviewDay}` : "Act now"}
            {h.reviewPassed && <span className="block text-xs font-normal text-warning">Review date reached</span>}
          </dd>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white/60 p-3">
          <dt className="text-[11px] font-medium text-muted">Related pattern first seen</dt>
          <dd className="mt-0.5 font-display text-sm font-semibold text-ink">
            {h.patternsSince !== null ? `Mission Day ${h.patternsSince}` : "Not applicable"}
          </dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-muted">
        <li>{h.initiatedBasis}</li>
        <li>{h.reviewBasis}</li>
        <li>{h.conferenceNote}</li>
      </ul>
      <p data-keep className="mt-3 text-xs leading-relaxed text-muted">
        This plan is assembled by fixed rules from pre-written wording and the live detection result. No AI model writes it and
        no clinician has reviewed it. It is not medical advice and not for clinical use.
      </p>
    </GlassSection>
  );
}

export default function ActionPlan() {
  const { data, detection, overlay, toggleActionCheck } = useStore();
  const plan = useMemo(() => (detection ? buildActionPlan(detection) : null), [detection]);
  if (!data || !detection || !plan) return null;

  const checked = new Set(overlay.actionChecks);
  const done = plan.checkableIds.filter((id) => checked.has(id)).length;
  const red = plan.mode === "redflag";
  const t = ACTION_CONTENT.sectionTitles;

  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <PageHeader
        icon={ClipboardList}
        eyebrow="Workflow · Act and Follow Up"
        title="Action and follow-up"
        description="What changed, what it may suggest, what to check and do, when to contact Earth, and what improvement looks like."
        actions={<SimulatedBadge />}
      />

      {plan.mode === "none" ? (
        <EmptyState />
      ) : (
        <>
          <FollowUpHeader plan={plan} />

          {/* 1. What changed */}
          <Numbered n={1} id="changed" title={t.changed}>
            <p className="max-w-3xl text-sm text-muted">{plan.changed.intro}</p>

            {plan.changed.redFlags.length > 0 && (
              <ul className="mt-4 space-y-3">
                {plan.changed.redFlags.map((r) => (
                  <li key={r.id} className="rounded-xl border-2 border-danger bg-danger/[0.06] p-4">
                    <p className="text-sm font-bold text-ink">{r.title}</p>
                    <p className="mt-1 text-sm text-ink/90">{r.detail}</p>
                    {r.previouslyReportedDay !== null && (
                      <p className="mt-1 text-xs text-muted">Previously reported on Mission Day {r.previouslyReportedDay}.</p>
                    )}
                    <p className="mt-2">
                      <SourceTags sources={r.sources} />
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {plan.changed.patterns.map((p) => (
              <div key={p.id} className="mt-4 rounded-xl border border-ink/10 bg-white/60 p-4">
                <p className="text-sm font-semibold text-ink">{p.title}</p>
                <p className="mt-1 text-sm text-ink/90">{p.statement}</p>
                {p.observedSinceDay !== null && <p className="mt-1 text-xs text-muted">First seen on Mission Day {p.observedSinceDay}.</p>}
                <ul className="mt-3 space-y-2">
                  {p.lines.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm text-ink/90">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{l.text}</span>
                      <MeasurementBadge type={l.measurementType} />
                    </li>
                  ))}
                </ul>
                {p.summary && <p className="mt-3 text-xs leading-relaxed text-muted">{p.summary}</p>}
              </div>
            ))}

            {plan.changed.alone.length > 0 && (
              <div className="mt-4">
                <h3 className="!text-sm">{plan.changed.aloneTitle}</h3>
                <p className="mt-1 text-xs text-muted">{plan.changed.aloneNote}</p>
                <ul className="mt-2 space-y-2">
                  {plan.changed.alone.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm text-ink/90">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{l.text}</span>
                      <MeasurementBadge type={l.measurementType} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.changed.layer1Note && <p className="mt-4 text-xs text-muted">{plan.changed.layer1Note}</p>}
          </Numbered>

          {/* 2. What it may suggest */}
          <Numbered n={2} id="suggests" title={t.suggests}>
            {plan.suggests.experimentalLabel ? <ExperimentalRuleNote className="mb-3" /> : null}
            <p className="max-w-3xl text-sm leading-relaxed text-ink/90">{plan.suggests.lead}</p>

            {plan.suggests.possibilities.length > 0 && (
              <div className="mt-4" data-detail>
                <h3 className="!text-sm">{plan.suggests.possibilitiesTitle}</h3>
                <p className="mt-1 text-xs text-muted">{plan.suggests.possibilitiesNote}</p>
                <ul className="mt-3 space-y-3">
                  {plan.suggests.possibilities.map((p, i) => (
                    <li key={i} className="rounded-xl border border-ink/10 bg-white/60 p-3.5">
                      <p data-keep className="text-[11px] font-semibold text-muted">{p.streamTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink/90">{p.text}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-1.5">
                        <BasisChip basis={p.basis} />
                        <SourceTags sources={p.sources} />
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.suggests.cannotSee.length > 0 && (
              <div className="mt-4 rounded-xl border border-ink/10 bg-canvas/50 p-4">
                <h3 className="!text-sm">{plan.suggests.cannotSeeTitle}</h3>
                <ul className="mt-2 space-y-2 text-sm text-ink/90">
                  {plan.suggests.cannotSee.map((c) => (
                    <li key={c.streamTitle}>
                      <span className="font-semibold">{c.streamTitle}: </span>
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 rounded-lg border border-warning/50 bg-warning/[0.08] p-3 text-sm text-ink">{plan.suggests.uncertainty}</p>
            {plan.suggests.layer2Note && <p className="mt-3 text-xs text-muted">{plan.suggests.layer2Note}</p>}
          </Numbered>

          {/* 3. What to check */}
          <Numbered n={3} id="check" title={t.check}>
            <p className="max-w-3xl text-sm text-muted">{plan.check.intro}</p>
            {plan.mode === "experimental" && (
              <p data-keep className="mt-2 text-xs text-muted">
                {done} of {plan.checkableIds.length} steps ticked across sections 3 and 4. Ticks are kept in this browser only.
              </p>
            )}
            {plan.check.groups.map((g) => (
              <div key={g.group} className="mt-4">
                <h3 className="!text-sm">
                  {g.group}. {g.title}
                </h3>
                <ul className="mt-2 space-y-2.5">
                  {g.items.map((it) => (
                    <Check key={it.id} item={it} checked={checked.has(it.id)} onToggle={toggleActionCheck} />
                  ))}
                </ul>
              </div>
            ))}
          </Numbered>

          {/* 4. What to do */}
          <Numbered n={4} id="do" title={t.do}>
            <p className="max-w-3xl text-sm text-muted">{plan.doSection.intro}</p>

            {red ? (
              <div className="mt-4 space-y-4">
                {plan.doSection.protocols.map((c) => (
                  <ProtocolCard key={c.id} card={c} />
                ))}
                <div className="rounded-xl border border-danger/60 bg-danger/[0.1] p-3">
                  <p className="text-sm font-bold text-ink">{plan.doSection.seriousLine}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{plan.doSection.onboardLine}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-3 rounded-lg border border-dashed border-secondary/50 bg-secondary/[0.06] p-3 text-xs leading-relaxed text-ink">
                  {plan.doSection.noProtocolNote}
                </p>
                <ol className="mt-4 space-y-2.5">
                  {plan.doSection.items.map((it) => (
                    <Check key={it.id} item={it} checked={checked.has(it.id)} onToggle={toggleActionCheck} />
                  ))}
                </ol>
              </>
            )}
          </Numbered>

          {/* 5. When to contact Earth */}
          <Numbered n={5} id="contact" title={t.contact}>
            <div className="rounded-xl border-2 border-danger bg-danger/[0.06] p-4">
              <h3 className="!text-sm text-danger">{plan.contact.nowTitle}</h3>
              <p className="mt-1 text-sm text-ink/90">{plan.contact.nowNote}</p>
              {plan.contact.nowGroups.map((g) => (
                <div key={g.title} className="mt-3">
                  <p className="text-xs font-semibold text-ink">{g.title}</p>
                  <Bullets items={g.items} />
                </div>
              ))}
              {plan.contact.measured.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-ink">Also, from your readings</p>
                  <Bullets items={plan.contact.measured} />
                </div>
              )}
              <p className="mt-4 text-sm font-bold text-ink">{plan.contact.seriousLine}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{plan.contact.onboardLine}</p>
            </div>

            {plan.contact.soon.length > 0 && (
              <div className="mt-4">
                <h3 className="!text-sm">{plan.contact.soonTitle}</h3>
                <p className="mt-1 text-xs text-muted">{plan.contact.soonNote}</p>
                <ul className="mt-3 space-y-2.5">
                  {plan.contact.soon.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      <div>
                        <p>{s.text}</p>
                        {(s.basis || s.sources.length > 0) && (
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            {s.basis && <BasisChip basis={s.basis} />}
                            <SourceTags sources={s.sources} />
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.contact.routine.length > 0 && (
              <div className="mt-4">
                <h3 className="!text-sm">{plan.contact.routineTitle}</h3>
                <div className="mt-2">
                  <Bullets items={plan.contact.routine} />
                </div>
              </div>
            )}

            {plan.contact.review && (
              <p className="mt-4 rounded-lg border border-ink/10 bg-canvas/60 p-3 text-sm text-ink">{plan.contact.review}</p>
            )}
          </Numbered>

          {/* 6. What improvement looks like */}
          <div data-detail>
            <Numbered n={6} id="improvement" title={t.improvement}>
            {red ? (
              <ul className="space-y-2 text-sm leading-relaxed text-ink/90">
                {plan.improvement.redflag.map((t2, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                    <span>{t2}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <h3 className="!text-sm">{plan.improvement.looksTitle}</h3>
                <p className="mt-1 text-xs text-muted">{plan.improvement.looksNote}</p>
                <div className="mt-2">
                  <Bullets items={plan.improvement.looks} />
                </div>

                <h3 className="mt-5 !text-sm">{plan.improvement.timeframeTitle}</h3>
                <div className="mt-2">
                  <Bullets items={plan.improvement.timeframe} />
                </div>

                <h3 className="mt-5 !text-sm">{plan.improvement.notTitle}</h3>
                <div className="mt-2">
                  <Bullets items={plan.improvement.not} />
                </div>

                {plan.improvement.worse && (
                  <p className="mt-5 rounded-lg border border-warning/50 bg-warning/[0.08] p-3 text-sm text-ink">
                    <span className="font-semibold">{plan.improvement.worseTitle} </span>
                    {plan.improvement.worse}
                  </p>
                )}
              </>
            )}
          </Numbered>
          </div>

          {plan.related.length > 0 && (
            <GlassSection title="Read more in Learn" eyebrow="Background, not part of the plan">
              <ul className="flex flex-wrap gap-2">
                {plan.related.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/learn/${r.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
                    >
                      {r.title}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassSection>
          )}

          {red && <PublishedBasisNote label="Based on published emergency criteria. Personal baseline readings were not used to judge this alert." />}
        </>
      )}

      <p data-keep className="text-center text-xs leading-relaxed text-muted">
        SIMULATED DEMONSTRATION DATA. Proof of concept, not a medical device. This plan is not treatment advice and has not been
        reviewed by a clinician.
      </p>
    </div>
  );
}
