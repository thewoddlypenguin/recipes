import { Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Header from "./Header";
import MobileNav from "./MobileNav";

/** Public layout with header/nav. Cooking Mode has its own standalone layout. */
export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <MobileNav key={location.pathname} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">{children ?? <Outlet />}</main>
      <footer className="no-print border-t border-sand-200 py-6 text-center text-xs text-sand-400">
        Mikkelsen Family Recipes · made with love in the kitchen
      </footer>
    </div>
  );
}