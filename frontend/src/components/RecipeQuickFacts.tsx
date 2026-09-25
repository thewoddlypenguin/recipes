import { fmtMinutes } from "../lib/format";

interface Props {
  servings?: number | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  totalMinutes?: number | null;
}

const FACT_STYLES = "rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-center";

/** Quick facts strip: Prep / Cook / Total / Servings. */
export default function RecipeQuickFacts({ servings, prepMinutes, cookMinutes, totalMinutes }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className={FACT_STYLES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Prep Time</p>
        <p className="mt-0.5 text-base font-semibold text-charcoal">{fmtMinutes(prepMinutes)}</p>
      </div>
      <div className={FACT_STYLES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Cook Time</p>
        <p className="mt-0.5 text-base font-semibold text-charcoal">{fmtMinutes(cookMinutes)}</p>
      </div>
      <div className={FACT_STYLES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Total Time</p>
        <p className="mt-0.5 text-base font-semibold text-charcoal">{fmtMinutes(totalMinutes)}</p>
      </div>
      <div className={FACT_STYLES}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Servings</p>
        <p className="mt-0.5 text-base font-semibold text-charcoal">{servings ?? "—"}</p>
      </div>
    </div>
  );
}