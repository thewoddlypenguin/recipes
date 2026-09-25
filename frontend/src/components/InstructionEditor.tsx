import type { Step } from "../types";

interface Props {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

/** Ordered instruction step editor with reorder + optional timer. */
export default function InstructionEditor({ steps, onChange }: Props) {
  const update = (index: number, patch: Partial<Step>) => {
    onChange(steps.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(steps.filter((_, i) => i !== index).map((row, i) => ({ ...row, sort_order: i })));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const rows = [...steps];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onChange(rows.map((row, i) => ({ ...row, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 && <p className="text-sm text-charcoal/50">No steps yet — add your first one below.</p>}

      {steps.map((row, i) => (
        <div key={i} className="flex gap-2 rounded-xl border border-sand-200 bg-sand-50 p-3">
          <div className="flex shrink-0 flex-col items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <button type="button" onClick={() => moveRow(i, -1)} aria-label={`Move step ${i + 1} up`} className="mt-1 text-xs text-charcoal/40 hover:text-charcoal">
              ▲
            </button>
            <button type="button" onClick={() => moveRow(i, 1)} aria-label={`Move step ${i + 1} down`} className="text-xs text-charcoal/40 hover:text-charcoal">
              ▼
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <textarea
              value={row.body}
              onChange={(e) => update(i, { body: e.target.value })}
              rows={2}
              placeholder={`Step ${i + 1}: what happens?`}
              aria-label={`Step ${i + 1} text`}
              className="w-full text-sm"
            />
            <label className="inline-flex items-center gap-2 text-xs text-charcoal/60">
              Timer (minutes)
              <input
                type="number"
                min={0}
                max={600}
                value={row.timer_minutes ?? ""}
                onChange={(e) =>
                  update(i, { timer_minutes: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
                }
                className="h-8 w-20 text-xs"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            aria-label={`Remove step ${i + 1}`}
            className="shrink-0 self-start rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn-outline !min-h-0 px-4 py-2 text-xs"
        onClick={() => onChange([...steps, { body: "", timer_minutes: null, sort_order: steps.length }])}
      >
        + Add Step
      </button>
    </div>
  );
}