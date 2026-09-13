/**
 * Seeds the catalogue that the mobile app was prototyped with (src/data in the
 * Expo project) so the two projects line up out of the box. Idempotent: rows are
 * upserted by slug / id, so it's safe to re-run.
 *
 *   pnpm db:seed
 */
import { eq, sql } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { closeDatabase, db } from "../db/index.js";
import { banners, brands, categories, doctors, lensAddons, products, productVariants, promoCodes } from "../db/schema/index.js";

const swatches = {
  black: "#22262B",
  brown: "#8A5A3B",
  navy: "#16294F",
  gold: "#C0A062",
  tortoise: "#6B4A2B",
  silver: "#B8BCC4",
  clear: "#D9E4F0",
} as const;

const colorNames: Record<string, { ar: string; en: string }> = {
  [swatches.black]: { ar: "أسود", en: "Black" },
  [swatches.brown]: { ar: "بني", en: "Brown" },
  [swatches.navy]: { ar: "كحلي", en: "Navy" },
  [swatches.gold]: { ar: "ذهبي", en: "Gold" },
  [swatches.tortoise]: { ar: "سلحفاة", en: "Tortoise" },
  [swatches.silver]: { ar: "فضي", en: "Silver" },
  [swatches.clear]: { ar: "شفاف", en: "Clear" },
};

const categorySeed = [
  { slug: "prescription", nameAr: "نظارات طبية", nameEn: "Prescription", sortOrder: 1 },
  { slug: "sun", nameAr: "نظارات شمسية", nameEn: "Sunglasses", sortOrder: 2 },
  { slug: "contact", nameAr: "عدسات لاصقة", nameEn: "Contact lenses", sortOrder: 3 },
  { slug: "kids", nameAr: "أطفال", nameEn: "Kids", sortOrder: 4 },
  { slug: "accessories", nameAr: "إكسسوارات", nameEn: "Accessories", sortOrder: 5 },
];

const brandSeed = [{ slug: "vision-classic", nameAr: "ڤيجن كلاسيك", nameEn: "Vision Classic" }];

const addonSeed = [
  { id: "blueLight", nameAr: "حماية من الضوء الأزرق", nameEn: "Blue-light filter", price: 15_000, sortOrder: 1 },
  { id: "antiGlare", nameAr: "مضاد للانعكاس", nameEn: "Anti-glare coating", price: 10_000, sortOrder: 2 },
  { id: "thin", nameAr: "عدسات رقيقة", nameEn: "Thin lenses", price: 25_000, sortOrder: 3 },
];

type ProductSeed = {
  slug: string;
  code?: string;
  name: { ar: string; en: string };
  brand?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  shape?: (typeof products.$inferInsert)["shape"];
  colors: string[];
  note?: { ar: string; en: string };
  isBestSeller?: boolean;
  requiresPrescription?: boolean;
  supportsLensAddons?: boolean;
  gender?: (typeof products.$inferInsert)["gender"];
};

const productSeed: ProductSeed[] = [
  { slug: "vc-214", code: "VC 214", name: { ar: "إطار أسيتات مستطيل", en: "Rectangular acetate" }, brand: "vision-classic", category: "prescription", price: 75_000, compareAtPrice: 95_000, shape: "rectangle", colors: [swatches.black, swatches.brown, swatches.navy, swatches.gold], requiresPrescription: true },
  { slug: "classic-metal", name: { ar: "إطار كلاسيك معدني", en: "Classic metal frame" }, category: "prescription", price: 85_000, shape: "oval", colors: [swatches.silver, swatches.gold, swatches.black], isBestSeller: true, requiresPrescription: true },
  { slug: "aviator-sun", name: { ar: "شمسية أفياتور", en: "Aviator sunglasses" }, category: "sun", price: 120_000, shape: "aviator", colors: [swatches.gold, swatches.black, swatches.silver], isBestSeller: true, supportsLensAddons: false },
  { slug: "monthly-contacts", name: { ar: "عدسات لاصقة شهرية", en: "Monthly contact lenses" }, category: "contact", price: 38_000, colors: [swatches.clear], isBestSeller: true, supportsLensAddons: false, requiresPrescription: true },
  { slug: "kids-flex", name: { ar: "إطار أطفال مرن", en: "Flexible kids frame" }, category: "kids", price: 45_000, shape: "rectangle", colors: [swatches.navy, swatches.brown, swatches.black], isBestSeller: true, gender: "kids", requiresPrescription: true },
  { slug: "titanium-half", name: { ar: "تيتانيوم نصف إطار", en: "Titanium half-rim" }, category: "prescription", price: 98_000, shape: "half-rim", colors: [swatches.silver, swatches.black], note: { ar: "خفيف · ٨ غرام", en: "Light · 8 g" }, requiresPrescription: true },
  { slug: "thin-round", name: { ar: "إطار دائري رقيق", en: "Thin round frame" }, category: "prescription", price: 62_000, shape: "round", colors: [swatches.gold, swatches.black], requiresPrescription: true },
  { slug: "metal-oval", name: { ar: "إطار معدني بيضاوي", en: "Oval metal frame" }, category: "prescription", price: 68_000, shape: "oval", colors: [swatches.silver, swatches.gold], requiresPrescription: true },
  { slug: "full-acetate", name: { ar: "إطار كامل أسيتات", en: "Full-rim acetate" }, category: "prescription", price: 81_000, shape: "square", colors: [swatches.tortoise, swatches.black], requiresPrescription: true },
  { slug: "vc-210", code: "VC 210", name: { ar: "إطار أسيتات VC 210", en: "Acetate frame VC 210" }, brand: "vision-classic", category: "prescription", price: 69_000, shape: "rectangle", colors: [swatches.black, swatches.tortoise], requiresPrescription: true },
  { slug: "vc-233", code: "VC 233", name: { ar: "إطار أسيتات VC 233", en: "Acetate frame VC 233" }, brand: "vision-classic", category: "prescription", price: 82_000, shape: "square", colors: [swatches.navy, swatches.black], requiresPrescription: true },
  { slug: "reading-150", name: { ar: "إطار قراءة +1.50", en: "Reading glasses +1.50" }, category: "prescription", price: 32_000, shape: "rectangle", colors: [swatches.black, swatches.brown] },
  { slug: "daily-color-contacts", name: { ar: "عدسات ملونة يومية", en: "Daily coloured lenses" }, category: "contact", price: 28_000, colors: [swatches.clear], supportsLensAddons: false },
  { slug: "titanium-men", name: { ar: "إطار تيتانيوم رجالي", en: "Men's titanium frame" }, category: "prescription", price: 98_000, shape: "rectangle", colors: [swatches.silver, swatches.navy], gender: "men", requiresPrescription: true },
  { slug: "kids-sun", name: { ar: "شمسية أطفال", en: "Kids sunglasses" }, category: "kids", price: 34_000, shape: "round", colors: [swatches.navy, swatches.brown], gender: "kids", supportsLensAddons: false },
  { slug: "square-sun", name: { ar: "شمسية مربعة", en: "Square sunglasses" }, category: "sun", price: 110_000, shape: "square", colors: [swatches.black, swatches.tortoise], note: { ar: "عدسة مستقطبة", en: "Polarised lens" }, supportsLensAddons: false },
  { slug: "case-cleaner", name: { ar: "علبة + منظف عدسات", en: "Case + lens cleaner" }, category: "accessories", price: 9_000, colors: [swatches.black], supportsLensAddons: false },
];

