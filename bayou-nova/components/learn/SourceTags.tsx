import { Wrench } from "lucide-react";
import type { SourceRef } from "@/lib/detection";
import type { Claim } from "@/lib/learn";

/** Short links to the sources a statement rests on. Each opens the publication. */
export function SourceTags({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {sources.map((s) =>
        s.url ? (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            title={s.citation}
            className="rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary underline-offset-2 hover:border-secondary hover:underline"
          >
            {s.short}
            <span className="sr-only"> (opens the publication in a new tab)</span>
          </a>
        ) : (
          <span
            key={s.id}
            title={s.citation}
            className="rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary"
          >
            {s.short}
          </span>
        )
      )}
    </span>
  );
}

/** Label for a statement that is the platform's own wording and has no source. */
export function PlatformNoteTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink/25 bg-white/60 px-2 py-0.5 text-[11px] font-medium text-muted">
      <Wrench className="h-3 w-3" aria-hidden="true" />
      BAYOU-NOVA note, pending clinical review
    </span>
  );
}

/** A bullet list of statements, each tagged with its sources or as a platform note. */
export function ClaimList({ claims }: { claims: Claim[] }) {
  return (
    <ul className="space-y-3">
      {claims.map((c, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <div className="min-w-0 text-sm leading-relaxed text-ink/90">
            <p>{c.text}</p>
            <p className="mt-1">{c.platformNote ? <PlatformNoteTag /> : <SourceTags sources={c.sources} />}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
