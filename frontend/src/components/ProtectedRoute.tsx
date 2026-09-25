import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";

/** Gate for admin/editor routes. Redirects anonymous users to /login. */
export default function ProtectedRoute({
  children,
  roles = ["admin", "editor", "viewer"],
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-sm text-sand-400" role="status">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <p className="font-display text-xl font-semibold">Not allowed</p>
        <p className="mt-2 text-sm text-charcoal/70">
          Your account ({user.role}) doesn't have access to this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}