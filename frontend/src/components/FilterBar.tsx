import type { Term, TermType } from "../types";

export interface FilterValues {
  q?: string;
  course?: string;
  cuisine?: string;
  diet?: string;
  ingredient?: string;
  equipment?: string;
  tag?: string;
}

const GROUPS: { key: TermType; label: string }[] = [
  { key: "course", label: "Course" },
  { key: "cuisine", label: "Cuisine" },
  { key: "diet", label: "Diet" },
  { key: "ingredient", label: "Ingredient" },
  { key: "equipment", label: "Equipment" },
  { key: "tag", label: "Tags" },
];

interface Props {
  values: FilterValues;
  terms: Term[];
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  includeDrafts?: boolean;
  onIncludeDraftsChange?: (include: boolean) => void;
  canSeeDrafts?: boolean;
}

/**
 * Row of filter chip dropdowns (one per term type).
 * Values are term names; the backend matches name or slug.
 */
export default function FilterBar({ values, terms, onChange, onClear, includeDrafts, onIncludeDraftsChange, canSeeDrafts }: Props) {
  // Defensive: a bad API/proxy payload must never crash the render.
  const termList = Array.isArray(terms) ? terms : [];
  const hasAny = GROUPS.some((g) => values[g.key]) || (canSeeDrafts && includeDrafts);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {GROUPS.map(({ key, label }) => {
        const options = termList.filter((t) => t && t.type === key);
        if (options.length === 0) return null;
        return (
          <div key={key} className="relative">
            <select
              aria-label={`Filter by ${label.toLowerCase()}`}
              value={values[key] ?? ""}
              onChange={(e) => onChange({ ...values, [key]: e.target.value || undefined })}
              className={`h-10 cursor-pointer appearance-none rounded-full border bg-white pl-4 pr-9 text-sm font-medium shadow-card ${
                values[key] ? "border-sage-500 text-sage-700" : "border-sand-300 text-charcoal/80"
              }`}
            >
              <option value="">{label}</option>
              {options.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      })}

      {canSeeDrafts && onIncludeDraftsChange && (
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-sm font-medium text-charcoal/80 shadow-card">
          <input
            type="checkbox"
            className="h-4 w-4 accent-sage-600"
            checked={includeDrafts ?? false}
            onChange={(e) => onIncludeDraftsChange(e.target.checked)}
          />
          Include drafts
        </label>
      )}

      {hasAny && (
        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-full px-4 text-sm font-semibold text-dusk-600 underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}