import type { WakeLockStatus } from "../hooks/useWakeLock";

interface Props {
  wakeLockStatus: WakeLockStatus;
  onTurnOff: () => void;
}

/** Sticky bar for Cooking Mode: status + wake-lock state + turn off. */
export default function CookingModeHeader({ wakeLockStatus, onTurnOff }: Props) {
  const statusText =
    wakeLockStatus === "on"
      ? "Wake-lock: ON"
      : wakeLockStatus === "unsupported"
        ? "Wake-lock unavailable on this device. Keep this tab open while cooking."
        : "Wake-lock: acquiring…";

  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-charcoal">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage-600" />
            </span>
            Cooking Mode: ACTIVE
          </p>
          <p
            className={`mt-0.5 truncate text-xs ${
              wakeLockStatus === "on" ? "text-charcoal/50" : "text-charcoal/60"
            }`}
            role="status"
          >
            {wakeLockStatus === "on" && "● "}
            {statusText}
          </p>
        </div>
        <button
          type="button"
          onClick={onTurnOff}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-sage-600 px-5 text-sm font-bold text-white hover:bg-sage-700"
        >
          Turn Off Cooking Mode
        </button>
      </div>
    </div>
  );
}