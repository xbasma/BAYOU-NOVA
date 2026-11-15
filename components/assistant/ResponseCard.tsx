import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  OctagonAlert,
  RadioTower,
  Search,
  Siren,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { ExperimentalRuleNote, PublishedBasisNote } from "@/components/health/Glass";
import ProtocolCard from "@/components/assistant/ProtocolCard";
import {
  BASIS_TAG_LABEL,
  QUICK_ACTIONS,
  type AssistantResponse,
  type AssistantTone,
  type BasisTag,
  type Block,
  type BlockKind,
  type QuickAction,
} from "@/lib/assistant";

const TONE: Record<AssistantTone, { border: string; chip: string; dot: string; icon: LucideIcon; callout: string }> = {
  normal: {
    border: "border-safe/60",
    chip: "border-safe/50 bg-safe/15 text-safe",
    dot: "#2E9E5B",
    icon: CircleCheck,
    callout: "border-safe/40 bg-safe/[0.07]",
  },
  monitor: {
    border: "border-warning/70",
    chip: "border-warning/60 bg-warning/15 text-warning",
    dot: "#E0A010",
    icon: Eye,
    callout: "border-warning/50 bg-warning/[0.08]",
  },
  investigate: {
    border: "!border-2 border-dashed border-caution/70",
    chip: "border-caution/60 bg-caution/15 text-caution",
    dot: "#E2680F",
    icon: Search,
    callout: "border-caution/60 bg-caution/[0.09]",
  },
  act: {
    border: "!border-2 border-danger",
    chip: "border-danger/70 bg-danger/20 text-danger",
    dot: "#C8321F",
    icon: OctagonAlert,
    callout: "border-danger/60 bg-danger/[0.1]",
  },
  neutral: {
    border: "border-dashed border-ink/40",
    chip: "border-ink/30 bg-white/60 text-ink",
    dot: "#6B5870",
    icon: CircleHelp,
    callout: "border-ink/30 bg-white/70",
  },
};

const BLOCK_ICON: Record<BlockKind, LucideIcon> = {
  signals: Activity,
  questions: MessageCircleQuestion,
  explanations: Lightbulb,
  watch: Eye,
  timeframe: CalendarClock,
  investigate: Search,
  cannot_see: EyeOff,
  next_steps: ListChecks,
  escalate_now: Siren,
  escalate_soon: TrendingUp,
  escalate_routine: ClipboardList,
};

const BASIS_STYLE: Record<BasisTag, string> = {
  spaceflight: "border-secondary/50 bg-secondary/10 text-secondary",
  earth: "border-accent/50 bg-accent/10 text-accent",
  general: "border-ink/20 text-muted",
  platform: "border-ink/20 text-muted",
};

