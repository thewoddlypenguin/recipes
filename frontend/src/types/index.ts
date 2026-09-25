export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  email: string;
  display_name: string;
  role: Role;
}

export interface Term {
  id: number;
  name: string;
  slug: string;
  type: TermType;
}

export type TermType = "course" | "cuisine" | "diet" | "equipment" | "ingredient" | "tag";

export const TERM_TYPES: TermType[] = ["course", "cuisine", "diet", "equipment", "ingredient", "tag"];

export interface Ingredient {
  section?: string | null;
  quantity?: string | null;
  unit?: string | null;
  ingredient_name: string;
  preparation?: string | null;
  notes?: string | null;
  original_text?: string | null;
  sort_order: number;
}

export interface Step {
  step_number?: number | null;
  body: string;
  timer_minutes?: number | null;
  sort_order: number;
}

export interface RecipeNote {
  body: string;
  sort_order: number;
}

export interface RecipeListItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  image_url?: string | null;
  image_alt?: string | null;
  servings?: number | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  status: string;
  course?: string | null;
  tags: string[];
}

export interface RecipeDetail extends RecipeListItem {
  description: string;
  source_url?: string | null;
  family_note?: string | null;
  legacy_wp_post_id?: number | null;
  legacy_wp_slug?: string | null;
  legacy_thumbnail_id?: number | null;
  legacy_image_path?: string | null;
  legacy_image_url?: string | null;
  import_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  notes: RecipeNote[];
  /** grouped term names by type, e.g. { course: ["Main"], tag: ["One Pot"] } */
  terms: Record<string, string[]>;
}

export interface RecipeInput {
  title: string;
  slug?: string | null;
  summary: string;
  description: string;
  servings?: number | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  source_url?: string | null;
  family_note?: string | null;
  status: string;
  image_url?: string | null;
  image_alt?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  notes: RecipeNote[];
  terms: { type: TermType; name: string }[];
}

export interface RecipeListResponse {
  items: RecipeListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface MenuItem {
  id: number;
  day_of_week: number; // 0 = Monday
  meal_type: string;
  recipe_id?: number | null;
  note: string;
  recipe?: {
    id: number;
    title: string;
    slug: string;
    image_url?: string | null;
    total_minutes?: number | null;
  } | null;
}

export interface WeeklyMenu {
  id: number;
  week_start_date: string; // YYYY-MM-DD
  title: string;
  items: MenuItem[];
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;