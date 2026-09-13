/**
 * drizzle-orm wraps driver errors in `DrizzleQueryError` and keeps the original
 * node-postgres error in `cause`. These helpers look through that wrapper so
 * services can react to constraint violations without knowing the driver.
 */
export interface PgError {
  code: string;
  constraint?: string;
  detail?: string;
}

export function asPgError(err: unknown): PgError | null {
  let current: unknown = err;
  for (let depth = 0; current && typeof current === "object" && depth < 4; depth++) {
    const c = current as { code?: unknown; cause?: unknown };
    if (typeof c.code === "string" && /^[0-9A-Z]{5}$/.test(c.code)) return current as PgError;
    current = c.cause;
  }
  return null;
}

export const isUniqueViolation = (err: unknown, constraint?: string) => {
  const pg = asPgError(err);
  return pg?.code === "23505" && (constraint === undefined || pg.constraint === constraint);
};
