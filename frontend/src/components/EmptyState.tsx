import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function EmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  const { isEditor } = useAuth();
  return (
    <div className="card mx-auto mt-10 max-w-lg px-8 py-12 text-center">
      <div aria-hidden className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-3xl">
        🔍
      </div>
      <h2 className="font-display text-xl font-semibold">No recipes found.</h2>
      <p className="mt-2 text-sm text-charcoal/70">
        Try clearing filters or searching for another ingredient.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onClearFilters && (
          <button type="button" className="btn-primary" onClick={onClearFilters}>
            Clear Filters
          </button>
        )}
        {isEditor && (
          <Link to="/admin/recipes/new" className="btn-outline">
            Add New Recipe
          </Link>
        )}
      </div>
    </div>
  );
}