import type { ElementType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Severity } from "@/lib/types";

/** neutral = copper border. The rest follow the four status levels. */
export type PanelStatus = "neutral" | Severity;

interface GlassPanelProps {
  children?: ReactNode;
  /** Heading shown at the top of the panel (Orbitron) */
  title?: string;
  /** Small label above the title */
  eyebrow?: string;
  /** Optional icon shown beside the title */
  icon?: LucideIcon;
  /** Colours the border and icon: green / amber / orange / red. Default is copper. */
  status?: PanelStatus;
  /** Lift and glow on hover (use for clickable panels) */
  interactive?: boolean;
  className?: string;
  /** Render as a different element, e.g. "section", "article" or "div" */
  as?: ElementType;
}

const STATUS_BORDER: Record<PanelStatus, string> = {
  neutral: "",
  normal: "!border-safe/60",
  watch: "!border-warning/70",
  caution: "!border-caution/70",
  urgent: "!border-danger/70",
};

const STATUS_ICON: Record<PanelStatus, string> = {
  neutral: "text-accent",
  normal: "text-safe",
  watch: "text-warning",
  caution: "text-caution",
  urgent: "text-danger",
};

export default function GlassPanel({
  children,
  title,
  eyebrow,
  icon: Icon,
  status = "neutral",
  interactive = false,
  className = "",
  as: Component = "section",
}: GlassPanelProps) {
  const classes = [
    "glass-panel p-5 sm:p-6",
    interactive ? "glass-panel-hover" : "",
    STATUS_BORDER[status],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes}>
      {(title || eyebrow) && (
        <header className="mb-4 flex items-start gap-3">
          {Icon && (
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-canvas/60 ${STATUS_ICON[status]}`}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="label-mono mb-1">{eyebrow}</p>}
            {title && <h2 className="!text-base sm:!text-lg">{title}</h2>}
          </div>
        </header>
      )}
      {children}
    </Component>
  );
}
