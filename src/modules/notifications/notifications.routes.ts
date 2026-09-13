import { z } from "zod";
import { DEVICE_PLATFORMS } from "../../db/schema/enums.js";
import { localizedStringSchema } from "../../lib/i18n.js";
import { noContent, reply } from "../../lib/http.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { createModuleRouter } from "../../lib/router.js";
import { uuidSchema } from "../../lib/schemas.js";
import { notificationsService } from "./notifications.service.js";

const r = createModuleRouter({ prefix: "/api/v1/me/notifications", tags: ["Me · Notifications"], auth: "user" });

const notificationSchema = z.object({
  id: z.uuid(),
  title: localizedStringSchema,
  body: localizedStringSchema,
  link: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

r.route({
  method: "get",
  path: "/",
  summary: "My notifications (unread count in meta)",
  query: paginationQuerySchema,
  response: z.array(notificationSchema),
  handler: async ({ user, query }) => {
    const { items, meta } = await notificationsService.list(user.id, query);
    return reply(items, { meta });
  },
});
r.route({
  method: "post",
  path: "/read",
  summary: "Mark notifications as read",
  body: z.object({ ids: z.union([z.literal("all"), z.array(uuidSchema).min(1).max(100)]) }),
  response: z.object({ unread: z.number() }),
  status: 200,
  handler: ({ user, body }) => notificationsService.markRead(user.id, body.ids),
});

const devices = createModuleRouter({ prefix: "/api/v1/me/devices", tags: ["Me · Notifications"], auth: "user" });
const deviceBody = z.object({
  /** Expo push token, e.g. ExponentPushToken[xxxxxx] */
  token: z.string().trim().min(10).max(200),
  platform: z.enum(DEVICE_PLATFORMS),
});

devices.route({
  method: "post",
  path: "/",
  summary: "Register this device's Expo push token",
  body: deviceBody,
  status: 204,
  handler: async ({ user, body }) => {
    await notificationsService.registerDevice(user.id, body.token, body.platform);
    return noContent();
  },
});
devices.route({
  method: "delete",
  path: "/",
  summary: "Unregister a push token (on sign-out)",
  body: deviceBody.pick({ token: true }),
  status: 204,
  handler: async ({ user, body }) => {
    await notificationsService.unregisterDevice(user.id, body.token);
    return noContent();
  },
});

export const notificationsRouter = r.router;
export const devicesRouter = devices.router;
