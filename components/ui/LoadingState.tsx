/**
 * Shown while the demo session is read from the browser, and by the route-level
 * loading boundary. The data itself is local JSON, so this is usually brief; the
 * skeleton keeps the page from jumping when the real panels arrive.
 */
export default function LoadingState({ label = "Establishing link" }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex h-9 w-9 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-ember" />
        </span>
        <p className="text-sm font-semibold text-ink">
          {label}
          <span className="sr-only">, loading</span>
          <span aria-hidden="true">…</span>
        </p>
      </div>
      <div className="mt-6 space-y-5" aria-hidden="true">
        <div className="skeleton h-24 w-full" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="skeleton h-56" />
          <div className="skeleton h-56" />
        </div>
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}
