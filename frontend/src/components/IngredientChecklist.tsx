import { useState } from "react";
import type { Ingredient } from "../types";

/** Checklist of structured ingredients, grouped by section when present. */
export default function IngredientChecklist({
  ingredients,
  size = "normal",
}: {
  ingredients: Ingredient[];
  /** "normal" for the detail page, "large" for Cooking Mode */
  size?: "normal" | "large";
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const sections: { name: string | null; items: { ingredient: Ingredient; index: number }[] }[] = [];
  ingredients.forEach((ingredient, index) => {
    const section = ingredient.section?.trim() || null;
    const bucket = sections.find((s) => s.name === section);
    const entry = { ingredient, index };
    if (bucket) {
      bucket.items.push(entry);
    } else {
      sections.push({ name: section, items: [entry] });
    }
  });

  const labelSize = size === "large" ? "text-lg sm:text-xl" : "text-[15px]";
  const boxSize = size === "large" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className={size === "large" ? "space-y-6" : "space-y-5"}>
      {sections.map((section) => (
        <fieldset key={section.name ?? "__all"} className="print-break-avoid">
          {section.name && (
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal/50">
              {section.name}
            </legend>
          )}
          <ul className={size === "large" ? "space-y-4" : "space-y-2.5"}>
            {section.items.map(({ ingredient, index }) => {
              const isChecked = checked.has(index);
              const text = [
                ingredient.quantity,
                ingredient.unit,
                ingredient.ingredient_name,
                ingredient.preparation,
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <li key={index}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 ${isChecked ? "opacity-50 line-through" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(index)}
                      className={`mt-1 shrink-0 accent-sage-600 ${boxSize}`}
                    />
                    <span className={`${labelSize} leading-snug`}>
                      {text}
                      {ingredient.notes && (
                        <span className="ml-1 text-sm text-charcoal/50">({ingredient.notes})</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}