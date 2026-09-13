import { createLogger } from "../../config/logger.js";
import type { LocalizedString } from "../../lib/i18n.js";
import { localized } from "../../lib/i18n.js";
import { pageMeta, type PaginationQuery } from "../../lib/pagination.js";
import { pushService } from "../../services/push.service.js";
import { notificationsRepository, type NotificationRow } from "./notifications.repository.js";

const log = createLogger("notifications");

export interface NotifyInput {
  title: LocalizedString;
  body: LocalizedString;
  link?: string | null;
  /** Locale used for the push text; defaults to the user's stored locale. */
  locale?: "ar" | "en";
}

export const toNotificationDto = (n: NotificationRow) => ({
  id: n.id,
  title: localized(n, "title")!,
  body: localized(n, "body")!,
  link: n.link,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export const notificationsService = {
  /**
   * Stores an in-app notification and pushes it to the user's devices.
   * Push delivery is best effort and never blocks the caller.
   */
  async notify(userId: string, input: NotifyInput, userLocale: string | null = "ar") {
    const row = await notificationsRepository.insert({
      userId,
      titleAr: input.title.ar,
      titleEn: input.title.en,
      bodyAr: input.body.ar,
      bodyEn: input.body.en,
      link: input.link ?? null,
    });
    const locale = input.locale ?? (userLocale === "en" ? "en" : "ar");
    void (async () => {
      const tokens = await notificationsRepository.tokensForUser(userId);
      if (!tokens.length) return;
      const { invalidTokens } = await pushService.send(tokens, {
        title: input.title[locale],
        body: input.body[locale],
        data: { link: input.link ?? undefined, notificationId: row.id },
      });
      if (invalidTokens.length) await notificationsRepository.deleteTokens(invalidTokens);
    })().catch((err) => log.error({ err, userId }, "Push dispatch failed"));
    return row;
  },

  async list(userId: string, page: PaginationQuery) {
    const { rows, total, unread } = await notificationsRepository.list(userId, page);
    return { items: rows.map(toNotificationDto), meta: { ...pageMeta(total, page), unread } };
  },

  unreadCount: (userId: string) => notificationsRepository.unreadCount(userId),

  async markRead(userId: string, ids: string[] | "all") {
    await notificationsRepository.markRead(userId, ids);
    return { unread: await notificationsRepository.unreadCount(userId) };
  },

  registerDevice: (userId: string, token: string, platform: "ios" | "android" | "web") =>
    notificationsRepository.upsertToken(userId, token, platform),
  unregisterDevice: (userId: string, token: string) => notificationsRepository.deleteToken(userId, token),
};
