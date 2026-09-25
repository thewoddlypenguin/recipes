import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const JUSTINSPACE_URL = (import.meta.env.VITE_JUSTINSPACE_URL as string | undefined) ?? "https://justinmikkelsen.com";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-white/25 text-white" : "text-sage-50 hover:bg-white/15"
  }`;

export default function Header() {
  const { user, isEditor, logout } = useAuth();

  return (
    <header className="no-print sticky top-0 z-40 bg-sage-700 shadow-card">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-white">
          <span aria-hidden className="text-xl">🥘</span>
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            Mikkelsen Family Recipes
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/weekly-menu" className={linkClass}>
            Weekly Menu
          </NavLink>
          {isEditor && (
            <NavLink to="/admin/recipes/new" className={linkClass}>
              Add Recipe
            </NavLink>
          )}
          <a href={JUSTINSPACE_URL} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 text-sm font-medium text-sage-50 hover:bg-white/15">
            JustinSpace
          </a>
          {user ? (
            <button
              onClick={() => void logout()}
              className="ml-2 rounded-full border border-sage-50/40 px-3 py-1.5 text-sm font-medium text-sage-50 hover:bg-white/15"
              title={`Logged in as ${user.display_name || user.email} (${user.role})`}
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className="ml-2 rounded-full border border-sage-50/40 px-3 py-1.5 text-sm font-medium text-sage-50 hover:bg-white/15"
            >
              Log in
            </Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/15 md:hidden"
          aria-label="Open menu"
          aria-expanded="false"
          onClick={() => {
            const drawer = document.getElementById("mobile-nav-drawer");
            drawer?.classList.toggle("hidden");
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}