function BlockView({ block }: { block: Block }) {
  const Icon = BLOCK_ICON[block.kind];
  const urgent = block.kind === "escalate_now";
  const numbered = block.kind === "investigate" || block.kind === "next_steps";
  const List = numbered ? "ol" : "ul";
  return (
    <section
      className={`rounded-xl border p-3.5 sm:p-4 ${urgent ? "border-danger/50 bg-danger/[0.06]" : "border-ink/10 bg-canvas/50"}`}
    >
      <h4 className={`flex items-center gap-2 !text-sm ${urgent ? "text-danger" : "text-ink"}`}>
        <Icon className={`h-4 w-4 shrink-0 ${urgent ? "text-danger" : "text-accent"}`} aria-hidden="true" />
        {block.title}
      </h4>
      {block.note && <p className="mt-1 text-xs leading-relaxed text-muted">{block.note}</p>}
      <List className="mt-2.5 space-y-2">
        {block.items.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2.5 text-sm leading-relaxed text-ink/90 ${
              item.emphasis ? "rounded-lg border border-accent/50 bg-accent/[0.06] p-2.5" : ""
            }`}
          >
            {numbered ? (
              <span className="mt-0.5 w-4 shrink-0 text-xs font-bold text-accent" aria-hidden="true">
                {i + 1}
              </span>
            ) : (
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${urgent ? "bg-danger" : "bg-accent"}`}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0">
              {(item.tag || item.basis) && (
                <span className="mb-0.5 mr-2 inline-flex flex-wrap items-center gap-1.5 align-middle">
                  {item.tag && (
                    <span className="rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[10.5px] font-semibold text-secondary">
                      {item.tag}
                    </span>
                  )}
                  {item.basis && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${BASIS_STYLE[item.basis]}`}>
                      {BASIS_TAG_LABEL[item.basis]}
                    </span>
                  )}
                </span>
              )}
              {item.text}
              {item.sources && item.sources.length > 0 && (
                <span className="mt-0.5 block text-[11px] text-muted">
                  {item.sources.map((s) => (
                    <span key={s.id} title={s.citation} className="mr-2">
                      {s.short}
                      {!s.verified && " (citation unverified)"}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </List>
    </section>
  );
}

/** The sentences a level must always carry, shown word for word. */
function Mandatory({ response }: { response: AssistantResponse }) {
  if (!response.mandatory.length) return null;
  const tone = TONE[response.tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${tone.callout}`}>
      <RadioTower className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
      <div className="space-y-1">
        {response.mandatory.map((line, i) => (
          <p key={line} className={`text-sm leading-snug text-ink ${i === 0 ? "font-bold" : "font-semibold"}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * One assistant reply as a structured card. The level decides the colour and
 * the fixed sentences; the two quick actions sit under every reply.
 */
export default function ResponseCard({
  response,
  onQuickAction,
  active,
}: {
  response: AssistantResponse;
  onQuickAction: (action: QuickAction) => void;
  /** Only the latest reply's quick actions can be used. */
  active: boolean;
}) {
  const tone = TONE[response.tone];
  const Icon = response.level === "info" ? Info : tone.icon;
  const serious = response.level === "serious";

  return (
    <article
      aria-label={`${response.levelLabel}: ${response.headline}`}
      className={`glass-panel relative overflow-hidden p-4 sm:p-5 ${tone.border}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.chip}`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.dot }} aria-hidden="true" />
          {response.levelLabel}
        </span>
      </header>

      <h3 className="mt-2.5 flex items-start gap-2 !text-base sm:!text-lg">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${serious ? "text-danger" : "text-accent"}`} aria-hidden="true" />
        <span>{response.headline}</span>
      </h3>

      <div className="mt-2 space-y-2">
        {response.lead.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-ink/90">
            {p}
          </p>
        ))}
      </div>

      {/* A serious reply carries its fixed sentences on each protocol card. */}
      {serious && response.protocols.length === 0 && (
        <div className="mt-3">
          <Mandatory response={response} />
        </div>
      )}

      <div className="mt-3">
        {response.basis.kind === "published" && <PublishedBasisNote label={response.basis.label} />}
        {response.basis.kind === "experimental" && <ExperimentalRuleNote />}
        {response.basis.kind === "none" && response.level !== "info" && (
          <p className="text-xs font-medium text-muted">{response.basis.label}</p>
        )}
      </div>

      {response.protocols.length > 0 && (
        <div className="mt-4 space-y-4">
          {response.protocols.map((card) => (
            <ProtocolCard key={card.id} card={card} collapsed={response.kind !== "answer"} />
          ))}
        </div>
      )}

      {response.blocks.length > 0 && (
        <div className="mt-4 space-y-3">
          {response.blocks.map((b) => (
            <BlockView key={b.kind + b.title} block={b} />
          ))}
        </div>
      )}

      {!serious && response.mandatory.length > 0 && (
        <div className="mt-4">
          <Mandatory response={response} />
        </div>
      )}

      {response.footnotes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {response.footnotes.map((f) => (
            <li key={f} className="text-xs leading-relaxed text-muted">
              {f}
            </li>
          ))}
        </ul>
      )}

      {response.links.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {response.links.map((l) => (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                className={`inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline ${
                  serious ? "text-danger" : "text-accent"
                }`}
              >
                {l.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Two quick actions under every reply. */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={!active}
            onClick={() => onQuickAction(a.id)}
            title={active ? undefined : "Use the quick actions under the latest reply"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/70 px-3.5 py-2 text-sm font-semibold text-ink hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ink/20 disabled:hover:text-ink"
          >
            {a.id === "why" ? (
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            )}
            {a.label}
          </button>
        ))}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">{response.producedBy}</p>
    </article>
  );
}
