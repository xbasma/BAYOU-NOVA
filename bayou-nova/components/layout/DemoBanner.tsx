/** Rendered on every route, including the welcome screen: all data here is fictional. */
export default function DemoBanner() {
  return (
    <div className="border-b border-accent/20 bg-white/50 backdrop-blur" role="note">
      <p className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-1.5 text-xs text-ink/80 sm:px-6">
        <span className="h-2 w-2 shrink-0 rounded-full bg-ember" aria-hidden="true" />
        <span className="font-semibold uppercase tracking-wide">Simulated demonstration data</span>
        <span className="hidden text-muted sm:inline">Proof of concept, not a medical device.</span>
      </p>
    </div>
  );
}
