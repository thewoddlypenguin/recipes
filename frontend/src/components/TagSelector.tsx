import { useState } from "react";
import type { Term, TermType } from "../types";

interface Props {
  type: TermType;
  label: string;
  options: Term[];
  selected: string[];
  onToggle: (name: string) => void;
  onAddCustom: (name: string) => void;
}

/** Chip-based multi-select for a term type, with a "add new" input. */
export default function TagSelector({ type, label, options, selected, onToggle, onAddCustom }: Props) {
  const [custom, setCustom] = useState("");

  const selectedList = Array.isArray(selected) ? selected : [];
  const knownNames = new Set(options.map((t) => t.name.toLowerCase()));
  const extras = selectedList.filter((s) => !knownNames.has(s.toLowerCase()));


  const add = () => {
    const name = custom.trim();
    if (name && !selectedList.some((s) => s.toLowerCase() === name.toLowerCase())) {
      onAddCustom(name);
    }
    setCustom("");
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((term) => {
          const active = selected.some((s) => s.toLowerCase() === term.name.toLowerCase());
          return (
            <button
              key={term.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(term.name)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-sage-600 text-white" : "bg-sand-100 text-charcoal/70 hover:bg-sand-200"
              }`}
            >
              {term.name}
            </button>
          );
        })}
        {extras.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed="true"
            onClick={() => onToggle(name)}
            className="rounded-full bg-sage-600 px-3 py-1.5 text-xs font-semibold text-white"
            title="Remove"
          >
            {name} ✕
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={custom}
          placeholder={`Add ${label.toLowerCase()}…`}
          aria-label={`Add ${label.toLowerCase()}`}
          className="h-9 flex-1 text-xs"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="btn-outline !min-h-0 px-3 py-1.5 text-xs">
          Add
        </button>
      </div>
      <input type="hidden" data-term-type={type} />
    </div>
  );
}