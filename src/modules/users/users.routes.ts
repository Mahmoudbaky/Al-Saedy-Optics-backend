import { z } from "zod";
import { reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { adminListUsersQuerySchema, adminUserResponseSchema, banUserSchema, profileResponseSchema, setRoleSchema, updateProfileSchema } from "./users.schema.js";
import { usersService } from "./users.service.js";

const me = createModuleRouter({ prefix: "/api/v1/me", tags: ["Me"], auth: "user" });

me.route({
  method: "get",
  path: "/",
  summary: "My profile with account counters",
  description: "Sign-in / sign-up / sign-out / OTP / password reset are handled by Better Auth at `/api/auth/*`.",
  response: profileResponseSchema,
  handler: ({ user }) => usersService.me(user.id),
});
me.route({
  method: "patch",
  path: "/",
  summary: "Update my name, phone, language or avatar",
  body: updateProfileSchema,
  response: profileResponseSchema,
  handler: ({ req, body }) => usersService.updateMe(req, body),
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/users", tags: ["Admin · Users"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List customers & staff",
  query: adminListUsersQuerySchema,
  response: z.array(adminUserResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await usersService.adminList(query);
    return reply(items, { meta });
  },
});
admin.route({ method: "get", path: "/:id", summary: "User details", params: idParamSchema, response: adminUserResponseSchema, handler: ({ params }) => usersService.adminGet(params.id) });
admin.route({
  method: "post",
  path: "/:id/role",
  summary: "Promote / demote a user",
  params: idParamSchema,
  body: setRoleSchema,
  response: adminUserResponseSchema,
  status: 200,
  handler: ({ req, params, body }) => usersService.setRole(req, params.id, body.role),
});
admin.route({
  method: "post",
  path: "/:id/ban",
  summary: "Ban a user (revokes their sessions)",
  params: idParamSchema,
  body: banUserSchema,
  response: adminUserResponseSchema,
  status: 200,
  handler: ({ req, params, body }) => usersService.ban(req, params.id, body.reason, body.expiresIn),
});
admin.route({
  method: "post",
  path: "/:id/unban",
  summary: "Lift a ban",
  params: idParamSchema,
  response: adminUserResponseSchema,
  status: 200,
  handler: ({ req, params }) => usersService.unban(req, params.id),
});

export const meRouter = me.router;
export const adminUsersRouter = admin.router;
