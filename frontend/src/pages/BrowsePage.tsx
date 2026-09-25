import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { RecipeListResponse, Term } from "../types";
import { listRecipes, listTerms } from "../api/client";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import type { FilterValues } from "../components/FilterBar";
import FilterDrawer from "../components/FilterDrawer";
import RecipeGrid from "../components/RecipeGrid";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../hooks/useAuth";

const PAGE_SIZE = 24;

/** Home / recipe browse: search + filter chips + responsive card grid. */
export default function BrowsePage() {
  const { isEditor } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [terms, setTerms] = useState<Term[]>([]);
  const [result, setResult] = useState<RecipeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const filters: FilterValues = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      course: searchParams.get("course") ?? undefined,
      cuisine: searchParams.get("cuisine") ?? undefined,
      diet: searchParams.get("diet") ?? undefined,
      ingredient: searchParams.get("ingredient") ?? undefined,
      equipment: searchParams.get("equipment") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
    }),
    [searchParams],
  );

  const includeDrafts = isEditor && searchParams.get("drafts") === "1";

  const setFilters = useCallback(
    (next: FilterValues) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        const setOrDelete = (key: string, value?: string) => {
          if (value) params.set(key, value);
          else params.delete(key);
        };
        setOrDelete("q", next.q || undefined);
        setOrDelete("course", next.course);
        setOrDelete("cuisine", next.cuisine);
        setOrDelete("diet", next.diet);
        setOrDelete("ingredient", next.ingredient);
        setOrDelete("equipment", next.equipment);
        setOrDelete("tag", next.tag);
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Load taxonomy terms once for the filter dropdowns.
  useEffect(() => {
    listTerms().then(setTerms).catch(() => setTerms([]));
  }, []);

  // Fetch recipes whenever the query changes (debounced for typing).
  useEffect(() => {
    const doFetch = () => {
      setLoading(true);
      setError(null);
      listRecipes({
        q: filters.q || undefined,
        course: filters.course,
        cuisine: filters.cuisine,
        diet: filters.diet,
        ingredient: filters.ingredient,
        equipment: filters.equipment,
        tag: filters.tag,
        status: includeDrafts ? "all" : undefined,
        limit: PAGE_SIZE,
      })
        .then(setResult)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    };

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (filters.q) {
      debounceRef.current = window.setTimeout(doFetch, 300);
    } else {
      doFetch();
    }
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters, includeDrafts]);

  const recipes = result?.items ?? [];
  const hasAnyFilter = Boolean(
    filters.q || filters.course || filters.cuisine || filters.diet || filters.ingredient || filters.equipment || filters.tag,
  );

  return (
    <div>
      <div className="no-print">
        <SearchBar value={filters.q ?? ""} onChange={(q) => setFilters({ ...filters, q })} />

        {/* Desktop filter chips */}
        <div className="mt-4 hidden lg:block">
          <FilterBar
            values={filters}
            terms={terms}
            onChange={setFilters}
            onClear={clearFilters}
            canSeeDrafts={isEditor}
            includeDrafts={includeDrafts}
            onIncludeDraftsChange={(include) =>
              setSearchParams(
                (prev) => {
                  const params = new URLSearchParams(prev);
                  if (include) params.set("drafts", "1");
                  else params.delete("drafts");
                  return params;
                },
                { replace: true },
              )
            }
          />
        </div>

        {/* Mobile filters */}
        <div className="mt-4 flex items-center gap-3 lg:hidden">
          <FilterDrawer
            values={filters}
            terms={terms}
            onChange={setFilters}
            onClear={clearFilters}
            canSeeDrafts={isEditor}
            includeDrafts={includeDrafts}
            onIncludeDraftsChange={(include) =>
              setSearchParams(
                (prev) => {
                  const params = new URLSearchParams(prev);
                  if (include) params.set("drafts", "1");
                  else params.delete("drafts");
                  return params;
                },
                { replace: true },
              )
            }
          />
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">
          {hasAnyFilter ? "Search results" : "Family Recipes"}
        </h1>
        {result && (
          <p className="text-sm text-charcoal/60" aria-live="polite">
            {loading ? "Searching…" : `${result.total} recipe${result.total === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      <div className="mt-4">
        {error && (
          <div className="card p-6 text-sm text-red-700" role="alert">
            Couldn't load recipes: {error}
          </div>
        )}
        {!error && loading && !result && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-white/70" />
            ))}
          </div>
        )}
        {!error && result && recipes.length === 0 && <EmptyState onClearFilters={hasAnyFilter ? clearFilters : undefined} />}
        {!error && recipes.length > 0 && (
          <>
            <RecipeGrid recipes={recipes} />
            {result && result.total > PAGE_SIZE && (
              <p className="mt-6 text-center text-sm text-charcoal/50">
                Showing {recipes.length} of {result.total} recipes — refine your search to see more.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}