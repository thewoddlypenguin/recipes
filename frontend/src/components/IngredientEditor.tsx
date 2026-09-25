import { useState } from "react";
import type { Ingredient } from "../types";

interface Props {
  ingredients: Ingredient[];
  onChange: (rows: Ingredient[]) => void;
}

/** Structured ingredient rows: section / qty / unit / name / preparation-notes. */
export default function IngredientEditor({ ingredients, onChange }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const update = (index: number, patch: Partial<Ingredient>) => {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([
      ...ingredients,
      { quantity: "", unit: "", ingredient_name: "", section: "", preparation: "", notes: "", sort_order: ingredients.length },
    ]);
  };

  const removeRow = (index: number) => {
    onChange(
      ingredients
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sort_order: i })),
    );
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ingredients.length) return;
    const rows = [...ingredients];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onChange(rows.map((row, i) => ({ ...row, sort_order: i })));
  };

  const parsePasted = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
    const parsed: Ingredient[] = lines.map((original, i) => {
      const row: Ingredient = {
        ingredient_name: original,
        original_text: original,
        section: "",
        quantity: "",
        unit: "",
        preparation: "",
        notes: "",
        sort_order: i,
      };
      // Rough split: "1 cup flour" / "2 tbsp butter, melted"
      const m = original.match(/^([\d\s./¼½¾⅓⅔⅛⅜⅝⅚]+)\s*([a-zA-Z.]+)?\s+(.+)$/);
      if (m) {
        row.quantity = m[1].trim();
        const maybeUnit = (m[2] ?? "").toLowerCase();
        const knownUnits = ["cup", "cups", "tbsp", "tsp", "lb", "lbs", "oz", "g", "kg", "ml", "l", "clove", "cloves", "can", "cans", "package", "pack", "stick", "sticks", "tbsp.", "tsp.", "pinch", "dash"];
        if (knownUnits.includes(maybeUnit)) {
          row.unit = maybeUnit;
          row.ingredient_name = m[3];
        } else {
          row.ingredient_name = `${maybeUnit ? maybeUnit + " " : ""}${m[3]}`.trim();
        }
      }
      const commaParts = row.ingredient_name.split(",");
      if (commaParts.length > 1) {
        row.ingredient_name = commaParts[0].trim();
        row.preparation = commaParts.slice(1).join(",").trim();
      }
      return row;
    });
    if (parsed.length > 0) {
      onChange([...ingredients, ...parsed.map((row, i) => ({ ...row, sort_order: ingredients.length + i }))]);
    }
    setPasteText("");
    setPasteOpen(false);
  };

  return (
    <div className="space-y-3">
      {ingredients.length === 0 && (
        <p className="text-sm text-charcoal/50">No ingredients yet — add your first one below.</p>
      )}

      {ingredients.map((row, i) => (
        <div key={i} className="rounded-xl border border-sand-200 bg-sand-50 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr_2fr_auto]">
            <input
              value={row.section ?? ""}
              onChange={(e) => update(i, { section: e.target.value })}
              placeholder="Section"
              aria-label={`Ingredient ${i + 1} section`}
              className="h-10 text-sm"
            />
            <input
              value={row.quantity ?? ""}
              onChange={(e) => update(i, { quantity: e.target.value })}
              placeholder="Qty"
              aria-label={`Ingredient ${i + 1} quantity`}
              className="h-10 text-sm"
            />
            <input
              value={row.unit ?? ""}
              onChange={(e) => update(i, { unit: e.target.value })}
              placeholder="Unit"
              aria-label={`Ingredient ${i + 1} unit`}
              className="h-10 text-sm"
            />
            <input
              value={row.ingredient_name}
              onChange={(e) => update(i, { ingredient_name: e.target.value })}
              placeholder="Ingredient"
              aria-label={`Ingredient ${i + 1} name`}
              required
              className="h-10 text-sm"
            />
            <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
              <input
                value={row.preparation ?? ""}
                onChange={(e) => update(i, { preparation: e.target.value })}
                placeholder="Prep / notes"
                aria-label={`Ingredient ${i + 1} preparation`}
                className="h-10 min-w-0 flex-1 text-sm"
              />
              <div className="flex shrink-0 flex-col">
                <button type="button" onClick={() => moveRow(i, -1)} aria-label={`Move ingredient ${i + 1} up`} className="px-1 text-xs text-charcoal/40 hover:text-charcoal">
                  ▲
                </button>
                <button type="button" onClick={() => moveRow(i, 1)} aria-label={`Move ingredient ${i + 1} down`} className="px-1 text-xs text-charcoal/40 hover:text-charcoal">
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`Remove ingredient ${i + 1}`}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-outline !min-h-0 px-4 py-2 text-xs" onClick={addRow}>
          + Add Ingredient
        </button>
        <button type="button" className="btn-outline !min-h-0 px-4 py-2 text-xs" onClick={() => setPasteOpen(!pasteOpen)}>
          Paste Ingredient List
        </button>
      </div>

      {pasteOpen && (
        <div className="rounded-xl border border-dusk-200 bg-dusk-50 p-3">
          <label htmlFor="paste-ingredients" className="text-xs font-semibold text-dusk-800">
            Paste a plain ingredient list (one per line) — you can fix details after.
          </label>
          <textarea
            id="paste-ingredients"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            className="mt-2 w-full font-mono text-xs"
            placeholder={"1 lb linguine\n1 cup ricotta\n1 lemon, zested and juiced"}
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={parsePasted} className="btn-secondary !min-h-0 px-4 py-1.5 text-xs">
              Parse lines
            </button>
            <button type="button" onClick={() => setPasteOpen(false)} className="btn-outline !min-h-0 px-4 py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}