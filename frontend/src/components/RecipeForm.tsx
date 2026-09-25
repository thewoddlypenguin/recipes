import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RecipeDetail, RecipeInput, Term, TermType } from "../types";
import { slugify } from "../lib/format";
import ImageUpload from "./ImageUpload";
import TagSelector from "./TagSelector";
import IngredientEditor from "./IngredientEditor";
import InstructionEditor from "./InstructionEditor";
import type { Ingredient, RecipeNote, Step } from "../types";

interface Props {
  initial?: RecipeDetail | null;
  terms: Term[];
  busy?: boolean;
  error?: string | null;
  onSave: (payload: RecipeInput) => void;
  onArchive?: () => void;
}

const CLASSIFICATIONS: { type: TermType; label: string }[] = [
  { type: "course", label: "Course" },
  { type: "cuisine", label: "Cuisine" },
  { type: "diet", label: "Diet" },
  { type: "equipment", label: "Equipment" },
  { type: "tag", label: "General Tags" },
];

/** Shared Add/Edit recipe form. */
export default function RecipeForm({ initial, terms, busy, error, onSave, onArchive }: Props) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState<string>(initial?.servings?.toString() ?? "");
  const [prepMinutes, setPrepMinutes] = useState<string>(initial?.prep_minutes?.toString() ?? "");
  const [cookMinutes, setCookMinutes] = useState<string>(initial?.cook_minutes?.toString() ?? "");
  const [totalMinutes, setTotalMinutes] = useState<string>(initial?.total_minutes?.toString() ?? "");
  const [totalTouched, setTotalTouched] = useState(Boolean(initial));
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");
  const [familyNote, setFamilyNote] = useState(initial?.family_note ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? null);
  const [imageAlt, setImageAlt] = useState(initial?.image_alt ?? "");
  const [status, setStatus] = useState(initial?.status ?? "published");

  const selectedTerms = useMemo(() => {
    const map = new Map<TermType, string[]>();
    if (initial) {
      Object.entries(initial.terms).forEach(([type, names]) => {
        map.set(type as TermType, names);
      });
    } else {
      map.set("course", []);
      map.set("cuisine", []);
      map.set("diet", []);
      map.set("equipment", []);
      map.set("tag", []);
    }
    return map;
  }, [initial]);
  const [termSelection, setTermSelection] = useState<Map<TermType, string[]>>(selectedTerms);

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients.map((i) => ({ ...i })) ?? [],
  );
  const [steps, setSteps] = useState<Step[]>(initial?.steps.map((s) => ({ ...s })) ?? []);
  const [notes, setNotes] = useState<RecipeNote[]>(initial?.notes.map((n) => ({ ...n })) ?? []);

  const effectiveTotal = totalTouched && totalMinutes !== "" ? Number(totalMinutes) : null;
  const autoTotal =
    prepMinutes !== "" && cookMinutes !== "" ? Number(prepMinutes) + Number(cookMinutes) : null;
  const shownTotal = totalTouched && totalMinutes !== "" ? Number(totalMinutes) : autoTotal;

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const toggleTerm = (type: TermType, name: string) => {
    setTermSelection((prev) => {
      const next = new Map(prev);
      const list = next.get(type) ?? [];
      next.set(
        type,
        list.some((n) => n.toLowerCase() === name.toLowerCase())
          ? list.filter((n) => n.toLowerCase() !== name.toLowerCase())
          : [...list, name],
      );
      return next;
    });
  };

  const addTerm = (type: TermType, name: string) => {
    setTermSelection((prev) => {
      const next = new Map(prev);
      const list = next.get(type) ?? [];
      next.set(type, [...list, name]);
      return next;
    });
  };

  const save = () => {
    const termRefs = Array.from(termSelection.entries()).flatMap(([type, names]) =>
      names.map((name) => ({ type, name })),
    );
    onSave({
      title,
      slug: slug || undefined,
      summary,
      description,
      servings: servings === "" ? null : Number(servings),
      prep_minutes: prepMinutes === "" ? null : Number(prepMinutes),
      cook_minutes: cookMinutes === "" ? null : Number(cookMinutes),
      total_minutes: shownTotal ?? effectiveTotal,
      source_url: sourceUrl || null,
      family_note: familyNote || null,
      status,
      image_url: imageUrl,
      image_alt: imageAlt || null,
      ingredients: ingredients.map((row, i) => ({ ...row, sort_order: i })),
      steps: steps.map((row, i) => ({ ...row, sort_order: i, step_number: i + 1 })),
      notes: notes.map((row, i) => ({ ...row, sort_order: i })),
      terms: termRefs,
    });
  };

  const canSave = title.trim().length > 0 && !busy;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Basic info */}
        <section className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Basic Info</h2>

          <div>
            <label htmlFor="title" className="field-label">
              Title *
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full"
              required
              placeholder="One Pot Lemon Ricotta Pasta"
            />
          </div>

          <div>
            <label htmlFor="slug" className="field-label">
              Slug (URL)
            </label>
            <input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="w-full font-mono text-sm"
              placeholder="auto-generated from title"
            />
          </div>

          <div>
            <label htmlFor="summary" className="field-label">
              Description / Summary
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full"
              placeholder="Quick, creamy weeknight pasta…"
            />
          </div>

          <div>
            <label htmlFor="description" className="field-label">
              Longer description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="servings" className="field-label">
                Servings
              </label>
              <input
                id="servings"
                type="number"
                min={0}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="prep" className="field-label">
                Prep (min)
              </label>
              <input
                id="prep"
                type="number"
                min={0}
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="cook" className="field-label">
                Cook (min)
              </label>
              <input
                id="cook"
                type="number"
                min={0}
                value={cookMinutes}
                onChange={(e) => setCookMinutes(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="total" className="field-label">
              Total time (minutes) — {autoTotal !== null ? `auto: ${autoTotal}` : "leave blank to auto-calculate"}
            </label>
            <input
              id="total"
              type="number"
              min={0}
              value={totalTouched ? totalMinutes : ""}
              placeholder={autoTotal !== null ? String(autoTotal) : ""}
              onChange={(e) => {
                setTotalTouched(true);
                setTotalMinutes(e.target.value);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="source" className="field-label">
              Source URL
            </label>
            <input
              id="source"
              type="url"
              value={sourceUrl ?? ""}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full"
              placeholder="https://…"
            />
          </div>

          <div>
            <label htmlFor="family" className="field-label">
              Family note
            </label>
            <textarea
              id="family"
              value={familyNote ?? ""}
              onChange={(e) => setFamilyNote(e.target.value)}
              rows={2}
              className="w-full"
              placeholder="Grandma's trick, who loves it, when we make it…"
            />
          </div>

          <div>
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </section>

        {/* Image */}
        <section className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Image</h2>
          <ImageUpload
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            recipeSlug={slug || undefined}
            onChange={(url, alt) => {
              setImageUrl(url);
              if (alt !== undefined && alt) setImageAlt((current) => current || alt);
            }}
          />
          <div>
            <label htmlFor="alt" className="field-label">
              Image alt text
            </label>
            <input id="alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className="w-full" />
          </div>
        </section>
      </div>

      {/* Classification */}
      <section className="card space-y-5 p-6">
        <h2 className="font-display text-lg font-semibold">Classification</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {CLASSIFICATIONS.map(({ type, label }) => (
            <TagSelector
              key={type}
              type={type}
              label={label}
              options={terms.filter((t) => t.type === type)}
              selected={termSelection.get(type) ?? []}
              onToggle={(name) => toggleTerm(type, name)}
              onAddCustom={(name) => addTerm(type, name)}
            />
          ))}
        </div>
      </section>

      {/* Ingredients */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Ingredients</h2>
        <p className="mb-4 mt-1 text-xs text-charcoal/50">
          Ingredient names automatically become searchable ingredient filters.
        </p>
        <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
      </section>

      {/* Instructions */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Instructions</h2>
        <p className="mb-4 mt-1 text-xs text-charcoal/50">Optional timers show a countdown button in Cooking Mode.</p>
        <InstructionEditor steps={steps} onChange={setSteps} />
      </section>

      {/* Notes */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Notes</h2>
        <div className="space-y-2">
          {notes.map((note, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={note.body}
                onChange={(e) => setNotes(notes.map((n, j) => (j === i ? { ...n, body: e.target.value } : n)))}
                rows={2}
                aria-label={`Note ${i + 1}`}
                className="flex-1 text-sm"
                placeholder="Tip, variation, or family memory…"
              />
              <button
                type="button"
                onClick={() => setNotes(notes.filter((_, j) => j !== i))}
                aria-label={`Remove note ${i + 1}`}
                className="self-start rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-outline !min-h-0 mt-2 px-4 py-2 text-xs"
          onClick={() => setNotes([...notes, { body: "", sort_order: notes.length }])}
        >
          + Add Note
        </button>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pb-10">
        <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
          {busy ? "Saving…" : "Save Recipe"}
        </button>
        <button type="button" className="btn-outline" onClick={() => navigate(-1)}>
          Cancel
        </button>
        {initial && (
          <button type="button" className="btn-outline" onClick={() => navigate(`/recipes/${initial.slug}`)}>
            Preview
          </button>
        )}
        {initial && onArchive && (
          <button
            type="button"
            className="btn-outline text-red-700 hover:bg-red-50"
            onClick={() => {
              if (window.confirm("Archive this recipe? It will be hidden from browsing.")) onArchive();
            }}
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}