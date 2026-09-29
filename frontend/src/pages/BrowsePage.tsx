import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { RecipeListItem, Term } from "../types";
import { listRecipes, listTerms } from "../api/client";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import type { FilterValues } from "../components/FilterBar";
import FilterDrawer from "../components/FilterDrawer";
import RecipeGrid from "../components/RecipeGrid";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../hooks/useAuth";

const PAGE_SIZE = 24;

/** Home / recipe browse: search + filter chips + responsive card grid with lazy-load. */
export default function BrowsePage() {
  const { isEditor } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [terms, setTerms] = useState<Term[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

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

  // Fetch first page whenever the query changes (debounced for typing).
  useEffect(() => {
    const doFetch = () => {
      const reqId = ++reqIdRef.current;
      setIsInitialLoading(true);
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
        offset: 0,
      })
        .then((data) => {
          if (reqId !== reqIdRef.current) return; // stale
          setRecipes(data.items);
          setTotal(data.total);
          setHasMore(data.items.length < data.total);
        })
        .catch((err: Error) => {
          if (reqId !== reqIdRef.current) return;
          setError(err.message);
        })
        .finally(() => {
          if (reqId !== reqIdRef.current) return;
          setIsInitialLoading(false);
        });
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

  // Load next page (infinite scroll).
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isInitialLoading || error) return;

    const reqId = reqIdRef.current;
    setIsLoadingMore(true);
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
      offset: recipes.length,
    })
      .then((data) => {
        if (reqId !== reqIdRef.current) return; // stale
        setRecipes((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const fresh = data.items.filter((r) => !seen.has(r.id));
          return [...prev, ...fresh];
        });
        setTotal(data.total);
        setHasMore(data.offset + data.items.length < data.total);
      })
      .catch((err: Error) => {
        if (reqId !== reqIdRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (reqId !== reqIdRef.current) return;
        setIsLoadingMore(false);
      });
  }, [isLoadingMore, hasMore, isInitialLoading, error, filters, includeDrafts, recipes.length]);

  // IntersectionObserver sentinel for infinite scroll.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasAnyFilter = Boolean(
    filters.q || filters.course || filters.cuisine || filters.diet || filters.ingredient || filters.equipment || filters.tag,
  );

  return (
    <div>
      <div className="no-print">
        {/* Search + filters on one row (desktop); wraps on mobile */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <SearchBar value={filters.q ?? ""} onChange={(q) => setFilters({ ...filters, q })} />
          </div>

          {/* Desktop filter chips — inline to the right of search */}
          <div className="hidden lg:block">
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

          {/* Mobile filters — wraps below search */}
          <div className="lg:hidden">
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
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">
          {hasAnyFilter ? "Search results" : "Family Recipes"}
        </h1>
        {(total > 0 || !isInitialLoading) && (
          <p className="text-sm text-charcoal/60" aria-live="polite">
            {isInitialLoading ? "Searching…" : `${total} recipe${total === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      <div className="mt-4">
        {error && (
          <div className="card p-6 text-sm text-red-700" role="alert">
            Couldn't load recipes: {error}
          </div>
        )}
        {!error && isInitialLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-white/70" />
            ))}
          </div>
        )}
        {!error && !isInitialLoading && recipes.length === 0 && (
          <EmptyState onClearFilters={hasAnyFilter ? clearFilters : undefined} />
        )}
        {!error && recipes.length > 0 && (
          <>
            <RecipeGrid recipes={recipes} />
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" aria-hidden />
            {isLoadingMore && (
              <p className="mt-6 text-center text-sm text-charcoal/50" role="status">
                Loading more recipes…
              </p>
            )}
            {!hasMore && total > PAGE_SIZE && (
              <p className="mt-6 text-center text-sm text-charcoal/50">
                Showing all {total} recipes
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}