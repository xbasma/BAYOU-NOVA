import { Hammer, ListChecks } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";

/** Honest scaffold note for routes whose features are built in a later phase. */
export default function BuildStatusCard({ features }: { features: string[] }) {
  return (
    <GlassPanel eyebrow="Build status" title="Coming in a later phase" icon={Hammer}>
      <p className="text-sm text-muted">
        The project foundation and routes are in place. This page will carry:
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
