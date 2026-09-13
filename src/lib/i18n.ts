import { z } from "zod";

/** Matches the mobile app's `LocalizedString` type. */
export type LocalizedString = { ar: string; en: string };

export const localizedStringSchema = z.object({
  ar: z.string().trim().min(1).max(500),
  en: z.string().trim().min(1).max(500),
});

export const optionalLocalizedStringSchema = z
  .object({
    ar: z.string().trim().max(2000).nullable(),
    en: z.string().trim().max(2000).nullable(),
  })
  .nullable()
  .optional();

/**
 * Reads `<field>Ar` / `<field>En` from a database row and returns `{ ar, en }`.
 * Returns `null` when both are empty so optional fields serialise cleanly.
 */
export function localized<R extends Record<string, unknown>, K extends string>(
  row: R,
  field: K,
): LocalizedString | null {
  const ar = row[`${field}Ar`] as string | null | undefined;
  const en = row[`${field}En`] as string | null | undefined;
  if (!ar && !en) return null;
  return { ar: ar ?? en ?? "", en: en ?? ar ?? "" };
}

/** Inverse of `localized` – expands `{ ar, en }` into `<field>Ar` / `<field>En` columns. */
export function toColumns<K extends string>(
  field: K,
  value: { ar: string | null; en: string | null } | null | undefined,
): Record<`${K}Ar` | `${K}En`, string | null> | Record<string, never> {
  if (value === undefined) return {};
  return {
    [`${field}Ar`]: value?.ar ?? null,
    [`${field}En`]: value?.en ?? null,
  } as Record<`${K}Ar` | `${K}En`, string | null>;
}
