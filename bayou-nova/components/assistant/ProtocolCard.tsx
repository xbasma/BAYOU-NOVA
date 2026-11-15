import { BookMarked, EyeOff, FileLock2, Globe2, Rocket, ShieldAlert, Wrench } from "lucide-react";
import {
  BASIS_TAG_LABEL,
  SERIOUS_LINE,
  SERIOUS_ONBOARD_LINE,
  type BasisTag,
  type ProtocolCardView,
} from "@/lib/assistant";

const BASIS_STYLE: Record<BasisTag, string> = {
  spaceflight: "border-secondary/50 bg-secondary/10 text-secondary",
  earth: "border-accent/50 bg-accent/10 text-accent",
  platform: "border-ink/25 bg-white/60 text-muted",
  general: "border-ink/20 text-muted",
};
const BASIS_ICON = { spaceflight: Rocket, earth: Globe2, platform: Wrench, general: Wrench } as const;

/**
 * A pre-defined protocol card for one group of published red flags.
 * Everything on it is fixed text from data/shared/assistant-protocols.json.
 * It is not generated, and it does not read the astronaut's readings.
 */
export default function ProtocolCard({ card, collapsed = false }: { card: ProtocolCardView; collapsed?: boolean }) {
  const steps = (
    <ol className="mt-3 space-y-3">
      {card.steps.map((s, i) => {
        const basis = s.basis ?? "platform";
        const Icon = BASIS_ICON[basis];
        return (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-xs font-bold text-white"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-ink">{s.text}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${BASIS_STYLE[basis]}`}>
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {BASIS_TAG_LABEL[basis]}
                </span>
                {s.sources?.map((src) => (
                  <span key={src.id} title={src.citation}>
                    {src.short}
                  </span>
                ))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <article
      aria-label={`Protocol card: ${card.title}`}
      className="rounded-[24px_8px_8px_8px] border-2 border-danger bg-white/80 p-4 sm:p-5"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-danger">
        <FileLock2 className="h-3.5 w-3.5" aria-hidden="true" />
        Pre-defined protocol card · not AI-generated
      </p>
      <h4 className="mt-1 text-base text-ink">{card.title}</h4>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {card.triggers.map((t) => (
          <li
            key={t.id}
            className="rounded-full border border-danger/50 bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger"
          >
            {t.title} · {t.how === "data" ? t.detail : "mentioned in this conversation"}
          </li>
        ))}
      </ul>

      {/* The two sentences every serious response carries, word for word. */}
      <div className="mt-3 rounded-xl border border-danger/60 bg-danger/[0.1] p-3">
        <p className="text-sm font-bold leading-snug text-ink">{SERIOUS_LINE}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-ink">{SERIOUS_ONBOARD_LINE}</p>
      </div>

      {/* Which published protocol or guideline this card follows. */}
      <div className="mt-3 rounded-lg border border-accent/45 bg-accent/[0.07] px-3 py-2">
        <p className="flex items-start gap-2 text-xs font-semibold leading-snug text-accent">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{card.followsLabel}</span>
        </p>
        <p className="mt-1 pl-[22px] text-xs leading-relaxed text-ink/85">{card.followsNote}</p>
      </div>

      {collapsed ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-danger underline-offset-4 hover:underline">
            Show the {card.steps.length} protocol steps
          </summary>
          {steps}
        </details>
      ) : (
        steps
      )}

      <p className="mt-4 rounded-lg border border-warning/50 bg-warning/[0.08] px-3 py-2 text-xs leading-relaxed text-ink">
        <span className="font-semibold text-warning">Spaceflight sourcing. </span>
        {card.spaceflightGap}
      </p>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{card.cannot}</span>
      </p>

      {card.visitorNote && (
        <p className="mt-3 rounded-lg border border-ink/15 bg-canvas/60 px-3 py-2 text-xs leading-relaxed text-ink">
          {card.visitorNote}
        </p>
      )}

      <details className="mt-3" open={!collapsed}>
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline">
          <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
          Exact citations ({card.sources.length})
        </summary>
        <ul className="mt-2 space-y-1.5">
          {card.sources.map((s) => (
            <li key={s.id} className="text-[11.5px] leading-relaxed text-ink/85">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-accent hover:underline">
                  {s.citation}
                </a>
              ) : (
                s.citation
              )}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
