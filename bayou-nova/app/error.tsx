"use client";

import { useEffect } from "react";

/** Last-resort screen if something throws while rendering. The demo data is local, so a retry is usually enough. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1>Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">
        This screen could not be shown. Your demo data is held in this browser and has not been lost.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-copper">
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center rounded-full border border-accent/40 bg-white/60 px-6 py-3 text-sm font-semibold text-ink hover:border-accent hover:text-accent"
        >
          Back to the welcome screen
        </a>
      </div>
    </main>
  );
}
