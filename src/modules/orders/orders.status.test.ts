import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "../../db/schema/enums.js";
import { canTransition, CUSTOMER_CANCELLABLE, ORDER_TRANSITIONS, timelineFor } from "./orders.status.js";

describe("order state machine", () => {
  it("covers every status", () => {
    for (const s of ORDER_STATUSES) expect(ORDER_TRANSITIONS[s]).toBeDefined();
  });

  it("allows the happy path for home delivery", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "lab")).toBe(true);
    expect(canTransition("lab", "onTheWay")).toBe(true);
    expect(canTransition("onTheWay", "delivered")).toBe(true);
  });

  it("allows the pickup path", () => {
    expect(canTransition("lab", "ready")).toBe(true);
    expect(canTransition("ready", "delivered")).toBe(true);
  });

  it("blocks going backwards or out of terminal states", () => {
    expect(canTransition("onTheWay", "lab")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("lets customers cancel only early", () => {
    expect(CUSTOMER_CANCELLABLE).toEqual(["pending", "confirmed"]);
  });

  it("builds the tracking steps per delivery method", () => {
    expect(timelineFor("home")).toEqual(["confirmed", "lab", "onTheWay", "delivered"]);
    expect(timelineFor("pickup")).toEqual(["confirmed", "lab", "ready", "delivered"]);
  });
});
