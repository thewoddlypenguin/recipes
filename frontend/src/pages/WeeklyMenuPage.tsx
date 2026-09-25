import { useEffect, useMemo, useState } from "react";
import type { RecipeListItem, WeeklyMenu } from "../types";
import { getWeeklyMenu, listRecipes, updateWeeklyMenu } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { addDays, dayDateLabel, fmtDate, mondayOf, toISODate, weekRangeLabel } from "../lib/format";
import { DAY_NAMES } from "../types";
interface DraftSlot {
  recipe_id: number | null;
  note: string;
}

export default function WeeklyMenuPage() {
  const { isEditor } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [menu, setMenu] = useState<WeeklyMenu | null>(null);
  const [draft, setDraft] = useState<Map<number, DraftSlot>>(new Map());
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWeeklyMenu(toISODate(weekStart))
      .then((data) => {
        if (cancelled) return;
        setMenu(data);
        const map = new Map<number, DraftSlot>();
        data.items.forEach((item) => map.set(item.day_of_week, { recipe_id: item.recipe_id ?? null, note: item.note }));
        setDraft(map);
        setDirty(false);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  useEffect(() => {
    listRecipes({ limit: 100 })
      .then((res) => setRecipes(res.items))
      .catch(() => setRecipes([]));
  }, []);

  const updateSlot = (day: number, patch: Partial<DraftSlot>) => {
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(day, { recipe_id: null, note: "", ...prev.get(day), ...patch });
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!menu) return;
    setSaving(true);
    setError(null);
    try {
      const items = Array.from(draft.entries())
        .sort(([a], [b]) => a - b)
        .map(([day_of_week, slot]) => ({
          day_of_week,
          recipe_id: slot.recipe_id,
          note: slot.note,
        }));
      const updated = await updateWeeklyMenu(menu.id, { items });
      setMenu(updated);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const clearWeek = () => {
    setDraft((prev) => {
      const next = new Map(prev);
      Array.from(next.keys()).forEach((day) => next.set(day, { recipe_id: null, note: "" }));
      return next;
    });
    setDirty(true);
  };

  const focusFirstEmpty = () => {
    const firstEmpty = Array.from(draft.keys())
      .sort((a, b) => a - b)
      .find((day) => draft.get(day)?.recipe_id == null);
    const el = document.getElementById(`meal-select-${firstEmpty ?? 0}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  };

  const meals = useMemo(
    () =>
      Array.from(draft.entries())
        .sort(([a], [b]) => a - b)
        .map(([day, slot]) => ({
          day,
          slot,
          recipe: recipes.find((r) => r.id === slot.recipe_id),
        })),
    [draft, recipes],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Weekly Menu</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Week of {weekRangeLabel(weekStart)} · dinners, planned together
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous week" className="btn-outline !min-h-0 h-10 w-10 px-0 text-lg" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ‹
          </button>
          <button type="button" className="btn-outline !min-h-0 h-10 px-3 text-xs" onClick={() => setWeekStart(mondayOf(new Date()))}>
            This week
          </button>
          <button type="button" aria-label="Next week" className="btn-outline !min-h-0 h-10 w-10 px-0 text-lg" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            ›
          </button>
        </div>
      </div>

      {!isEditor && (
        <p className="mt-4 rounded-xl bg-dusk-50 px-4 py-3 text-sm text-dusk-800">
          You're viewing the menu as a guest — log in to make changes.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 text-sm text-charcoal/50" role="status">
          Loading menu…
        </p>
      )}
      <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${loading ? "opacity-50" : ""}`}>
        {meals.map(({ day, slot, recipe }) => (
          <div key={day} className="card print-break-avoid p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{DAY_NAMES[day]}</h2>
              <span className="text-xs font-medium text-charcoal/50">{dayDateLabel(weekStart, day)}</span>
            </div>

            {recipe ? (
              <a href={`/recipes/${recipe.slug}`} className="mt-2 block text-sm font-semibold text-dusk-600 hover:underline">
                🍽 {recipe.title}
              </a>
            ) : (
              <p className="mt-2 text-sm text-charcoal/40">Nothing planned yet</p>
            )}

            <div className="mt-3 space-y-2">
              <select
                id={`meal-select-${day}`}
                value={slot.recipe_id ?? ""}
                disabled={!isEditor}
                aria-label={`Choose a recipe for ${DAY_NAMES[day]}`}
                onChange={(e) => updateSlot(day, { recipe_id: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full"
              >
                <option value="">— Pick a recipe —</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={slot.note}
                disabled={!isEditor}
                aria-label={`Note for ${DAY_NAMES[day]}`}
                placeholder="Note (thaw the bread dough, double batch…)"
                onChange={(e) => updateSlot(day, { note: e.target.value })}
                className="w-full text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {menu && (
        <p className="mt-4 text-center text-xs text-charcoal/40">
          Menu saved {fmtDate(menu.week_start_date)} · {menu.title}
        </p>
      )}

      {isEditor && (
        <div className="no-print mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving…" : dirty ? "Save Menu" : "Saved ✓"}
          </button>
          <button type="button" className="btn-outline" onClick={focusFirstEmpty}>
            Add Meal
          </button>
          <button type="button" className="btn-outline" onClick={clearWeek}>
            Clear Week
          </button>
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            Print Menu
          </button>
        </div>
      )}
    </div>
  );
}