import type {
  RecipeDetail,
  RecipeInput,
  RecipeListResponse,
  Term,
  User,
  WeeklyMenu,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const TOKEN_KEY = "mfr_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const detail =
      (data as { detail?: unknown })?.detail != null
        ? typeof (data as { detail: unknown }).detail === "string"
          ? String((data as { detail: string }).detail)
          : JSON.stringify((data as { detail: unknown }).detail)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const data = await request<{ access_token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export async function me(): Promise<User> {
  return request<User>("/api/auth/me");
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export interface RecipeQuery {
  q?: string;
  course?: string;
  cuisine?: string;
  diet?: string;
  equipment?: string;
  ingredient?: string;
  tag?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function listRecipes(query: RecipeQuery = {}): Promise<RecipeListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return request<RecipeListResponse>(`/api/recipes${qs ? `?${qs}` : ""}`);
}

export function getRecipe(slug: string): Promise<RecipeDetail> {
  return request<RecipeDetail>(`/api/recipes/${encodeURIComponent(slug)}`);
}

export function getRecipeById(id: number): Promise<RecipeDetail> {
  return request<RecipeDetail>(`/api/recipes/id/${id}`);
}

export function createRecipe(input: RecipeInput): Promise<RecipeDetail> {
  return request<RecipeDetail>("/api/recipes", { method: "POST", body: JSON.stringify(input) });
}

export function updateRecipe(id: number, input: RecipeInput): Promise<RecipeDetail> {
  return request<RecipeDetail>(`/api/recipes/id/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveRecipe(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/recipes/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

export function listTerms(type?: string): Promise<Term[]> {
  return request<Term[]>(`/api/terms${type ? `?type=${encodeURIComponent(type)}` : ""}`);
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export async function uploadImage(file: File, recipeSlug?: string): Promise<{ url: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  if (recipeSlug) {
    form.append("recipe_slug", recipeSlug);
  }
  return request<{ url: string; filename: string }>("/api/uploads/images", {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Weekly menu
// ---------------------------------------------------------------------------

export function getWeeklyMenu(weekStart?: string): Promise<WeeklyMenu> {
  return request<WeeklyMenu>(`/api/weekly-menu${weekStart ? `?week_start=${weekStart}` : ""}`);
}

export interface MenuItemUpdate {
  day_of_week: number;
  recipe_id?: number | null;
  note: string;
}

export function updateWeeklyMenu(
  menuId: number,
  payload: { title?: string; items: MenuItemUpdate[] },
): Promise<WeeklyMenu> {
  return request<WeeklyMenu>(`/api/weekly-menu/${menuId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}