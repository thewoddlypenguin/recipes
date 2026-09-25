import { Link } from "react-router-dom";
import { fmtMinutes } from "../lib/format";
import type { RecipeListItem } from "../types";

export default function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-card-lg">
      <Link to={`/recipes/${recipe.slug}`} className="block" aria-label={`View recipe: ${recipe.title}`}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-100">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.image_alt || recipe.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sage-100 to-sand-200 text-4xl">
              🍽️
            </div>
          )}
          {recipe.course && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-charcoal shadow-card">
              {recipe.course}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/recipes/${recipe.slug}`}>
          <h3 className="font-display text-lg font-semibold leading-snug text-charcoal hover:text-sage-700">
            {recipe.title}
          </h3>
        </Link>

        {recipe.summary && <p className="line-clamp-2 text-sm text-charcoal/70">{recipe.summary}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-charcoal/60">
          {recipe.total_minutes !== null && recipe.total_minutes !== undefined && (
            <span className="inline-flex items-center gap-1" title="Total time">
              <span aria-hidden>⏱</span> {fmtMinutes(recipe.total_minutes)}
            </span>
          )}
          {recipe.servings !== null && recipe.servings !== undefined && (
            <span className="inline-flex items-center gap-1" title="Servings">
              <span aria-hidden>🍽</span> {recipe.servings} servings
            </span>
          )}
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          <Link to={`/recipes/${recipe.slug}`} className="btn-secondary w-full">
            View Recipe
          </Link>
        </div>
      </div>
    </article>
  );
}