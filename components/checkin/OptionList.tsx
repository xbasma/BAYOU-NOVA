"use client";

/** A vertical list of large radio options. Native radios, so arrow keys and screen readers work. */
export default function OptionList<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  hideLegend = false,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string; note?: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  hideLegend?: boolean;
}) {
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "mb-3 text-sm font-medium text-ink"}>{legend}</legend>
      <div className="space-y-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                checked ? "border-ink bg-ink text-champagne" : "border-ink/15 bg-white/55 text-ink hover:border-accent/60"
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  checked ? "border-champagne" : "border-ink/40"
                }`}
              >
                {checked && <span className="h-2 w-2 rounded-full bg-ember" />}
              </span>
              <span>
                {o.label}
                {o.note && <span className={`block text-xs ${checked ? "text-champagne/75" : "text-muted"}`}>{o.note}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
