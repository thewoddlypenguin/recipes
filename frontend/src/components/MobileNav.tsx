import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const JUSTINSPACE_URL = (import.meta.env.VITE_JUSTINSPACE_URL as string | undefined) ?? "https://justinmikkelsen.com";

/** Compact slide-down nav shown under the header on small screens. */
export default function MobileNav() {
  const { user, isEditor, logout } = useAuth();

  const item =
    "flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-charcoal hover:bg-sand-100";

  return (
    <div id="mobile-nav-drawer" className="no-print sticky top-[60px] z-30 mx-auto hidden w-full max-w-7xl md:hidden">
      <nav aria-label="Mobile" className="mx-4 mt-2 rounded-2xl bg-white p-2 shadow-card-lg">
        <Link to="/" className={item}>
          Home <span aria-hidden>→</span>
        </Link>
        <Link to="/weekly-menu" className={item}>
          Weekly Menu <span aria-hidden>→</span>
        </Link>
        {isEditor && (
          <Link to="/admin/recipes/new" className={item}>
            Add Recipe <span aria-hidden>→</span>
          </Link>
        )}
        <a href={JUSTINSPACE_URL} target="_blank" rel="noreferrer" className={item}>
          JustinSpace <span aria-hidden>↗</span>
        </a>
        {user ? (
          <button onClick={() => void logout()} className={`${item} w-full text-left`}>
            Log out <span className="text-xs text-sand-400">{user.email}</span>
          </button>
        ) : (
          <NavLink to="/login" className={item}>
            Log in <span aria-hidden>→</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}