import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RecipeDetail } from "../types";
import { getRecipe } from "../api/client";
import CookingModeHeader from "../components/CookingModeHeader";
import IngredientChecklist from "../components/IngredientChecklist";
import TimerButton from "../components/TimerButton";
import EmptyState from "../components/EmptyState";
import { useWakeLock } from "../hooks/useWakeLock";

/**
 * Full-screen Cooking Mode: screen wake lock, clean light theme, big type.
 * Ingredients and steps are shown together — no tab switching.
 * Desktop: two-column layout (ingredients left, steps right).
 * Mobile: ingredients first, steps below.
 */
export default function CookModePage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-white text-charcoal" role="status">
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
    <div className="min-h-screen bg-gray-50">
      <CookingModeHeader wakeLockStatus={wakeLock.status} onTurnOff={() => void turnOff()} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        <h1 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">{recipe.title}</h1>
        {recipe.servings != null && <p className="mt-1 text-sm text-charcoal/60">{recipe.servings} servings</p>}

        {/* Two-column layout: ingredients + steps together */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
          {/* Ingredients column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">Ingredients</h2>
              <IngredientChecklist ingredients={recipe.ingredients} size="large" />
            </div>
          </div>

          {/* Steps column */}
          <div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">Instructions</h2>
              {total === 0 ? (
                <p className="py-12 text-center text-lg text-charcoal/50">This recipe has no steps yet.</p>
              ) : (
                <div>
                  <div className="flex flex-col items-start rounded-xl bg-gray-50 p-6 ring-1 ring-gray-200">
                    <p className="text-sm font-bold uppercase tracking-widest text-charcoal/50">
                      {stepIndex + 1} of {total}
                    </p>
                    <p className="cooking-step-text mt-4 text-left text-charcoal">{step.body}</p>

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
                      className="h-14 flex-1 rounded-xl bg-gray-200 text-base font-bold text-charcoal hover:bg-gray-300 disabled:opacity-40"
                    >
                      ‹ Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
                      disabled={stepIndex >= total - 1}
                      className="h-14 flex-1 rounded-xl bg-sage-600 text-base font-bold text-white hover:bg-sage-700 disabled:opacity-40"
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
                          i === stepIndex ? "w-6 bg-sage-600" : "w-2 bg-gray-300"
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
      </div>
    </div>
  );
}