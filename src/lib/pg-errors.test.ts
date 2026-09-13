import { describe, expect, it } from "vitest";
import { asPgError, isUniqueViolation } from "./pg-errors.js";

describe("pg error unwrapping", () => {
  it("reads a raw node-postgres error", () => {
    const err = Object.assign(new Error("dup"), { code: "23505", constraint: "x_uq" });
    expect(asPgError(err)?.constraint).toBe("x_uq");
    expect(isUniqueViolation(err, "x_uq")).toBe(true);
    expect(isUniqueViolation(err, "other")).toBe(false);
  });

  it("looks through drizzle's wrapper via cause", () => {
    const inner = Object.assign(new Error("dup"), { code: "23505", constraint: "x_uq" });
    const wrapped = new Error("Failed query", { cause: inner });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("ignores non-database errors", () => {
    expect(asPgError(new Error("nope"))).toBeNull();
    expect(asPgError({ code: "ERR_MODULE_NOT_FOUND" })).toBeNull();
    expect(isUniqueViolation(null)).toBe(false);
  });
});
