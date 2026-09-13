/** Turns "VC 214 / Acetate" into "vc-214-acetate". Arabic-only input falls back to a random suffix. */
export function slugify(input: string, fallback = "item"): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `${fallback}-${Math.random().toString(36).slice(2, 8)}`;
}
