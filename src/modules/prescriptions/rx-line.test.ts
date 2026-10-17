import { describe, expect, it } from "vitest";
import { isLabReady, resolveLineRx, worstRxState } from "./rx-line.js";

const rx = (status: "pending" | "verified" | "expired" | "rejected", expiresOn: string | null = null) => ({ status, expiresOn });
const appt = (status: "booked" | "confirmed" | "completed" | "cancelled" | "noShow") => ({ status });

describe("resolveLineRx", () => {
  it("does not require anything for regular products", () => {
    expect(resolveLineRx({ required: false, prescription: null, appointment: null })).toMatchObject({ mode: "none", state: "notRequired", ready: true });
  });

  it("blocks an Rx product with no source", () => {
    const r = resolveLineRx({ required: true, prescription: null, appointment: null });
    expect(r).toMatchObject({ mode: "none", state: "missing", ready: false });
    expect(r.issue).toMatch(/book an eye exam/);
  });

  it("option 1 – saved prescription", () => {
    expect(resolveLineRx({ required: true, prescription: rx("verified"), appointment: null })).toMatchObject({ mode: "existing", state: "verified", ready: true });
    expect(resolveLineRx({ required: true, prescription: rx("pending"), appointment: null })).toMatchObject({ state: "pending", ready: true });
    expect(resolveLineRx({ required: true, prescription: rx("rejected"), appointment: null })).toMatchObject({ state: "rejected", ready: false });
    expect(resolveLineRx({ required: true, prescription: rx("verified", "2020-01-01"), appointment: null })).toMatchObject({ state: "expired", ready: false });
  });

  it("option 2 – eye exam", () => {
    expect(resolveLineRx({ required: true, prescription: null, appointment: appt("booked") })).toMatchObject({ mode: "appointment", state: "awaitingExam", ready: true });
    expect(resolveLineRx({ required: true, prescription: null, appointment: appt("completed") })).toMatchObject({ state: "awaitingExam" });
    expect(resolveLineRx({ required: true, prescription: null, appointment: appt("cancelled") })).toMatchObject({ state: "examCancelled", ready: false });
    expect(resolveLineRx({ required: true, prescription: null, appointment: appt("noShow") })).toMatchObject({ state: "examCancelled", ready: false });
  });

  it("once the clinic records the exam the line is verified but keeps the appointment mode", () => {
    expect(resolveLineRx({ required: true, prescription: rx("verified"), appointment: appt("completed") })).toMatchObject({ mode: "appointment", state: "verified", ready: true });
  });
});

describe("order-level aggregation", () => {
  it("picks the most blocking state and ignores lines that need nothing", () => {
    expect(worstRxState(["notRequired", "verified"])).toBe("verified");
    expect(worstRxState(["verified", "awaitingExam", "pending"])).toBe("awaitingExam");
    expect(worstRxState(["verified", "rejected", "missing"])).toBe("rejected");
    expect(worstRxState(["notRequired"])).toBeNull();
    expect(worstRxState([])).toBeNull();
  });

  it("only verified / not-required lines may go to the lab", () => {
    expect(isLabReady("verified")).toBe(true);
    expect(isLabReady("notRequired")).toBe(true);
    for (const s of ["pending", "awaitingExam", "missing", "rejected", "expired", "examCancelled"] as const) expect(isLabReady(s)).toBe(false);
  });
});
