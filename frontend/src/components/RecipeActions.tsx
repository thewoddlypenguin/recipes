import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface Props {
  slug: string;
  onEdit?: () => void;
  onArchive?: () => void;
}

/** Cook Now / Edit / Print / Share action row. */
export default function RecipeActions({ slug, onEdit, onArchive }: Props) {
  const navigate = useNavigate();
  const [shareLabel, setShareLabel] = useState<"Share" | "Link copied!">("Share");

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        /* user dismissed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied!");
      setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="no-print flex flex-wrap gap-3">
      <button type="button" className="btn-primary" onClick={() => navigate(`/recipes/${slug}/cook`)}>
        <span aria-hidden>🔥</span> Cook Now
      </button>
      {onEdit && (
        <button type="button" className="btn-outline" onClick={onEdit}>
          Edit Recipe
        </button>
      )}
      <button type="button" className="btn-outline" onClick={() => window.print()}>
        <span aria-hidden>🖨</span> Print
      </button>
      <button type="button" className="btn-outline" onClick={() => void share()}>
        <span aria-hidden>🔗</span> {shareLabel}
      </button>
      {onArchive && (
        <button
          type="button"
          className="btn-outline text-red-700 hover:bg-red-50"
          onClick={() => {
            if (window.confirm("Archive this recipe? It will be hidden from browsing.")) onArchive();
          }}
        >
          Archive
        </button>
      )}
    </div>
  );
}