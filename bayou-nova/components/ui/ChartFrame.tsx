"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Loading state for charts. Recharts measures its container on the client, so
 * the first paint would otherwise be an empty box. This shows a soft skeleton
 * (same size as the chart) until the chart can draw, then swaps it in.
 */
export default function ChartFrame({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="skeleton h-full w-full" aria-hidden="true" />;
  return <>{children}</>;
}
