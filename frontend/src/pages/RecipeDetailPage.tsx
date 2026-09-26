import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RecipeDetail as Recipe } from "../types";
import { archiveRecipe, assetUrl, getRecipe } from "../api/client";
import RecipeQuickFacts from "../components/RecipeQuickFacts";
import IngredientChecklist from "../components/IngredientChecklist";
import InstructionList from "../components/InstructionList";
import RecipeActions from "../components/RecipeActions";
import { useAuth } from "../hooks/useAuth";

const chipColor = (type: string) =>
  type === "course"
    ? "bg-sage-100 text-sage-800"
    : type === "cuisine"
      ? "bg-dusk-100 text-dusk-700"
      : "bg-sand-100 text-charcoal/80";

export default function RecipeDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isEditor, user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getRecipe(slug)
      .then((data) => {
        if (!cancelled) setRecipe(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const doArchive = async () => {
    if (!recipe) return;
    await archiveRecipe(recipe.id);
    setArchived(true);
  };

  if (loading) {
    return (
      <div className="card mx-auto mt-10 h-96 max-w-4xl animate-pulse" role="status" aria-label="Loading recipe" />
    );
  }

  if (notFound || !recipe || archived) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-10 text-center">
        <p className="font-display text-xl font-semibold">{archived ? "Recipe archived." : "Recipe not found."}</p>
        <button type="button" className="btn-primary mt-6" onClick={() => navigate("/")}>
          Back to recipes
        </button>
      </div>
    );
  }

  const termEntries = Object.entries(recipe.terms ?? {});
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

  return (
    <article className="print-full mx-auto max-w-5xl">
      {/* Hero row */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        <div className="overflow-hidden rounded-2xl bg-sand-100 shadow-card">
          {recipe.image_url ? (
            <img
              src={assetUrl(recipe.image_url)}
              alt={recipe.image_alt || recipe.title}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-sage-100 to-sand-200 text-6xl">
              🍽️
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-charcoal sm:text-4xl">
            {recipe.title}
          </h1>
          {recipe.summary && <p className="mt-3 text-base leading-relaxed text-charcoal/70">{recipe.summary}</p>}

          {recipe.status !== "published" && (
            <span className="mt-3 inline-block rounded-full bg-terra-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-terra-700">
              {recipe.status}
            </span>
          )}

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5">
            <RecipeQuickFacts
              servings={recipe.servings}
              prepMinutes={recipe.prep_minutes}
              cookMinutes={recipe.cook_minutes}
              totalMinutes={recipe.total_minutes}
            />
          </div>

          <div className="mt-6">
            <RecipeActions
              slug={recipe.slug}
              onEdit={isEditor ? () => navigate(`/admin/recipes/${recipe.id}/edit`) : undefined}
              onArchive={user?.role === "admin" ? () => void doArchive() : undefined}
            />
          </div>
        </div>
      </div>

      {/* Ingredients + Instructions */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="ingredients-heading" className="print-break-avoid">
          <div className="card p-6">
            <h2 id="ingredients-heading" className="font-display text-xl font-semibold">
              Ingredients
            </h2>
            <div className="mt-4">
              {recipe.ingredients.length > 0 ? (
                <IngredientChecklist ingredients={recipe.ingredients} />
              ) : (
                <p className="text-sm text-charcoal/50">No ingredients yet.</p>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="instructions-heading" className="print-break-avoid">
            <div className="card p-6">
              <h2 id="instructions-heading" className="font-display text-xl font-semibold">
                Instructions
              </h2>
              <div className="mt-4">
                {recipe.steps.length > 0 ? (
                  <InstructionList steps={recipe.steps} />
                ) : (
                  <p className="text-sm text-charcoal/50">No steps yet.</p>
                )}
              </div>
            </div>
          </section>

          {recipe.notes.length > 0 && (
            <section aria-labelledby="notes-heading" className="print-break-avoid">
              <div className="rounded-2xl border border-dusk-200 bg-dusk-50 p-6">
                <h2 id="notes-heading" className="font-display text-xl font-semibold text-dusk-800">
                  Notes
                </h2>
                <ul className="mt-3 space-y-2">
                  {recipe.notes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-charcoal/80">
                      <span aria-hidden className="text-dusk-400">
                        ●
                      </span>
                      <span>{note.body}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Source / family context */}
      {(recipe.family_note || recipe.source_url || termEntries.length > 0) && (
        <section className="print-break-avoid mt-10">
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold">Source & Family Context</h2>
            {recipe.family_note && (
              <p className="mt-3 text-[15px] italic leading-relaxed text-charcoal/80">“{recipe.family_note}”</p>
            )}
            {recipe.source_url && (
              <p className="mt-3 text-sm">
                <span className="font-medium text-charcoal/60">Source: </span>
                <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-dusk-600 underline">
                  {recipe.source_url}
                </a>
              </p>
            )}
            {termEntries.length > 0 && (
              <div className="mt-4 space-y-2">
                {termEntries
                  .filter(([type]) => type !== "tag")
                  .map(([type, names]) => (
                    <p key={type} className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-medium capitalize text-charcoal/60">{type}:</span>
                      {(Array.isArray(names) ? names : []).map((name) => (
                        <span key={name} className={`chip ${chipColor(type)}`}>
                          {name}
                        </span>
                      ))}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}
    </article>
  );
}