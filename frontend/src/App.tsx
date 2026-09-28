import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import BrowsePage from "./pages/BrowsePage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import CookModePage from "./pages/CookModePage";
import LoginPage from "./pages/LoginPage";
import RecipeFormPage from "./pages/admin/RecipeFormPage";

function NotFound() {
  const location = useLocation();
  return (
    <div className="card mx-auto mt-16 max-w-md p-10 text-center">
      <p aria-hidden className="text-4xl">
        🧭
      </p>
      <p className="mt-2 font-display text-xl font-semibold">Page not found</p>
      <p className="mt-1 text-sm text-charcoal/60">Nothing lives at {location.pathname}.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Cooking Mode: standalone full-screen layout */}
      <Route path="/recipes/:slug/cook" element={<CookModePage />} />

      {/* Standard layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/recipes/new"
          element={
            <ProtectedRoute roles={["admin", "editor"]}>
              <RecipeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recipes/:id/edit"
          element={
            <ProtectedRoute roles={["admin", "editor"]}>
              <RecipeFormPage />
            </ProtectedRoute>
          }
        />
        <Route index path="/admin" element={<Navigate to="/admin/recipes/new" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}