import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./_shared.js";

/** Home screen hero / promo banners managed from the admin panel. */
export const banners = pgTable("banners", {
  id: uuidPk(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  subtitleAr: text("subtitle_ar"),
  subtitleEn: text("subtitle_en"),
  ctaAr: text("cta_ar"),
  ctaEn: text("cta_en"),
  imageUrl: text("image_url"),
  /** In-app link, e.g. "/categories?category=sun" or "/product/<id>". */
  link: text("link"),
  sortOrder: integer("sort_order").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
