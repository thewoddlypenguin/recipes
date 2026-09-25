import { useState } from "react";
import FilterBar from "./FilterBar";
import type { FilterValues } from "./FilterBar";
import type { Term } from "../types";

interface Props {
  values: FilterValues;
  terms: Term[];
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  includeDrafts?: boolean;
  onIncludeDraftsChange?: (include: boolean) => void;
  canSeeDrafts?: boolean;
}

/** Mobile "Filters" toggle that reveals the filter controls in a panel. */
export default function FilterDrawer(props: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = [props.values.course, props.values.cuisine, props.values.diet, props.values.ingredient, props.values.equipment, props.values.tag].filter(Boolean).length;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-sand-300 bg-white px-4 text-sm font-semibold text-charcoal shadow-card"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M7 12h10m-7 6h4" strokeLinecap="round" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-card">
          <FilterBar {...props} />
        </div>
      )}
    </div>
  );
}