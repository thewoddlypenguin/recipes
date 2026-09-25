import { fmtMinutes } from "../lib/format";
import type { Step } from "../types";

/** Ordered instruction steps with a timer affordance when timed. */
export default function InstructionList({
  steps,
  onTimer,
}: {
  steps: Step[];
  /** When provided, timed steps render an interactive timer button. */
  onTimer?: (minutes: number, label: string) => void;
}) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => {
        const timer = step.timer_minutes != null && step.timer_minutes > 0 ? step.timer_minutes : null;
        return (
          <li key={i} className="print-break-avoid flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sm font-bold text-sage-800"
            >
              {step.step_number ?? i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-relaxed text-charcoal">{step.body}</p>
              {timer !== null && onTimer && (
                <button
                  type="button"
                  onClick={() => onTimer(timer, `Step ${step.step_number ?? i + 1}`)}
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-dusk-100 px-3 text-xs font-semibold text-dusk-700 hover:bg-dusk-200"
                >
                  <span aria-hidden>⏱</span> Start {timer} min timer
                </button>
              )}
              {timer !== null && !onTimer && (
                <span className="mt-1 inline-block text-xs font-medium text-charcoal/50">
                  ⏱ {fmtMinutes(timer)} timer
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}