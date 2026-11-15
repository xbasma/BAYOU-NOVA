import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px_4px_4px_4px] bg-ink text-champagne"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          {eyebrow && <p className="label-mono mb-1">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
