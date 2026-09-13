import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { createLogger } from "../../config/logger.js";
import { auth } from "../../lib/auth.js";
import { NotFoundError } from "../../lib/errors.js";
import { pageMeta } from "../../lib/pagination.js";
import { notificationsRepository } from "../notifications/notifications.repository.js";
import { usersRepository, type UserRow } from "./users.repository.js";
import type { AdminListUsersQuery, UpdateProfileInput } from "./users.schema.js";

const log = createLogger("users");

const toAdminUserDto = (u: UserRow, stats: { orders: number; totalSpent: number; lastOrderAt: Date | null }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  emailVerified: u.emailVerified,
  phone: u.phone,
  locale: u.locale ?? "ar",
  image: u.image,
  role: u.role ?? "user",
  banned: u.banned ?? false,
  banReason: u.banReason,
  banExpires: u.banExpires?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
  stats: { orders: stats.orders, totalSpent: stats.totalSpent, lastOrderAt: stats.lastOrderAt?.toISOString() ?? null },
});

export const usersService = {
  async me(userId: string) {
    const [u, stats, unread] = await Promise.all([usersRepository.findById(userId), usersRepository.profileStats(userId), notificationsRepository.unreadCount(userId)]);
    if (!u) throw new NotFoundError("User", userId);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      phone: u.phone,
      locale: u.locale ?? "ar",
      image: u.image,
      role: u.role ?? "user",
      createdAt: u.createdAt.toISOString(),
      stats: { ...stats, unreadNotifications: unread, nextAppointmentAt: stats.nextAppointmentAt?.toISOString() ?? null },
    };
  },

  /**
   * Goes through Better Auth so the session cookie cache is refreshed and the
   * same validation/hook pipeline runs as for the auth client.
   */
  async updateMe(req: Request, input: UpdateProfileInput) {
    await auth.api.updateUser({ headers: fromNodeHeaders(req.headers), body: input });
    log.info({ userId: req.user!.id, fields: Object.keys(input) }, "Profile updated");
    return this.me(req.user!.id);
  },

  // ---- admin ---------------------------------------------------------------------
  async adminList(query: AdminListUsersQuery) {
    const { rows, total } = await usersRepository.list(query);
    return { items: rows.map((r) => toAdminUserDto(r.user, r)), meta: pageMeta(total, query) };
  },

  async adminGet(id: string) {
    const [u, stats] = await Promise.all([usersRepository.findById(id), usersRepository.orderStats(id)]);
    if (!u) throw new NotFoundError("User", id);
    return toAdminUserDto(u, stats);
  },

  async setRole(req: Request, id: string, role: "user" | "admin") {
    await this.adminGet(id);
    await auth.api.setRole({ headers: fromNodeHeaders(req.headers), body: { userId: id, role } });
    log.warn({ actorId: req.user!.id, userId: id, role }, "User role changed");
    return this.adminGet(id);
  },

  async ban(req: Request, id: string, reason?: string, expiresIn?: number) {
    await this.adminGet(id);
    await auth.api.banUser({ headers: fromNodeHeaders(req.headers), body: { userId: id, banReason: reason, banExpiresIn: expiresIn } });
    log.warn({ actorId: req.user!.id, userId: id, reason }, "User banned");
    return this.adminGet(id);
  },

  async unban(req: Request, id: string) {
    await this.adminGet(id);
    await auth.api.unbanUser({ headers: fromNodeHeaders(req.headers), body: { userId: id } });
    log.info({ actorId: req.user!.id, userId: id }, "User unbanned");
    return this.adminGet(id);
  },
};
