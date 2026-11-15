import Image from "next/image";
import { toneClass, type StatusLevel } from "@/lib/health";

/**
 * The logo's nebula as an instrument. The orb sits in a porthole ringed by a
 * slow-turning bezel of tick marks, with one ember dot in orbit. When a status
 * is passed, the ring takes that status colour, so the mark carries live data.
 */
export default function NovaOrb({
  size = 120,
  fluid = false,
  status,
  ringColor,
  tone = "light",
  spin = true,
  priority = false,
  className = "",
}: {
  size?: number;
  /** Fill the parent's width (square) instead of using `size` pixels */
  fluid?: boolean;
  /** Colours the ring with the astronaut's overall status */
  status?: StatusLevel;
  /** Explicit ring colour when there is no status */
  ringColor?: string;
  /** "dark" for dark surfaces (champagne ticks), "light" for the canvas (ink ticks) */
  tone?: "light" | "dark";
  spin?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const ring = status ? toneClass(status).hex : ringColor ?? (tone === "dark" ? "#F6E4C4" : "#B83A10");
  const tick = tone === "dark" ? "#F6E4C4" : "#231423";
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  const compact = !fluid && size < 70;

  return (
    <div
      className={`relative shrink-0 ${fluid ? "aspect-square w-full" : ""} ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {!compact && (
          <g
            className={spin ? "animate-orb-spin-rev" : ""}
            style={{ transformOrigin: "100px 100px" }}
            stroke={tick}
            strokeLinecap="round"
          >
            {ticks.map((i) => {
              const a = (i / 72) * Math.PI * 2;
              const major = i % 6 === 0;
              const r1 = major ? 91 : 94;
              return (
                <line
                  key={i}
                  x1={100 + Math.sin(a) * r1}
                  y1={100 - Math.cos(a) * r1}
                  x2={100 + Math.sin(a) * 98}
                  y2={100 - Math.cos(a) * 98}
                  strokeWidth={major ? 1.4 : 0.8}
                  opacity={major ? 0.7 : 0.4}
                />
              );
            })}
          </g>
        )}
        <circle cx="100" cy="100" r={compact ? 96 : 86} fill="none" stroke={ring} strokeWidth={compact ? 6 : 2.6} />
        {!compact && (
          <g className={spin ? "animate-orb-spin" : ""} style={{ transformOrigin: "100px 100px" }}>
            <circle cx="100" cy="14" r="4" fill="#F06018" />
            <circle cx="100" cy="14" r="8" fill="#F06018" opacity="0.25" />
          </g>
        )}
      </svg>
      <div
        className="absolute overflow-hidden rounded-full bg-ink"
        style={{ inset: compact ? "14%" : "15%" }}
      >
        <Image
          src={compact ? "/brand/nova-orb-sm.webp" : "/brand/nova-orb.webp"}
          alt=""
          width={compact ? 220 : 900}
          height={compact ? 220 : 900}
          priority={priority}
          className="h-full w-full scale-[1.04] object-cover"
        />
      </div>
    </div>
  );
}
