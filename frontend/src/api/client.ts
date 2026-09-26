import type {
  RecipeDetail,
  RecipeInput,
  RecipeListItem,
  RecipeListResponse,
  Term,
  User,
  WeeklyMenu,
} from "../types";

// ---------------------------------------------------------------------------
// API base path handling
//
// The app can be deployed under a sub-path (e.g. /recipes-staging/). Vite bakes
// `base` into import.meta.env.BASE_URL, so API calls must carry the same
// prefix, otherwise the host serves the SPA shell (HTML, HTTP 200) for
// /api/... requests and the app crashes on unexpected payloads.
//
// Precedence: explicit VITE_API_BASE_URL > Vite base ("/recipes-staging/") > "".
// ---------------------------------------------------------------------------

const RAW_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.BASE_URL as string | undefined) ||
  "";

/** API base without trailing slash: "" (root) or "/recipes-staging". */
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

/**
 * Prefix a root-relative asset path (e.g. image_url from the API) with the
 * deployment base so <img src="/uploads/..."> resolves under a sub-path.
 * Absolute URLs and data URLs pass through untouched.
 */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

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

  // Parse strictly: a 200 response that is not JSON (e.g. the SPA shell or the
  // host site's HTML) must surface as an error, never as raw string data.
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const contentType = res.headers.get("content-type") ?? "non-JSON response";
      throw new ApiError(
        res.status,
        `Expected JSON from ${path} but received ${contentType}. ` +
          "Check the API base path / reverse proxy configuration.",
      );
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
  return request<unknown>(`/api/recipes${qs ? `?${qs}` : ""}`).then(normalizeRecipeList);
}

/**
 * Normalize whatever the API/proxy returned into a guaranteed
 * RecipeListResponse so a bad payload can never crash the browse page.
 */
function normalizeRecipeList(data: unknown): RecipeListResponse {
  const fallback: RecipeListResponse = { items: [], total: 0, limit: 0, offset: 0 };
  if (Array.isArray(data)) {
    // Bare array (e.g. an older API shape): wrap it.
    return { items: data as RecipeListItem[], total: data.length, limit: data.length, offset: 0 };
  }
  if (data && typeof data === "object") {
    const obj = data as Partial<RecipeListResponse>;
    const items = Array.isArray(obj.items) ? (obj.items as RecipeListItem[]) : [];
    return {
      items,
      total: typeof obj.total === "number" ? obj.total : items.length,
      limit: typeof obj.limit === "number" ? obj.limit : items.length,
      offset: typeof obj.offset === "number" ? obj.offset : 0,
    };
  }
  return fallback;
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
  return request<unknown>(`/api/terms${type ? `?type=${encodeURIComponent(type)}` : ""}`).then(
    normalizeTerms,
  );
}

/** Terms must always be a plain array, whatever the API/proxy returns. */
function normalizeTerms(data: unknown): Term[] {
  if (Array.isArray(data)) {
    return data as Term[];
  }
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Term[] }).items;
  }
  return [];
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
  return request<unknown>(`/api/weekly-menu${weekStart ? `?week_start=${weekStart}` : ""}`).then(
    normalizeMenu,
  );
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
  return request<unknown>(`/api/weekly-menu/${menuId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then(normalizeMenu);
}

/** Menu responses must always carry an items array (7 day slots). */
function normalizeMenu(data: unknown): WeeklyMenu {
  const fallback: WeeklyMenu = { id: 0, week_start_date: "", title: "", items: [] };
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Partial<WeeklyMenu>;
  return {
    id: typeof obj.id === "number" ? obj.id : 0,
    week_start_date: typeof obj.week_start_date === "string" ? obj.week_start_date : "",
    title: typeof obj.title === "string" ? obj.title : "",
    items: Array.isArray(obj.items) ? obj.items : [],
  };
}