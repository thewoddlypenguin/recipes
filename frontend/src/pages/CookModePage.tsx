import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RecipeDetail } from "../types";
import { getRecipe } from "../api/client";
import CookingModeHeader from "../components/CookingModeHeader";
import CookingModeTabs from "../components/CookingModeTabs";
import IngredientChecklist from "../components/IngredientChecklist";
import TimerButton from "../components/TimerButton";
import EmptyState from "../components/EmptyState";
import { useWakeLock } from "../hooks/useWakeLock";
import type { CookTab } from "../components/CookingModeTabs";

/**
 * Full-screen Cooking Mode: screen wake lock, terracotta theme, big type,
 * Ingredients/Steps tabs, step-by-step navigation with timers.
 */
export default function CookModePage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<CookTab>("ingredients");
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  const wakeLock = useWakeLock();

  // Request the wake lock when entering Cooking Mode.
  useEffect(() => {
    void wakeLock.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turnOff = async () => {
    await wakeLock.release();
    navigate(`/recipes/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-terra-600 text-white" role="status">
        Warming up the kitchen…
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="min-h-screen bg-cream py-10">
        <EmptyState />
        <div className="mt-6 text-center">
          <button type="button" className="btn-primary" onClick={() => navigate("/")}>
            Back to recipes
          </button>
        </div>
      </div>
    );
  }

  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const step = steps[stepIndex];
  const total = steps.length;

  return (
    <div className="min-h-screen bg-terra-600">
      <CookingModeHeader wakeLockStatus={wakeLock.status} onTurnOff={() => void turnOff()} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{recipe.title}</h1>
        {recipe.servings != null && <p className="mt-1 text-sm text-terra-100">{recipe.servings} servings</p>}

        <div className="mt-5">
          <CookingModeTabs active={tab} onChange={setTab} />
        </div>

        <div className="mt-6" role="tabpanel">
          {tab === "ingredients" ? (
            <div className="rounded-2xl bg-terra-500/30 p-5 ring-1 ring-terra-400/40">
              <IngredientChecklist ingredients={recipe.ingredients} size="large" />
            </div>
          ) : total === 0 ? (
            <p className="py-12 text-center text-lg text-terra-100">This recipe has no steps yet.</p>
          ) : (
            <div>
              <div className="flex flex-col items-center rounded-2xl bg-terra-500/30 p-6 ring-1 ring-terra-400/40">
                <p className="text-sm font-bold uppercase tracking-widest text-terra-100">
                  {stepIndex + 1} of {total}
                </p>
                <p className="cooking-step-text mt-4 text-center">{step.body}</p>

                {step.timer_minutes != null && step.timer_minutes > 0 && (
                  <div className="mt-6">
                    <TimerButton minutes={step.timer_minutes} size="lg" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  disabled={stepIndex === 0}
                  className="h-14 flex-1 rounded-xl bg-terra-500 text-base font-bold text-white hover:bg-terra-400 disabled:opacity-40"
                >
                  ‹ Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={stepIndex >= total - 1}
                  className="h-14 flex-1 rounded-xl bg-white text-base font-bold text-terra-700 hover:bg-terra-50 disabled:opacity-40"
                >
                  Next ›
                </button>
              </div>

              {/* progress dots */}
              <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
                {steps.map((_, i) => (
                  <button
                    key={i}
                    tabIndex={-1}
                    onClick={() => setStepIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === stepIndex ? "w-6 bg-white" : "w-2 bg-terra-300"
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}