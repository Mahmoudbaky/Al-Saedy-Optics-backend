import { describe, expect, it } from "vitest";
import { localized, toColumns } from "./i18n.js";

describe("i18n helpers", () => {
  it("reads *Ar/*En pairs", () => {
    expect(localized({ nameAr: "إطار", nameEn: "Frame" }, "name")).toEqual({ ar: "إطار", en: "Frame" });
  });
  it("falls back to the other language and returns null when both empty", () => {
    expect(localized({ noteAr: null, noteEn: "Light" }, "note")).toEqual({ ar: "Light", en: "Light" });
    expect(localized({ noteAr: null, noteEn: null }, "note")).toBeNull();
  });
  it("expands to columns, skipping undefined and nulling explicit null", () => {
    expect(toColumns("description", undefined)).toEqual({});
    expect(toColumns("description", null)).toEqual({ descriptionAr: null, descriptionEn: null });
    expect(toColumns("description", { ar: "أ", en: "a" })).toEqual({ descriptionAr: "أ", descriptionEn: "a" });
  });
});
