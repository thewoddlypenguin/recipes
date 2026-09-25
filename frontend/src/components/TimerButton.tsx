import { useEffect, useRef, useState } from "react";

/**
 * Countdown timer button for Cooking Mode and step timers.
 * Renders as a label button until running, then shows remaining time
 * with pause/resume and a completion beep.
 */
export default function TimerButton({
  minutes,
  label,
  size = "sm",
  onComplete,
}: {
  minutes: number;
  label?: string;
  size?: "sm" | "lg";
  onComplete?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null); // seconds
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (remaining === null || paused) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(intervalRef.current!);
          intervalRef.current = null;
          beep();
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [remaining !== null, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => setRemaining(minutes * 60);
  const reset = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setRemaining(null);
    setPaused(false);
  };

  const mm = remaining !== null ? String(Math.floor(remaining / 60)).padStart(2, "0") : "";
  const ss = remaining !== null ? String(remaining % 60).padStart(2, "0") : "";
  const done = remaining === 0;
  const running = remaining !== null && !done;

  const base =
    size === "lg"
      ? "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold"
      : "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold";

  if (running) {
    return (
      <span className={`${base} bg-terra-700 text-white tabular-nums`}>
        ⏱ {mm}:{ss}
        <button type="button" onClick={() => setPaused(!paused)} className="ml-2 rounded-lg bg-white/20 px-2 py-1 text-xs">
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={reset} className="rounded-lg bg-white/20 px-2 py-1 text-xs">
          ✕
        </button>
      </span>
    );
  }

  if (done) {
    return (
      <button type="button" onClick={reset} className={`${base} bg-white text-terra-700`}>
        ⏰ Time's up! Tap to reset
      </button>
    );
  }

  return (
    <button type="button" onClick={start} className={`${base} bg-terra-500 text-white hover:bg-terra-600`}>
      ⏱ Start {minutes} min Timer{label ? ` · ${label}` : ""}
    </button>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    /* audio unavailable — visual state is enough */
  }
}