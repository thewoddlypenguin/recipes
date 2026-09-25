import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { archiveRecipe, createRecipe, getRecipeById, listTerms, updateRecipe } from "../../api/client";
import RecipeForm from "../../components/RecipeForm";
import { useAuth } from "../../hooks/useAuth";
import type { RecipeDetail, RecipeInput, Term } from "../../types";

/** Add (`/admin/recipes/new`) and Edit (`/admin/recipes/:id/edit`) page. */
export default function RecipeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEdit = id !== undefined;
  const [initial, setInitial] = useState<RecipeDetail | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTerms().then(setTerms).catch(() => setTerms([]));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setInitial(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRecipeById(Number(id))
      .then((data) => {
        if (!cancelled) setInitial(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSave = async (payload: RecipeInput) => {
    setBusy(true);
    setError(null);
    try {
      if (isEdit) {
        const updated = await updateRecipe(Number(id), payload);
        navigate(`/recipes/${updated.slug}`);
      } else {
        const created = await createRecipe(payload);
        navigate(`/recipes/${created.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!initial) return;
    await archiveRecipe(initial.id);
    navigate("/");
  };

  if (loading) {
    return <div className="card mx-auto mt-10 h-96 max-w-4xl animate-pulse" role="status" aria-label="Loading recipe" />;
  }

  if (loadError) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-10 text-center">
        <p className="font-display text-xl font-semibold">Couldn't load that recipe.</p>
        <p className="mt-2 text-sm text-charcoal/60">{loadError}</p>
        <button type="button" className="btn-primary mt-6" onClick={() => navigate("/")}>
          Back to recipes
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">
        {isEdit ? `Edit Recipe${initial ? `: ${initial.title}` : ""}` : "Add a Family Recipe"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-charcoal/60">
        {isEdit
          ? "Update the recipe — changes go live immediately."
          : `Adding as ${user?.display_name || user?.email} — you can save as draft and finish later.`}
      </p>

      <RecipeForm
        initial={initial}
        terms={terms}
        busy={busy}
        error={error}
        onSave={(payload) => void handleSave(payload)}
        onArchive={user?.role === "admin" ? () => void handleArchive() : undefined}
      />
    </div>
  );
}