export type CookTab = "ingredients" | "steps";

/** Large segmented control: Ingredients | Steps. */
export default function CookingModeTabs({
  active,
  onChange,
}: {
  active: CookTab;
  onChange: (tab: CookTab) => void;
}) {
  const tabs: { key: CookTab; label: string }[] = [
    { key: "ingredients", label: "Ingredients" },
    { key: "steps", label: "Steps" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Cooking Mode sections"
      className="grid w-full grid-cols-2 gap-1 rounded-xl bg-terra-700 p-1"
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`h-12 rounded-lg text-base font-bold transition-colors ${
            active === key ? "bg-white text-terra-700 shadow" : "text-terra-100 hover:bg-terra-500/40"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}