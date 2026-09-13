import { describe, expect, it } from "vitest";
import { addDays, hmIn, isoWeekday, tzOffsetMs, ymdIn, zonedTimeToUtc } from "./time.js";

const TZ = "Asia/Baghdad"; // UTC+3, no DST

describe("time helpers", () => {
  it("knows Baghdad is UTC+3", () => {
    expect(tzOffsetMs(new Date("2026-09-13T00:00:00Z"), TZ)).toBe(3 * 3_600_000);
  });

  it("converts clinic wall-clock time to UTC", () => {
    expect(zonedTimeToUtc("2026-09-16", 16, 0, TZ).toISOString()).toBe("2026-09-16T13:00:00.000Z");
  });

  it("round-trips through ymdIn / hmIn", () => {
    const d = zonedTimeToUtc("2026-09-16", 10, 30, TZ);
    expect(ymdIn(d, TZ)).toBe("2026-09-16");
    expect(hmIn(d, TZ)).toBe("10:30");
  });

  it("handles a date that is still 'yesterday' in UTC", () => {
    // 01:00 Baghdad = 22:00 UTC the previous day
    const d = zonedTimeToUtc("2026-09-16", 1, 0, TZ);
    expect(d.toISOString()).toBe("2026-09-15T22:00:00.000Z");
    expect(ymdIn(d, TZ)).toBe("2026-09-16");
  });

  it("computes ISO weekdays and date arithmetic", () => {
    expect(isoWeekday("2026-09-13")).toBe(7); // Sunday
    expect(isoWeekday("2026-09-14")).toBe(1); // Monday
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("is DST-safe for a zone that observes it", () => {
    expect(zonedTimeToUtc("2026-07-01", 12, 0, "Europe/London").toISOString()).toBe("2026-07-01T11:00:00.000Z");
    expect(zonedTimeToUtc("2026-01-01", 12, 0, "Europe/London").toISOString()).toBe("2026-01-01T12:00:00.000Z");
  });
});
