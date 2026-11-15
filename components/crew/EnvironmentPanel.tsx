import { Lightbulb, Thermometer, Wind, type LucideIcon } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { SourceTags } from "@/components/learn/SourceTags";
import { buildFactors, ENVIRONMENT_COPY, formatReading, type CrewFactor, type EnvState } from "@/lib/crew";
import { CHART } from "@/lib/theme";

const ICON: Record<string, LucideIcon> = { co2: Wind, light: Lightbulb, temperature: Thermometer };

const STATE: Record<EnvState, { label: string; className: string }> = {
  within: { label: "Within usual range", className: "border-safe/50 bg-safe/10 text-safe" },
  above: { label: "Above usual range", className: "border-warning/60 bg-warning/10 text-warning" },
  below: { label: "Below usual range", className: "border-warning/60 bg-warning/10 text-warning" },
};

/** Small chart of the 14 simulated days, with the usual range shaded. */
function Sparkline({ f }: { f: CrewFactor }) {
  const W = 320;
  const H = 96;
  const pad = 8;
  const values = f.points.map((p) => p.value);
  const lo = Math.min(...values, f.reference.min);
  const hi = Math.max(...values, f.reference.max);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (f.points.length - 1);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);
  const path = f.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = f.points.length - 1;
  const alt = `${f.label}, ${f.points.length} simulated days. ${STATE[f.state].label}. Last seven days average ${formatReading(f, f.recent.mean)}; usual range ${formatReading(f, f.reference.min)} to ${formatReading(f, f.reference.max)}.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt} className="h-24 w-full">
      <rect
        x={pad}
        y={y(f.reference.max)}
        width={W - pad * 2}
        height={Math.max(y(f.reference.min) - y(f.reference.max), 2)}
        fill={CHART.baseline}
        opacity={0.12}
      />
      <line x1={pad} x2={W - pad} y1={y(f.reference.max)} y2={y(f.reference.max)} stroke={CHART.baseline} strokeDasharray="4 3" strokeWidth={1} opacity={0.6} />
      <line x1={pad} x2={W - pad} y1={y(f.reference.min)} y2={y(f.reference.min)} stroke={CHART.baseline} strokeDasharray="4 3" strokeWidth={1} opacity={0.6} />
      <path d={path} fill="none" stroke={CHART.lineA} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(f.points[last].value)} r={4} fill={CHART.lineA} stroke={CHART.dotRing} strokeWidth={2} />
    </svg>
  );
}

/** Environmental Factors: carbon dioxide, lighting and temperature, all simulated. */
export default function EnvironmentPanel() {
  const factors = buildFactors();
  const [first, last] = [factors[0].points[0].day, factors[0].points[factors[0].points.length - 1].day];

  return (
    <section aria-labelledby="crew-env-title">
      <div className="mb-3">
        <p className="label-mono">Environmental factors</p>
        <h2 id="crew-env-title" className="!text-base sm:!text-lg">
          Carbon dioxide, lighting and temperature
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          {ENVIRONMENT_COPY.intro} {ENVIRONMENT_COPY.simulatedNote}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {factors.map((f) => {
          const Icon = ICON[f.id] ?? Wind;
          const st = STATE[f.state];
          return (
            <GlassPanel key={f.id} as="article" title={f.label} eyebrow={`Mission Days ${first} to ${last}`} icon={Icon}>
              <p className="text-xs text-muted">{f.measure}</p>
              <p className="mt-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
                  {st.label}
                </span>
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted">Latest day</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatReading(f, f.recent.latest)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Last 7 days, average</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatReading(f, f.recent.mean)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Usual range</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">
                    {formatReading(f, f.reference.min)} to {formatReading(f, f.reference.max)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <Sparkline f={f} />
                <p className="text-[11px] text-muted">Shaded band: usual range for this simulated habitat.</p>
              </div>

              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-accent underline-offset-4 hover:underline">
                  Show daily values
                </summary>
                <table className="mt-2 w-full text-left text-xs">
                  <caption className="sr-only">{f.label}, daily simulated values</caption>
                  <thead>
                    <tr className="text-muted">
                      <th scope="col" className="py-1 pr-3 font-medium">
                        Mission Day
                      </th>
                      <th scope="col" className="py-1 font-medium">
                        {f.unit}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.points.map((p) => (
                      <tr key={p.day} className="border-t border-ink/10">
                        <td className="py-1 pr-3">{p.day}</td>
                        <td className="py-1">{p.value.toFixed(f.decimals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>

              <div className="mt-4 border-t border-ink/10 pt-3">
                <p className="text-xs font-semibold text-muted">Published context</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/90">{f.context.text}</p>
                <p className="mt-1.5">
                  <SourceTags sources={f.context.sources} />
                </p>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-xs text-muted">
        <p>{ENVIRONMENT_COPY.referenceNote}</p>
        <p>{ENVIRONMENT_COPY.comparisonNote}</p>
      </div>
    </section>
  );
}
