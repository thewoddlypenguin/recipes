import { useRef, useState } from "react";
import { uploadImage } from "../api/client";

interface Props {
  imageUrl?: string | null;
  imageAlt?: string | null;
  recipeSlug?: string;
  onChange: (url: string | null, alt?: string) => void;
}

/** Upload + preview for a recipe hero image (jpg/jpeg/png/webp, 10 MB max). */
export default function ImageUpload({ imageUrl, imageAlt, recipeSlug, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const { url } = await uploadImage(file, recipeSlug);
      onChange(url, file.name.replace(/\.[a-z0-9]+$/i, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
          e.target.value = "";
        }}
      />

      {imageUrl ? (
        <div className="space-y-2">
          <img
            src={imageUrl}
            alt={imageAlt || "Recipe image preview"}
            className="aspect-[4/3] w-full rounded-xl object-cover shadow-card"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-outline !min-h-0 px-3 py-1.5 text-xs" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button
              type="button"
              className="btn-outline !min-h-0 px-3 py-1.5 text-xs text-red-700"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 text-sm font-medium text-charcoal/60 hover:border-sage-400 hover:text-sage-700"
        >
          <span aria-hidden className="text-3xl">
            🖼
          </span>
          {busy ? "Uploading…" : "Click to upload image"}
          <span className="text-xs text-charcoal/40">JPG, PNG or WebP · max 10 MB</span>
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}