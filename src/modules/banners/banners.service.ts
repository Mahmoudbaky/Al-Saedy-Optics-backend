import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { banners } from "../../db/schema/index.js";
import { NotFoundError } from "../../lib/errors.js";
import { localized, toColumns } from "../../lib/i18n.js";
import type { BannerDto, CreateBannerInput, UpdateBannerInput } from "./banners.schema.js";

type BannerRow = typeof banners.$inferSelect;

const toBannerDto = (b: BannerRow): BannerDto => ({
  id: b.id,
  title: localized(b, "title")!,
  subtitle: localized(b, "subtitle"),
  cta: localized(b, "cta"),
  imageUrl: b.imageUrl,
  link: b.link,
  sortOrder: b.sortOrder,
  startsAt: b.startsAt?.toISOString() ?? null,
  endsAt: b.endsAt?.toISOString() ?? null,
  isActive: b.isActive,
});

const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v ? new Date(v) : null);

/** Small module – repository and service are merged since there's no business logic. */
export const bannersService = {
  async listActive() {
    const now = new Date();
    const rows = await db.query.banners.findMany({
      where: and(eq(banners.isActive, true), or(isNull(banners.startsAt), lte(banners.startsAt, now)), or(isNull(banners.endsAt), gte(banners.endsAt, now))),
      orderBy: asc(banners.sortOrder),
    });
    return rows.map(toBannerDto);
  },

  async listAll() {
    return (await db.query.banners.findMany({ orderBy: asc(banners.sortOrder) })).map(toBannerDto);
  },

  async create(input: CreateBannerInput) {
    const [row] = await db
      .insert(banners)
      .values({
        titleAr: input.title.ar,
        titleEn: input.title.en,
        ...toColumns("subtitle", input.subtitle),
        ...toColumns("cta", input.cta),
        imageUrl: input.imageUrl ?? null,
        link: input.link ?? null,
        sortOrder: input.sortOrder,
        startsAt: toDate(input.startsAt) ?? null,
        endsAt: toDate(input.endsAt) ?? null,
        isActive: input.isActive,
      })
      .returning();
    return toBannerDto(row!);
  },

  async update(id: string, input: UpdateBannerInput) {
    const [row] = await db
      .update(banners)
      .set({
        ...(input.title ? { titleAr: input.title.ar, titleEn: input.title.en } : {}),
        ...toColumns("subtitle", input.subtitle),
        ...toColumns("cta", input.cta),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.link !== undefined ? { link: input.link } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.startsAt !== undefined ? { startsAt: toDate(input.startsAt) } : {}),
        ...(input.endsAt !== undefined ? { endsAt: toDate(input.endsAt) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(banners.id, id))
      .returning();
    if (!row) throw new NotFoundError("Banner", id);
    return toBannerDto(row);
  },

  async delete(id: string) {
    const [row] = await db.delete(banners).where(eq(banners.id, id)).returning({ id: banners.id });
    if (!row) throw new NotFoundError("Banner", id);
  },
};
