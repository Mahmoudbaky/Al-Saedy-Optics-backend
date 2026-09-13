import { createLogger } from "../config/logger.js";

const log = createLogger("push");
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends Expo push notifications. Fire-and-forget: failures are logged, never thrown,
 * so a push outage can't break an order flow. Invalid tokens are returned so the
 * caller can prune them.
 */
export const pushService = {
  async send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }> {
    const valid = tokens.filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t));
    if (valid.length === 0) return { invalidTokens: [] };

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(valid.map((to) => ({ to, sound: "default", ...message }))),
      });
      if (!res.ok) {
        log.warn({ status: res.status }, "Expo push request failed");
        return { invalidTokens: [] };
      }
      const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const invalidTokens = (json.data ?? [])
        .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? valid[i]! : null))
        .filter((t): t is string => t !== null);
      log.info({ sent: valid.length, invalid: invalidTokens.length }, "Push notifications sent");
      return { invalidTokens };
    } catch (err) {
      log.error({ err }, "Expo push request threw");
      return { invalidTokens: [] };
    }
  },
};
