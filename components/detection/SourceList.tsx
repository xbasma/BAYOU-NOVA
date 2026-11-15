import { BookMarked, CircleCheck, CircleDashed } from "lucide-react";
import { GlassSection } from "@/components/health/Glass";
import { loadReference } from "@/lib/health-data";

interface SourceEntry {
  id: string;
  short: string;
  citation: string;
  kind: string;
  population: string;
  used_for: string;
  verified: boolean;
  verification: string;
  url?: string;
  doi?: string;
}

/** Every source the detection layers rely on, with how each citation was checked. */
export default function SourceList({ onlyIds }: { onlyIds?: string[] }) {
  const { sourcesFile } = loadReference();
  const all = sourcesFile.sources as unknown as SourceEntry[];
  const sources = onlyIds ? all.filter((s) => onlyIds.includes(s.id)) : all;

  return (
    <GlassSection eyebrow="Sources" title="What each claim rests on" icon={BookMarked}>
      <p className="text-sm leading-relaxed text-ink/90">{sourcesFile.verification_status}</p>
      <p className="mt-2 text-sm font-medium text-warning">{sourcesFile.clinical_review_status}</p>
      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-accent underline-offset-4 hover:underline">
          Show all {sources.length} sources
        </summary>
        <ul className="mt-3 space-y-3">
          {sources.map((s) => {
            const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : null);
            return (
              <li key={s.id} className="rounded-xl border border-ink/10 bg-canvas/50 p-3">
                <p className="text-sm leading-relaxed text-ink">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-accent hover:underline">
                      {s.citation}
                    </a>
                  ) : (
                    s.citation
                  )}
                </p>
                <p data-keep className="mt-1 text-xs text-muted">
                  {s.kind} · {s.population}
                </p>
                <p className="mt-1 text-xs text-ink/85">Used for: {s.used_for}.</p>
                <p className={`mt-1 flex items-start gap-1.5 text-xs ${s.verified ? "text-safe" : "text-warning"}`}>
                  {s.verified ? (
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {s.verified ? "Citation checked. " : "Citation not yet checked. "}
                    {s.verification}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </details>
    </GlassSection>
  );
}