async function main() {
  logger.info("Seeding…");

  const categoryIds = new Map<string, string>();
  for (const c of categorySeed) {
    const [row] = await db
      .insert(categories)
      .values(c)
      .onConflictDoUpdate({ target: categories.slug, set: { nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: c.sortOrder } })
      .returning({ id: categories.id });
    categoryIds.set(c.slug, row!.id);
  }

  const brandIds = new Map<string, string>();
  for (const b of brandSeed) {
    const [row] = await db.insert(brands).values(b).onConflictDoUpdate({ target: brands.slug, set: { nameAr: b.nameAr, nameEn: b.nameEn } }).returning({ id: brands.id });
    brandIds.set(b.slug, row!.id);
  }

  for (const a of addonSeed) {
    await db.insert(lensAddons).values(a).onConflictDoUpdate({ target: lensAddons.id, set: { nameAr: a.nameAr, nameEn: a.nameEn, price: a.price, sortOrder: a.sortOrder } });
  }

  for (const p of productSeed) {
    const values: typeof products.$inferInsert = {
      slug: p.slug,
      code: p.code ?? null,
      nameAr: p.name.ar,
      nameEn: p.name.en,
      noteAr: p.note?.ar ?? null,
      noteEn: p.note?.en ?? null,
      categoryId: categoryIds.get(p.category)!,
      brandId: p.brand ? brandIds.get(p.brand)! : null,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      shape: p.shape ?? null,
      gender: p.gender ?? "unisex",
      supportsLensAddons: p.supportsLensAddons ?? true,
      requiresPrescription: p.requiresPrescription ?? false,
      isBestSeller: p.isBestSeller ?? false,
    };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: products.id });

    for (const [i, hex] of p.colors.entries()) {
      await db
        .insert(productVariants)
        .values({ productId: row!.id, colorHex: hex, colorNameAr: colorNames[hex]?.ar, colorNameEn: colorNames[hex]?.en, stock: 25, sortOrder: i })
        .onConflictDoUpdate({ target: [productVariants.productId, productVariants.colorHex], set: { sortOrder: i, colorNameAr: colorNames[hex]?.ar, colorNameEn: colorNames[hex]?.en } });
    }
  }

  const existingDoctor = await db.query.doctors.findFirst({ where: eq(doctors.nameEn, "Dr. Ahmed Al-Saedy") });
  if (!existingDoctor) {
    await db.insert(doctors).values({ nameAr: "د. أحمد الصاعدي", nameEn: "Dr. Ahmed Al-Saedy", specialtyAr: "أخصائي بصريات", specialtyEn: "Optometrist" });
  }

  const existingBanner = await db.query.banners.findFirst({ where: eq(banners.titleEn, "Free eye exam with every frame") });
  if (!existingBanner) {
    await db.insert(banners).values([
      { titleAr: "فحص نظر مجاني مع كل إطار", titleEn: "Free eye exam with every frame", subtitleAr: "احجز موعدك اليوم", subtitleEn: "Book your visit today", ctaAr: "احجز الآن", ctaEn: "Book now", link: "/book-exam", sortOrder: 1 },
      { titleAr: "خصم ٢٠٪ على النظارات الشمسية", titleEn: "20% off sunglasses", subtitleAr: "تشكيلة الصيف", subtitleEn: "Summer collection", ctaAr: "تسوق", ctaEn: "Shop", link: "/categories?category=sun", sortOrder: 2 },
    ]);
  }

  await db
    .insert(promoCodes)
    .values({ code: "WELCOME10", type: "percent", value: 10, minSubtotal: 50_000, maxDiscount: 20_000 })
    .onConflictDoNothing();

  logger.info({ categories: categorySeed.length, products: productSeed.length, addons: addonSeed.length }, "Seed complete");
}

try {
  await main();
} catch (err) {
  logger.fatal({ err }, "Seed failed");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
