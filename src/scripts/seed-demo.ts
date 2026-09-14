/**
 * Demo dataset: fills EVERY table with realistic optics-shop data so you can
 * explore the API / admin panel and learn how an optician's business works.
 *
 *   pnpm db:seed:demo
 *
 * Idempotent – catalogue rows are upserted by slug / id, and the demo customers
 * (all `*@demo.alsaedy.iq`) are wiped and re-created on every run together with
 * everything hanging off them (addresses, prescriptions, orders, reviews…).
 * Demo customers all sign in with the password `Password123!`.
 *
 * ───────────────────────────── OPTICS PRIMER ─────────────────────────────
 *
 * A glasses order = FRAME + LENSES (+ optional lens coatings/add-ons).
 *
 * FRAME
 *   Sold per colour ("variant"). Sizes are printed on the temple as
 *   `lens width – bridge – temple length` in millimetres, e.g. `52-18-145`.
 *   Materials: acetate (plastic, coloured), metal, titanium (light, hypoallergenic), TR90 (flexible nylon – kids).
 *   Shapes: rectangle, round, oval, aviator, square, half-rim (metal top, no bottom rim), cat-eye.
 *
 * PRESCRIPTION (Rx) – written per eye
 *   OD = right eye (oculus dexter), OS = left eye (oculus sinister).
 *   SPH  (sphere)   : main power in dioptres, steps of 0.25.
 *                     negative (-2.00) = myopia (near-sighted, can't see far).
 *                     positive (+1.50) = hyperopia (far-sighted, tired reading).
 *   CYL  (cylinder) : astigmatism correction – the eye isn't perfectly round.
 *                     Always paired with AXIS (0-180°) that says where to rotate it.
 *   ADD  (addition) : extra plus power for reading, needed after ~40 (presbyopia).
 *                     Leads to bifocal / progressive lenses.
 *   PD   (pupillary distance) : mm between pupils (adults 54-74) so the lens
 *                     optical centre sits in front of each pupil.
 *   An Rx is usually valid for 1-2 years, then the shop asks for a new exam.
 *
 * LENS ADD-ONS (upsells applied to the lens, not the frame)
 *   Anti-reflective (anti-glare), blue-light filter, hard/scratch coat, UV400,
 *   photochromic (darken outdoors), polarised (cuts reflected glare – sunglasses),
 *   high-index thin lenses (1.67 / 1.74) for strong prescriptions (|SPH| > 4)
 *   so the lens edge doesn't look thick, progressive/bifocal for presbyopia.
 *
 * CONTACT LENSES
 *   Sold in boxes by replacement schedule: daily / bi-weekly / monthly.
 *   Power is picked per eye (the `variantLabel` on a cart/order line, e.g.
 *   "OD -2.00 / OS -2.25"). Torics correct astigmatism; multifocals correct
 *   presbyopia. Base curve (BC) + diameter (DIA) must fit the cornea.
 *
 * ORDER FLOW
 *   pending → confirmed → lab (lenses cut & fitted, 1-3 days) → onTheWay → delivered
 *   (or → ready for in-store pickup).  Sunglasses / accessories skip the lab.
 * ──────────────────────────────────────────────────────────────────────────
 */
import { hashPassword } from "better-auth/crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { closeDatabase, db } from "../db/index.js";
import {
  account,
  addresses,
  appointments,
  banners,
  brands,
  cartItems,
  carts,
  categories,
  deviceTokens,
  doctors,
  lensAddons,
  notifications,
  orderEvents,
  orderItems,
  orders,
  prescriptions,
  productImages,
  products,
  productVariants,
  promoCodes,
  reviews,
  user,
  wishlistItems,
} from "../db/schema/index.js";
import type { AddressSnapshot, OrderItemAddon, OrderStatus, PrescriptionSnapshot } from "../db/schema/index.js";
import { zonedTimeToUtc } from "../lib/time.js";

const DEMO_EMAIL_DOMAIN = "demo.alsaedy.iq";
const DEMO_PASSWORD = "Password123!";

/* ───────────────────────────── helpers ───────────────────────────── */

const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};
const daysAhead = (n: number) => daysAgo(-n);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Deterministic placeholder image so the app has something to render. */
const img = (seed: string, n = 1) => `https://picsum.photos/seed/${seed}-${n}/900/700`;

type L = { ar: string; en: string };

/* ───────────────────────────── colours ───────────────────────────── */

const swatch = {
  black: { hex: "#22262B", ar: "أسود", en: "Black" },
  matteBlack: { hex: "#111111", ar: "أسود مطفي", en: "Matte black" },
  brown: { hex: "#8A5A3B", ar: "بني", en: "Brown" },
  tortoise: { hex: "#6B4A2B", ar: "تورتوز (سلحفاة)", en: "Tortoise" },
  havana: { hex: "#5C3A1E", ar: "هافانا", en: "Havana" },
  navy: { hex: "#16294F", ar: "كحلي", en: "Navy" },
  gold: { hex: "#C0A062", ar: "ذهبي", en: "Gold" },
  roseGold: { hex: "#B76E79", ar: "ذهبي وردي", en: "Rose gold" },
  silver: { hex: "#B8BCC4", ar: "فضي", en: "Silver" },
  gunmetal: { hex: "#5A5F66", ar: "رمادي معدني", en: "Gunmetal" },
  crystal: { hex: "#D9E4F0", ar: "شفاف", en: "Crystal" },
  red: { hex: "#B3261E", ar: "أحمر", en: "Red" },
  green: { hex: "#2E5E4E", ar: "أخضر", en: "Green" },
  blue: { hex: "#2F6DB5", ar: "أزرق", en: "Blue" },
  pink: { hex: "#E38AAE", ar: "وردي", en: "Pink" },
  purple: { hex: "#6A4C93", ar: "بنفسجي", en: "Purple" },
  // Contact-lens "colours" – clear lenses, or the tint of coloured lenses
  clear: { hex: "#EAF2FA", ar: "شفاف", en: "Clear" },
  hazel: { hex: "#A67B4F", ar: "عسلي", en: "Hazel" },
  grey: { hex: "#9AA3AD", ar: "رمادي", en: "Grey" },
  honey: { hex: "#C9932B", ar: "عسل", en: "Honey" },
} as const;
type Swatch = (typeof swatch)[keyof typeof swatch];

/* ───────────────────────────── categories ───────────────────────────── */

const categorySeed = [
  { slug: "prescription", nameAr: "نظارات طبية", nameEn: "Prescription glasses", sortOrder: 1, descriptionAr: "إطارات تُركّب فيها عدسات حسب وصفة الطبيب", descriptionEn: "Frames fitted with lenses cut to your prescription" },
  { slug: "sun", nameAr: "نظارات شمسية", nameEn: "Sunglasses", sortOrder: 2, descriptionAr: "حماية من الأشعة فوق البنفسجية، يمكن تركيب عدسات طبية لبعض الموديلات", descriptionEn: "UV protection; many models can take prescription lenses" },
  { slug: "contact", nameAr: "عدسات لاصقة", nameEn: "Contact lenses", sortOrder: 3, descriptionAr: "يومية، نصف شهرية، وشهرية – تحتاج وصفة عدسات لاصقة", descriptionEn: "Daily, bi-weekly and monthly – needs a contact-lens prescription" },
  { slug: "kids", nameAr: "أطفال", nameEn: "Kids", sortOrder: 4, descriptionAr: "إطارات مرنة وخفيفة للأطفال", descriptionEn: "Flexible, light frames for children" },
  { slug: "accessories", nameAr: "إكسسوارات", nameEn: "Accessories", sortOrder: 5, descriptionAr: "علب، منظفات، محاليل عدسات", descriptionEn: "Cases, cleaners, contact-lens solutions" },
].map((c) => ({ ...c, imageUrl: img(`cat-${c.slug}`) }));

/* ───────────────────────────── brands ───────────────────────────── */

const brandSeed = [
  { slug: "ray-ban", nameAr: "راي بان", nameEn: "Ray-Ban" },
  { slug: "oakley", nameAr: "أوكلي", nameEn: "Oakley" },
  { slug: "persol", nameAr: "بيرسول", nameEn: "Persol" },
  { slug: "gucci", nameAr: "غوتشي", nameEn: "Gucci" },
  { slug: "vision-classic", nameAr: "ڤيجن كلاسيك", nameEn: "Vision Classic" }, // house brand
  { slug: "acuvue", nameAr: "أكيوفيو", nameEn: "Acuvue" }, // Johnson & Johnson contacts
  { slug: "alcon", nameAr: "ألكون", nameEn: "Alcon" }, // Dailies, Air Optix, FreshLook
  { slug: "coopervision", nameAr: "كوبر فيجن", nameEn: "CooperVision" }, // Biofinity
  { slug: "bausch-lomb", nameAr: "بوش آند لومب", nameEn: "Bausch + Lomb" }, // renu, Biotrue
  { slug: "zeiss", nameAr: "زايس", nameEn: "ZEISS" }, // lens cleaning
].map((b) => ({ ...b, logoUrl: img(`brand-${b.slug}`) }));

/* ───────────────────────────── lens add-ons ───────────────────────────── */

const addonSeed: (typeof lensAddons.$inferInsert)[] = [
  { id: "antiGlare", nameAr: "طبقة مضادة للانعكاس", nameEn: "Anti-reflective coating", descriptionAr: "تقلل الانعكاسات من الشاشات ومصابيح السيارات ليلاً، وتجعل العدسة تبدو شفافة في الصور", descriptionEn: "Cuts reflections from screens and headlights at night and makes lenses look invisible in photos", price: 10_000, sortOrder: 1 },
  { id: "blueLight", nameAr: "فلتر الضوء الأزرق", nameEn: "Blue-light filter", descriptionAr: "يرشّح جزءاً من الضوء الأزرق المنبعث من الشاشات لتقليل إجهاد العين", descriptionEn: "Filters part of the blue light from screens to reduce eye strain", price: 15_000, sortOrder: 2 },
  { id: "hardCoat", nameAr: "طبقة مقاومة للخدش", nameEn: "Scratch-resistant hard coat", descriptionAr: "طبقة صلبة تحمي العدسات البلاستيكية من الخدوش اليومية", descriptionEn: "Hard layer that protects plastic lenses from everyday scratches", price: 8_000, sortOrder: 3 },
  { id: "uv400", nameAr: "حماية UV400", nameEn: "UV400 protection", descriptionAr: "يحجب ١٠٠٪ من الأشعة فوق البنفسجية UVA و UVB", descriptionEn: "Blocks 100% of UVA and UVB rays", price: 5_000, sortOrder: 4 },
  { id: "thin", nameAr: "عدسات رقيقة 1.67", nameEn: "Thin lenses (index 1.67)", descriptionAr: "أرق وأخف بنسبة ٣٠٪ من العدسة العادية – يُنصح بها إذا كانت القوة أعلى من ±4.00", descriptionEn: "30% thinner and lighter than standard lenses – recommended when power is above ±4.00", price: 25_000, sortOrder: 5 },
  { id: "ultraThin", nameAr: "عدسات فائقة الرقة 1.74", nameEn: "Ultra-thin lenses (index 1.74)", descriptionAr: "الأرق على الإطلاق – للقوى العالية فوق ±6.00", descriptionEn: "The thinnest available – for high powers above ±6.00", price: 45_000, sortOrder: 6 },
  { id: "photochromic", nameAr: "عدسات متغيرة اللون", nameEn: "Photochromic (light-adaptive)", descriptionAr: "شفافة داخل المبنى وتغمق تلقائياً تحت الشمس – نظارة طبية وشمسية معاً", descriptionEn: "Clear indoors, darkens automatically in sunlight – glasses and sunglasses in one", price: 35_000, sortOrder: 7 },
  { id: "polarized", nameAr: "عدسات مستقطبة", nameEn: "Polarised lenses", descriptionAr: "تلغي الوهج المنعكس عن الماء والطريق – مثالية للقيادة", descriptionEn: "Removes glare reflected off water and roads – ideal for driving", price: 20_000, sortOrder: 8 },
  { id: "tint", nameAr: "تلوين العدسة", nameEn: "Lens tint", descriptionAr: "تلوين العدسات الطبية بدرجة رمادية أو بنية لتصبح شمسية", descriptionEn: "Tints prescription lenses grey or brown to turn them into sunglasses", price: 12_000, sortOrder: 9 },
  { id: "bifocal", nameAr: "عدسات ثنائية البؤرة", nameEn: "Bifocal lenses", descriptionAr: "جزء علوي للبعيد وجزء سفلي واضح الحدود للقراءة – لمن يحتاج ADD", descriptionEn: "Distance on top, a visible reading segment at the bottom – for prescriptions with an ADD", price: 30_000, sortOrder: 10 },
  { id: "progressive", nameAr: "عدسات متعددة البؤر (بروغريسف)", nameEn: "Progressive lenses", descriptionAr: "انتقال تدريجي بين البعيد والمتوسط والقريب بدون خط ظاهر – بديل عصري للثنائية", descriptionEn: "Smooth distance → intermediate → reading zones with no visible line – the modern alternative to bifocals", price: 60_000, sortOrder: 11 },
];

/* ───────────────────────────── products ───────────────────────────── */

type ProductSeed = {
  slug: string;
  code?: string;
  name: L;
  description: L;
  note?: L;
  brand?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  shape?: (typeof products.$inferInsert)["shape"];
  gender?: (typeof products.$inferInsert)["gender"];
  specs?: (typeof products.$inferInsert)["specs"];
  colors: Swatch[];
  stock?: number;
  isBestSeller?: boolean;
  requiresPrescription?: boolean;
  supportsLensAddons?: boolean;
  images?: number;
};

const productSeed: ProductSeed[] = [
  /* ── Prescription frames ─────────────────────────────────────────── */
  {
    slug: "ray-ban-rx5228", code: "RX 5228", brand: "ray-ban", category: "prescription", shape: "rectangle", gender: "unisex",
    name: { ar: "راي بان RX5228 أسيتات", en: "Ray-Ban RX5228 acetate" },
    description: { ar: "إطار أسيتات كامل مستطيل، الأكثر مبيعاً من راي بان للنظارات الطبية. مناسب للوجه البيضاوي والدائري.", en: "Full-rim rectangular acetate – Ray-Ban's best-selling optical frame. Suits oval and round faces." },
    price: 145_000, compareAtPrice: 165_000, isBestSeller: true, requiresPrescription: true,
    specs: { lensWidth: 53, bridge: 17, templeLength: 140, frameWidth: 139, lensHeight: 38, weightGrams: 27, material: "Acetate" },
    colors: [swatch.black, swatch.tortoise, swatch.havana],
  },
  {
    slug: "ray-ban-rx7047", code: "RX 7047", brand: "ray-ban", category: "prescription", shape: "square", gender: "unisex",
    name: { ar: "راي بان RX7047 نايلون خفيف", en: "Ray-Ban RX7047 lightweight nylon" },
    description: { ar: "إطار مربع خفيف الوزن من النايلون المرن، مثالي للاستخدام اليومي الطويل.", en: "Lightweight square frame in flexible nylon – comfortable for all-day wear." },
    price: 125_000, requiresPrescription: true,
    specs: { lensWidth: 54, bridge: 17, templeLength: 145, frameWidth: 140, lensHeight: 39, weightGrams: 18, material: "Nylon" },
    colors: [swatch.matteBlack, swatch.navy, swatch.tortoise],
  },
  {
    slug: "ray-ban-rx6375", code: "RX 6375", brand: "ray-ban", category: "prescription", shape: "round", gender: "unisex",
    name: { ar: "راي بان RX6375 معدني دائري", en: "Ray-Ban RX6375 round metal" },
    description: { ar: "إطار معدني دائري بحواف رفيعة وجسر مزدوج، ستايل كلاسيكي.", en: "Thin round metal frame with a double bridge – a classic look." },
    price: 135_000, requiresPrescription: true,
    specs: { lensWidth: 51, bridge: 20, templeLength: 145, frameWidth: 140, lensHeight: 46, weightGrams: 22, material: "Metal" },
    colors: [swatch.gold, swatch.gunmetal, swatch.silver],
  },
  {
    slug: "oakley-ox8046-airdrop", code: "OX 8046", brand: "oakley", category: "prescription", shape: "rectangle", gender: "men",
    name: { ar: "أوكلي Airdrop OX8046", en: "Oakley Airdrop OX8046" },
    description: { ar: "إطار رياضي من مادة O-Matter المرنة والمقاومة للكسر، وسائد أنف Unobtainium تمنع الانزلاق عند التعرق.", en: "Sport frame in impact-resistant O-Matter with Unobtainium nose pads that grip better when you sweat." },
    price: 165_000, requiresPrescription: true,
    specs: { lensWidth: 55, bridge: 18, templeLength: 143, frameWidth: 143, lensHeight: 36, weightGrams: 24, material: "O-Matter (nylon)" },
    colors: [swatch.matteBlack, swatch.gunmetal],
  },
  {
    slug: "oakley-crosslink-ox8027", code: "OX 8027", brand: "oakley", category: "prescription", shape: "rectangle", gender: "men",
    name: { ar: "أوكلي Crosslink OX8027", en: "Oakley Crosslink OX8027" },
    description: { ar: "أذرع قابلة للتبديل: ذراع للعمل وذراع للرياضة في نفس العلبة.", en: "Swappable temples: one pair for the office, one for sport, in the same box." },
    price: 175_000, compareAtPrice: 195_000, requiresPrescription: true,
    specs: { lensWidth: 55, bridge: 18, templeLength: 137, frameWidth: 142, lensHeight: 37, weightGrams: 23, material: "O-Matter (nylon)" },
    colors: [swatch.matteBlack, swatch.navy, swatch.red],
  },
  {
    slug: "persol-po3007v", code: "PO 3007V", brand: "persol", category: "prescription", shape: "square", gender: "men",
    name: { ar: "بيرسول PO3007V أسيتات إيطالي", en: "Persol PO3007V Italian acetate" },
    description: { ar: "صناعة يدوية إيطالية، مفصل Meflecto المرن والسهم الفضي الشهير على الذراع.", en: "Handmade in Italy with the flexible Meflecto hinge and the signature silver arrow on the temple." },
    price: 240_000, requiresPrescription: true,
    specs: { lensWidth: 52, bridge: 20, templeLength: 145, frameWidth: 141, lensHeight: 40, weightGrams: 30, material: "Acetate" },
    colors: [swatch.havana, swatch.black],
  },
  {
    slug: "gucci-gg0027o", code: "GG 0027O", brand: "gucci", category: "prescription", shape: "cat-eye", gender: "women",
    name: { ar: "غوتشي GG0027O كات آي", en: "Gucci GG0027O cat-eye" },
    description: { ar: "إطار كات آي نسائي بشريط غوتشي الأخضر والأحمر على الأذرع.", en: "Women's cat-eye with the Gucci green-red web stripe on the temples." },
    price: 385_000, requiresPrescription: true,
    specs: { lensWidth: 50, bridge: 17, templeLength: 140, frameWidth: 136, lensHeight: 42, weightGrams: 31, material: "Acetate" },
    colors: [swatch.black, swatch.havana, swatch.red],
  },
  {
    slug: "vc-214", code: "VC 214", brand: "vision-classic", category: "prescription", shape: "rectangle", gender: "unisex",
    name: { ar: "ڤيجن كلاسيك VC 214 أسيتات", en: "Vision Classic VC 214 acetate" },
    description: { ar: "خيارنا الاقتصادي: أسيتات متين بأربعة ألوان، ضمان سنة على المفصلات.", en: "Our value pick: sturdy acetate in four colours with a 1-year hinge warranty." },
    price: 75_000, compareAtPrice: 95_000, isBestSeller: true, requiresPrescription: true,
    specs: { lensWidth: 52, bridge: 18, templeLength: 142, frameWidth: 138, lensHeight: 37, weightGrams: 26, material: "Acetate" },
    colors: [swatch.black, swatch.brown, swatch.navy, swatch.crystal], stock: 40,
  },
  {
    slug: "vc-titanium-half-rim", code: "VC T-08", brand: "vision-classic", category: "prescription", shape: "half-rim", gender: "men",
    name: { ar: "ڤيجن كلاسيك تيتانيوم نصف إطار", en: "Vision Classic titanium half-rim" },
    description: { ar: "إطار نصفي: الجزء العلوي تيتانيوم والعدسة مثبتة بخيط نايلون من الأسفل. لا يسبب حساسية.", en: "Half-rim: titanium top bar with the lens held by a nylon cord below. Hypoallergenic." },
    note: { ar: "خفيف · ٨ غرام", en: "Light · 8 g" },
    price: 98_000, requiresPrescription: true,
    specs: { lensWidth: 54, bridge: 18, templeLength: 140, frameWidth: 140, lensHeight: 33, weightGrams: 8, material: "Titanium" },
    colors: [swatch.silver, swatch.gunmetal, swatch.gold],
  },
  {
    slug: "vc-round-metal", code: "VC R-21", brand: "vision-classic", category: "prescription", shape: "round", gender: "women",
    name: { ar: "ڤيجن كلاسيك دائري رقيق", en: "Vision Classic thin round" },
    description: { ar: "إطار معدني دائري رفيع بلمسة ذهبية وردية.", en: "Slim round metal frame with a rose-gold finish." },
    price: 62_000, requiresPrescription: true,
    specs: { lensWidth: 49, bridge: 21, templeLength: 145, frameWidth: 136, lensHeight: 45, weightGrams: 15, material: "Metal" },
    colors: [swatch.roseGold, swatch.gold, swatch.black],
  },
  {
    slug: "vc-oval-metal", code: "VC O-05", brand: "vision-classic", category: "prescription", shape: "oval", gender: "unisex",
    name: { ar: "ڤيجن كلاسيك بيضاوي معدني", en: "Vision Classic oval metal" },
    description: { ar: "إطار بيضاوي كلاسيكي بوسائد أنف سيليكون قابلة للتعديل.", en: "Classic oval with adjustable silicone nose pads." },
    price: 68_000, requiresPrescription: true,
    specs: { lensWidth: 51, bridge: 19, templeLength: 140, frameWidth: 135, lensHeight: 34, weightGrams: 17, material: "Metal" },
    colors: [swatch.silver, swatch.gold],
  },
  {
    slug: "reading-glasses-plus", code: "RG-150", brand: "vision-classic", category: "prescription", shape: "rectangle", gender: "unisex",
    name: { ar: "نظارة قراءة جاهزة", en: "Ready-made reading glasses" },
    description: { ar: "قوة موحدة للعينين (+1.00 إلى +3.00) لمن يحتاج ADD فقط بدون استغماتزم. لا تحتاج وصفة – اختر القوة عند الإضافة للسلة.", en: "Same power in both eyes (+1.00 to +3.00) for people who only need an ADD, no astigmatism. No prescription needed – pick the power when adding to cart." },
    price: 25_000, supportsLensAddons: false,
    specs: { lensWidth: 50, bridge: 18, templeLength: 140, weightGrams: 20, material: "Plastic" },
    colors: [swatch.black, swatch.tortoise, swatch.blue], stock: 60,
  },

  /* ── Sunglasses ──────────────────────────────────────────────────── */
  {
    slug: "ray-ban-rb2140-wayfarer", code: "RB 2140", brand: "ray-ban", category: "sun", shape: "square", gender: "unisex",
    name: { ar: "راي بان واي فيرر الأصلي RB2140", en: "Ray-Ban Original Wayfarer RB2140" },
    description: { ar: "الموديل الأيقوني منذ ١٩٥٢. عدسات زجاجية G-15 خضراء تحجب ١٠٠٪ من UV. يمكن تركيب عدسات طبية.", en: "The icon since 1952. Green G-15 glass lenses block 100% UV. Can be fitted with prescription lenses." },
    price: 185_000, isBestSeller: true,
    specs: { lensWidth: 50, bridge: 22, templeLength: 150, frameWidth: 140, lensHeight: 41, weightGrams: 45, material: "Acetate" },
    colors: [swatch.black, swatch.tortoise],
  },
  {
    slug: "ray-ban-rb3025-aviator", code: "RB 3025", brand: "ray-ban", category: "sun", shape: "aviator", gender: "unisex",
    name: { ar: "راي بان أفياتور RB3025", en: "Ray-Ban Aviator Classic RB3025" },
    description: { ar: "صُمم للطيارين عام ١٩٣٧. عدسات قطرية كبيرة بشكل دمعة تغطي مجال الرؤية كاملاً.", en: "Designed for pilots in 1937. Large teardrop lenses cover the whole field of view." },
    note: { ar: "متوفر بعدسة مستقطبة", en: "Polarised option available" },
    price: 175_000, compareAtPrice: 199_000, isBestSeller: true,
    specs: { lensWidth: 58, bridge: 14, templeLength: 135, frameWidth: 137, lensHeight: 50, weightGrams: 31, material: "Metal" },
    colors: [swatch.gold, swatch.silver, swatch.matteBlack],
  },
  {
    slug: "ray-ban-rb3016-clubmaster", code: "RB 3016", brand: "ray-ban", category: "sun", shape: "half-rim", gender: "unisex",
    name: { ar: "راي بان كلوب ماستر RB3016", en: "Ray-Ban Clubmaster RB3016" },
    description: { ar: "ستايل الخمسينات: حاجب علوي أسيتات وإطار سفلي معدني رفيع.", en: "1950s browline style: acetate brow bar with a thin metal lower rim." },
    price: 195_000,
    specs: { lensWidth: 51, bridge: 21, templeLength: 145, frameWidth: 140, lensHeight: 42, weightGrams: 35, material: "Acetate / metal" },
    colors: [swatch.black, swatch.tortoise],
  },
  {
    slug: "ray-ban-rb3447-round", code: "RB 3447", brand: "ray-ban", category: "sun", shape: "round", gender: "unisex",
    name: { ar: "راي بان راوند ميتال RB3447", en: "Ray-Ban Round Metal RB3447" },
    description: { ar: "الإطار الدائري الشهير الذي ارتبط بالستينات، عدسات كريستال.", en: "The famous round frame of the sixties, with crystal lenses." },
    price: 165_000,
    specs: { lensWidth: 50, bridge: 21, templeLength: 145, frameWidth: 136, lensHeight: 49, weightGrams: 29, material: "Metal" },
    colors: [swatch.gold, swatch.gunmetal],
  },
  {
    slug: "oakley-oo9102-holbrook", code: "OO 9102", brand: "oakley", category: "sun", shape: "square", gender: "men",
    name: { ar: "أوكلي هولبروك OO9102", en: "Oakley Holbrook OO9102" },
    description: { ar: "عدسات Prizm تُبرز الألوان والتفاصيل، إطار O-Matter خفيف.", en: "Prizm lenses boost colour and contrast in a light O-Matter frame." },
    note: { ar: "Prizm Polarized", en: "Prizm Polarized" },
    price: 210_000, isBestSeller: true,
    specs: { lensWidth: 55, bridge: 18, templeLength: 137, frameWidth: 137, lensHeight: 43, weightGrams: 26, material: "O-Matter (nylon)" },
    colors: [swatch.matteBlack, swatch.tortoise, swatch.navy],
  },
  {
    slug: "oakley-oo9013-frogskins", code: "OO 9013", brand: "oakley", category: "sun", shape: "square", gender: "unisex",
    name: { ar: "أوكلي فروغ سكينز OO9013", en: "Oakley Frogskins OO9013" },
    description: { ar: "الموديل الملون من الثمانينات، شبابي وخفيف.", en: "The colourful 80s classic – youthful and light." },
    price: 155_000,
    specs: { lensWidth: 55, bridge: 17, templeLength: 133, frameWidth: 134, lensHeight: 43, weightGrams: 24, material: "O-Matter (nylon)" },
    colors: [swatch.matteBlack, swatch.crystal, swatch.blue, swatch.red],
  },
  {
    slug: "oakley-oo9208-radar-ev", code: "OO 9208", brand: "oakley", category: "sun", shape: "half-rim", gender: "men",
    name: { ar: "أوكلي رادار EV Path", en: "Oakley Radar EV Path" },
    description: { ar: "نظارة رياضية للدراجات والجري: عدسة واحدة عريضة، مقاومة للصدمات، تسمح بمرور الهواء.", en: "Sport shield for cycling and running: single wide lens, impact resistant, ventilated." },
    price: 245_000, supportsLensAddons: false,
    specs: { lensWidth: 38, bridge: 0, templeLength: 128, frameWidth: 138, weightGrams: 30, material: "O-Matter (nylon)" },
    colors: [swatch.matteBlack, swatch.crystal],
  },
  {
    slug: "persol-po0714", code: "PO 0714", brand: "persol", category: "sun", shape: "square", gender: "men",
    name: { ar: "بيرسول PO0714 قابل للطي", en: "Persol PO0714 folding" },
    description: { ar: "نظارة ستيف ماكوين، تُطوى بالكامل لتدخل في جيب القميص. عدسات زجاجية كريستال.", en: "The Steve McQueen frame – folds flat to fit a shirt pocket. Crystal glass lenses." },
    price: 320_000,
    specs: { lensWidth: 54, bridge: 21, templeLength: 140, frameWidth: 142, lensHeight: 42, weightGrams: 42, material: "Acetate" },
    colors: [swatch.havana, swatch.black],
  },
  {
    slug: "gucci-gg0061s", code: "GG 0061S", brand: "gucci", category: "sun", shape: "oval", gender: "women",
    name: { ar: "غوتشي GG0061S أوفرسايز", en: "Gucci GG0061S oversized" },
    description: { ar: "عدسات متدرجة اللون كبيرة، إطار معدني ذهبي مع تفاصيل النحلة.", en: "Large gradient lenses in a gold metal frame with bee details." },
    price: 420_000, compareAtPrice: 480_000,
    specs: { lensWidth: 56, bridge: 17, templeLength: 140, frameWidth: 140, lensHeight: 52, weightGrams: 38, material: "Metal" },
    colors: [swatch.gold, swatch.roseGold],
  },
  {
    slug: "vc-square-polarized", code: "VC S-30", brand: "vision-classic", category: "sun", shape: "square", gender: "unisex",
    name: { ar: "ڤيجن كلاسيك مربعة مستقطبة", en: "Vision Classic square polarised" },
    description: { ar: "خيار اقتصادي بعدسة مستقطبة TAC وحماية UV400.", en: "Budget pick with TAC polarised lens and UV400 protection." },
    note: { ar: "عدسة مستقطبة", en: "Polarised lens" },
    price: 45_000, compareAtPrice: 60_000,
    specs: { lensWidth: 53, bridge: 19, templeLength: 145, weightGrams: 28, material: "TR90" },
    colors: [swatch.black, swatch.tortoise, swatch.green], stock: 35,
  },

  /* ── Contact lenses ──────────────────────────────────────────────── */
  //  Prices are per BOX. Power (e.g. "-2.00") is chosen per eye when
  //  adding to cart → `variantLabel`. `supportsLensAddons` is always false.
  {
    slug: "acuvue-oasys-2-week", code: "OASYS-6", brand: "acuvue", category: "contact",
    name: { ar: "أكيوفيو أوسيس نصف شهرية (٦ عدسات)", en: "Acuvue Oasys 2-week (6 lenses)" },
    description: { ar: "سيليكون هيدروجيل عالي النفاذية للأكسجين، تقنية Hydraclear Plus للراحة في الأجواء الجافة والمكيفة. تُستبدل كل ١٤ يوماً. BC 8.4 · DIA 14.0", en: "Silicone hydrogel with high oxygen flow and Hydraclear Plus for comfort in dry, air-conditioned rooms. Replace every 14 days. BC 8.4 · DIA 14.0" },
    note: { ar: "نصف شهرية · ٦ عدسات", en: "Bi-weekly · 6 lenses" },
    price: 48_000, isBestSeller: true, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 80,
  },
  {
    slug: "acuvue-oasys-astigmatism", code: "OASYS-T", brand: "acuvue", category: "contact",
    name: { ar: "أكيوفيو أوسيس للاستغماتزم (٦ عدسات)", en: "Acuvue Oasys for Astigmatism (6 lenses)" },
    description: { ar: "عدسة توريك (Toric): تصحح الاستغماتزم (CYL) وتبقى ثابتة في مكانها بتقنية Blink Stabilized. تحتاج SPH + CYL + AXIS.", en: "Toric lens: corrects astigmatism (CYL) and stays aligned thanks to Blink Stabilized design. Needs SPH + CYL + AXIS." },
    note: { ar: "نصف شهرية · توريك", en: "Bi-weekly · Toric" },
    price: 62_000, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 40,
  },
  {
    slug: "acuvue-1-day-moist", code: "MOIST-30", brand: "acuvue", category: "contact",
    name: { ar: "ون داي أكيوفيو مويست (٣٠ عدسة)", en: "1-Day Acuvue Moist (30 lenses)" },
    description: { ar: "عدسات يومية تُرمى بعد الاستخدام – لا حاجة لمحلول أو علبة. الأنسب للمبتدئين والاستخدام المتقطع.", en: "Daily disposables – no solution or case needed. Best for beginners and occasional wear." },
    note: { ar: "يومية · ٣٠ عدسة", en: "Daily · 30 lenses" },
    price: 55_000, isBestSeller: true, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 100,
  },
  {
    slug: "dailies-total1", code: "DT1-30", brand: "alcon", category: "contact",
    name: { ar: "ديليز توتال ١ (٣٠ عدسة)", en: "Dailies Total1 (30 lenses)" },
    description: { ar: "عدسة يومية بتدرج مائي: سطح العدسة رطوبته ~١٠٠٪ فلا تشعر بها. الأغلى والأكثر راحة.", en: "Water-gradient daily: the lens surface is ~100% water so you barely feel it. Premium comfort." },
    note: { ar: "يومية · ٣٠ عدسة", en: "Daily · 30 lenses" },
    price: 75_000, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 50,
  },
  {
    slug: "air-optix-night-day", code: "AONAD-6", brand: "alcon", category: "contact",
    name: { ar: "إير أوبتكس نايت آند داي (٦ عدسات)", en: "Air Optix Night & Day (6 lenses)" },
    description: { ar: "شهرية معتمدة للبس المتواصل حتى ٣٠ يوماً وليلة (بموافقة الطبيب).", en: "Monthly lens approved for up to 30 nights of continuous wear (with your doctor's OK)." },
    note: { ar: "شهرية · ٦ عدسات", en: "Monthly · 6 lenses" },
    price: 68_000, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 30,
  },
  {
    slug: "biofinity-monthly", code: "BIO-6", brand: "coopervision", category: "contact",
    name: { ar: "بايوفينيتي شهرية (٦ عدسات)", en: "Biofinity monthly (6 lenses)" },
    description: { ar: "سيليكون هيدروجيل شهرية بتقنية Aquaform، الخيار الاقتصادي للبس اليومي.", en: "Aquaform silicone-hydrogel monthly – the value choice for everyday wear." },
    note: { ar: "شهرية · ٦ عدسات", en: "Monthly · 6 lenses" },
    price: 45_000, compareAtPrice: 52_000, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 60,
  },
  {
    slug: "biofinity-multifocal", code: "BIO-MF", brand: "coopervision", category: "contact",
    name: { ar: "بايوفينيتي متعددة البؤر (٦ عدسات)", en: "Biofinity multifocal (6 lenses)" },
    description: { ar: "لمن فوق الأربعين: تصحح البعيد والقريب معاً (تحتاج قيمة ADD في الوصفة).", en: "For over-40s: corrects distance and reading in one lens (needs an ADD value on the Rx)." },
    note: { ar: "شهرية · متعددة البؤر", en: "Monthly · Multifocal" },
    price: 72_000, requiresPrescription: true, supportsLensAddons: false,
    colors: [swatch.clear], stock: 20,
  },
  {
    slug: "freshlook-colorblends", code: "FLCB-2", brand: "alcon", category: "contact",
    name: { ar: "فريش لوك كولور بلندز (عدستان)", en: "FreshLook ColorBlends (2 lenses)" },
    description: { ar: "عدسات ملونة شهرية بثلاث طبقات لون لمظهر طبيعي. متوفرة بدون قوة (0.00) للتجميل فقط أو بقوة طبية.", en: "Monthly coloured lenses with 3-in-1 colour blending for a natural look. Available plano (0.00) for cosmetic use or with power." },
    note: { ar: "ملونة · شهرية", en: "Coloured · Monthly" },
    price: 28_000, isBestSeller: true, supportsLensAddons: false,
    colors: [swatch.hazel, swatch.grey, swatch.honey, swatch.green, swatch.blue], stock: 25,
  },

  /* ── Kids ────────────────────────────────────────────────────────── */
  {
    slug: "ray-ban-junior-ry1531", code: "RY 1531", brand: "ray-ban", category: "kids", shape: "rectangle", gender: "kids",
    name: { ar: "راي بان جونيور RY1531", en: "Ray-Ban Junior RY1531" },
    description: { ar: "نسخة مصغرة للأطفال ٨-١٢ سنة، مفصلات مرنة تتحمل اللعب.", en: "Scaled-down for ages 8-12 with spring hinges that survive playtime." },
    price: 95_000, requiresPrescription: true,
    specs: { lensWidth: 48, bridge: 16, templeLength: 130, frameWidth: 125, lensHeight: 35, weightGrams: 19, material: "Acetate" },
    colors: [swatch.navy, swatch.black, swatch.pink],
  },
  {
    slug: "vc-kids-flex-tr90", code: "VC K-11", brand: "vision-classic", category: "kids", shape: "rectangle", gender: "kids",
    name: { ar: "ڤيجن كلاسيك أطفال TR90 مرن", en: "Vision Classic kids flexible TR90" },
    description: { ar: "مادة TR90 تنثني ١٨٠ درجة ولا تنكسر، مع حزام رأس قابل للفك للأطفال ٣-٧ سنوات.", en: "TR90 bends 180° without breaking; comes with a detachable head strap for ages 3-7." },
    note: { ar: "لا ينكسر", en: "Unbreakable" },
    price: 45_000, isBestSeller: true, requiresPrescription: true,
    specs: { lensWidth: 44, bridge: 15, templeLength: 125, frameWidth: 118, lensHeight: 33, weightGrams: 12, material: "TR90" },
    colors: [swatch.navy, swatch.red, swatch.pink, swatch.purple], stock: 30,
  },
  {
    slug: "vc-kids-sun", code: "VC K-SUN", brand: "vision-classic", category: "kids", shape: "round", gender: "kids",
    name: { ar: "ڤيجن كلاسيك شمسية أطفال", en: "Vision Classic kids sunglasses" },
    description: { ar: "عدسات UV400 – عيون الأطفال أكثر حساسية للأشعة فوق البنفسجية من البالغين.", en: "UV400 lenses – children's eyes let in more UV than adults'." },
    price: 22_000, supportsLensAddons: false,
    specs: { lensWidth: 45, bridge: 16, templeLength: 120, weightGrams: 14, material: "TR90" },
    colors: [swatch.blue, swatch.pink, swatch.green], stock: 45,
  },

  /* ── Accessories ─────────────────────────────────────────────────── */
  {
    slug: "zeiss-lens-wipes-30", code: "ZW-30", brand: "zeiss", category: "accessories",
    name: { ar: "مناديل زايس لتنظيف العدسات (٣٠)", en: "ZEISS lens wipes (30 pack)" },
    description: { ar: "مناديل مبللة مسبقاً، آمنة على كل الطبقات بما فيها المضادة للانعكاس.", en: "Pre-moistened wipes safe on all coatings, including anti-reflective." },
    price: 9_000, supportsLensAddons: false, colors: [swatch.blue], stock: 200,
  },
  {
    slug: "cleaning-kit-spray", code: "CK-01", brand: "zeiss", category: "accessories",
    name: { ar: "طقم تنظيف: بخاخ + قماش مايكروفايبر", en: "Cleaning kit: spray + microfibre cloth" },
    description: { ar: "بخاخ ٣٠ مل خالٍ من الكحول مع قماشة مايكروفايبر.", en: "30 ml alcohol-free spray with a microfibre cloth." },
    price: 12_000, isBestSeller: true, supportsLensAddons: false, colors: [swatch.black, swatch.blue], stock: 120,
  },
  {
    slug: "hard-case-classic", code: "HC-02", brand: "vision-classic", category: "accessories",
    name: { ar: "علبة نظارات صلبة", en: "Hard glasses case" },
    description: { ar: "علبة صلبة مبطنة بالمخمل تحمي الإطار في الحقيبة.", en: "Velvet-lined hard case that protects your frame in a bag." },
    price: 8_000, supportsLensAddons: false, colors: [swatch.black, swatch.brown, swatch.navy, swatch.red], stock: 150,
  },
  {
    slug: "renu-solution-360", code: "RENU-360", brand: "bausch-lomb", category: "accessories",
    name: { ar: "محلول رينيو للعدسات ٣٦٠ مل", en: "renu multi-purpose solution 360 ml" },
    description: { ar: "محلول متعدد الاستخدام لتنظيف وتعقيم وحفظ العدسات اللاصقة الشهرية ونصف الشهرية. يأتي مع علبة حفظ.", en: "Multi-purpose solution to clean, disinfect and store bi-weekly / monthly contacts. Case included." },
    price: 14_000, isBestSeller: true, supportsLensAddons: false, colors: [swatch.green], stock: 90,
  },
  {
    slug: "biotrue-solution-300", code: "BT-300", brand: "bausch-lomb", category: "accessories",
    name: { ar: "محلول بايوترو ٣٠٠ مل", en: "Biotrue multi-purpose solution 300 ml" },
    description: { ar: "محلول بدرجة حموضة مطابقة للدمع الطبيعي – مناسب للعيون الحساسة.", en: "Matches the pH of natural tears – for sensitive eyes." },
    price: 16_000, supportsLensAddons: false, colors: [swatch.blue], stock: 70,
  },
  {
    slug: "anti-fog-spray", code: "AF-01", brand: "vision-classic", category: "accessories",
    name: { ar: "بخاخ مضاد للضباب", en: "Anti-fog spray" },
    description: { ar: "يمنع تكوّن الضباب على العدسات مع الكمامة أو عند الخروج من السيارة المكيفة.", en: "Stops lenses fogging with a mask or when stepping out of an air-conditioned car." },
    price: 7_000, supportsLensAddons: false, colors: [swatch.crystal], stock: 80,
  },
];

/* ───────────────────────────── clinic ───────────────────────────── */

const doctorSeed = [
  { nameAr: "د. أحمد الصاعدي", nameEn: "Dr. Ahmed Al-Saedy", specialtyAr: "أخصائي بصريات – فحص النظر والوصفات", specialtyEn: "Optometrist – eye exams & prescriptions", workingDays: ["1", "2", "3", "4", "6", "7"] },
  { nameAr: "د. سارة الجبوري", nameEn: "Dr. Sara Al-Jubouri", specialtyAr: "طبيبة عيون – أمراض العين والأطفال", specialtyEn: "Ophthalmologist – eye disease & paediatrics", workingDays: ["1", "3", "6"] },
  { nameAr: "د. حسين الربيعي", nameEn: "Dr. Hussein Al-Rubaie", specialtyAr: "أخصائي عدسات لاصقة", specialtyEn: "Contact-lens specialist", workingDays: ["2", "4", "7"] },
].map((d) => ({ ...d, imageUrl: img(`doc-${d.nameEn.replace(/\W+/g, "-").toLowerCase()}`) }));

/* ───────────────────────────── content ───────────────────────────── */

const bannerSeed: (typeof banners.$inferInsert)[] = [
  { titleAr: "فحص نظر مجاني مع كل إطار", titleEn: "Free eye exam with every frame", subtitleAr: "احجز موعدك اليوم", subtitleEn: "Book your visit today", ctaAr: "احجز الآن", ctaEn: "Book now", link: "/book-exam", sortOrder: 1, imageUrl: img("banner-exam") },
  { titleAr: "خصم ٢٠٪ على راي بان", titleEn: "20% off Ray-Ban", subtitleAr: "تشكيلة الصيف الشمسية", subtitleEn: "Summer sunglasses collection", ctaAr: "تسوق", ctaEn: "Shop", link: "/categories?category=sun", sortOrder: 2, imageUrl: img("banner-sun"), startsAt: daysAgo(10), endsAt: daysAhead(30) },
  { titleAr: "عدسات لاصقة يومية من ٥٥ ألف", titleEn: "Daily contacts from 55,000 IQD", subtitleAr: "أكيوفيو · ديليز", subtitleEn: "Acuvue · Dailies", ctaAr: "اكتشف", ctaEn: "Explore", link: "/categories?category=contact", sortOrder: 3, imageUrl: img("banner-contacts") },
  { titleAr: "العودة للمدارس", titleEn: "Back to school", subtitleAr: "إطارات أطفال لا تنكسر", subtitleEn: "Unbreakable kids frames", ctaAr: "شاهد", ctaEn: "See more", link: "/categories?category=kids", sortOrder: 4, imageUrl: img("banner-kids"), isActive: false },
];

const promoSeed: (typeof promoCodes.$inferInsert)[] = [
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 50_000, maxDiscount: 20_000 },
  { code: "SUMMER20", type: "percent", value: 20, minSubtotal: 100_000, maxDiscount: 50_000, startsAt: daysAgo(10), endsAt: daysAhead(30), maxUses: 200, usedCount: 37 },
  { code: "FLAT15K", type: "fixed", value: 15_000, minSubtotal: 75_000, maxUses: 100, usedCount: 12 },
  { code: "EID2026", type: "percent", value: 15, minSubtotal: 0, maxDiscount: 30_000, startsAt: daysAgo(120), endsAt: daysAgo(90), usedCount: 88 }, // expired
  { code: "VIP50", type: "fixed", value: 50_000, minSubtotal: 200_000, maxUses: 5, usedCount: 5 }, // exhausted
  { code: "OLDCODE", type: "percent", value: 5, isActive: false },
];

/* ───────────────────────────── customers ───────────────────────────── */

type CustomerSeed = {
  key: string;
  name: string;
  email: string;
  phone: string;
  locale: "ar" | "en";
  addresses: (Omit<typeof addresses.$inferInsert, "userId">)[];
  prescriptions: (Omit<typeof prescriptions.$inferInsert, "userId">)[];
};

const customerSeed: CustomerSeed[] = [
  {
    key: "ali", name: "علي حسن الكعبي", email: `ali.hassan@${DEMO_EMAIL_DOMAIN}`, phone: "+9647701234567", locale: "ar",
    addresses: [
      { label: "المنزل", recipientName: "علي حسن", phone: "+9647701234567", city: "بغداد", area: "الكرادة", street: "شارع الكرادة داخل", building: "عمارة ٤٢، ط٣", notes: "قرب صيدلية الرافدين", isDefault: true },
      { label: "العمل", recipientName: "علي حسن", phone: "+9647701234567", city: "بغداد", area: "المنصور", street: "شارع ١٤ رمضان", building: "مجمع المنصور مول، مكتب ٢١٠" },
    ],
    prescriptions: [
      // Moderate myopia with mild astigmatism – the most common adult Rx
      { label: "فحص ٢٠٢٦", doctorName: "Dr. Ahmed Al-Saedy", source: "clinic", status: "verified", issuedOn: ymd(daysAgo(40)), expiresOn: ymd(daysAgo(40 - 365)), odSph: "-2.25", odCyl: "-0.50", odAxis: "180", osSph: "-2.00", osCyl: "-0.75", osAxis: "175", pd: "63" },
      // Older Rx that has passed its expiry date
      { label: "فحص قديم ٢٠٢٤", doctorName: "Dr. Ahmed Al-Saedy", source: "clinic", status: "expired", issuedOn: ymd(daysAgo(800)), expiresOn: ymd(daysAgo(435)), odSph: "-1.75", odCyl: "-0.50", odAxis: "180", osSph: "-1.50", osCyl: "-0.50", osAxis: "170", pd: "63" },
    ],
  },
  {
    key: "zainab", name: "زينب محمد العبيدي", email: `zainab.mohammed@${DEMO_EMAIL_DOMAIN}`, phone: "+9647812345678", locale: "ar",
    addresses: [{ label: "البيت", recipientName: "زينب محمد", phone: "+9647812345678", city: "بغداد", area: "زيونة", street: "شارع الربيعي", building: "دار ١٨", isDefault: true }],
    prescriptions: [
      // Hyperopia (+) with reading ADD – typical 45+ patient → progressive lenses
      { label: "د. سارة – نظارة قراءة", doctorName: "Dr. Sara Al-Jubouri", source: "clinic", status: "verified", issuedOn: ymd(daysAgo(20)), expiresOn: ymd(daysAgo(20 - 730)), odSph: "+1.50", odCyl: null, odAxis: null, osSph: "+1.75", osCyl: "-0.25", osAxis: "90", pd: "61", addPower: "+2.00" },
      // Contact lens Rx entered manually – awaiting admin verification
      { label: "عدسات لاصقة", source: "manual", status: "pending", odSph: "+1.50", osSph: "+1.75", pd: null },
    ],
  },
  {
    key: "omar", name: "Omar Kareem", email: `omar.kareem@${DEMO_EMAIL_DOMAIN}`, phone: "+9647912345678", locale: "en",
    addresses: [
      { label: "Home", recipientName: "Omar Kareem", phone: "+9647912345678", city: "Erbil", area: "Ankawa", street: "Ankawa Main St", building: "Villa 12", isDefault: true },
      { label: "Parents", recipientName: "Kareem Jasim", phone: "+9647501112233", city: "Basra", area: "Al-Ashar", street: "Al-Watan St", notes: "Call before delivery" },
    ],
    prescriptions: [
      // High myopia (-6.50) → thin (1.67/1.74) lenses recommended
      { label: "Uploaded paper Rx", doctorName: "Dr. Layla Ibrahim", source: "upload", status: "verified", issuedOn: ymd(daysAgo(90)), expiresOn: ymd(daysAgo(90 - 365)), odSph: "-6.50", odCyl: "-1.25", odAxis: "10", osSph: "-6.00", osCyl: "-1.00", osAxis: "170", pd: "66", imageUrl: img("rx-omar"), reviewNote: "Clear scan, values confirmed." },
    ],
  },
  {
    key: "noor", name: "نور عبدالله", email: `noor.abdullah@${DEMO_EMAIL_DOMAIN}`, phone: "+9647723456789", locale: "ar",
    addresses: [{ label: "المنزل", recipientName: "نور عبدالله", phone: "+9647723456789", city: "البصرة", area: "الجزائر", street: "شارع الجزائر", building: "بناية ٧", isDefault: true }],
    prescriptions: [
      // Rejected: blurry photo
      { label: "صورة الوصفة", source: "upload", status: "rejected", imageUrl: img("rx-noor"), reviewNote: "الصورة غير واضحة – يرجى إعادة الرفع أو إدخال القيم يدوياً" },
      // Pure astigmatism, no sphere power
      { label: "إدخال يدوي", source: "manual", status: "pending", odSph: "0.00", odCyl: "-1.50", odAxis: "90", osSph: "0.00", osCyl: "-1.25", osAxis: "85", pd: "60" },
    ],
  },
  {
    key: "mustafa", name: "مصطفى جاسم", email: `mustafa.jasim@${DEMO_EMAIL_DOMAIN}`, phone: "+9647834567890", locale: "ar",
    addresses: [{ label: "المنزل", recipientName: "مصطفى جاسم", phone: "+9647834567890", city: "بغداد", area: "الجادرية", street: "شارع الجامعة", building: "عمارة ٩", isDefault: true }],
    // New customer, no Rx yet – books an exam first
    prescriptions: [],
  },
];

/* ───────────────────────────── orders ───────────────────────────── */

type OrderLineSeed = { product: string; color: Swatch; qty?: number; addons?: string[]; variantLabel?: string };
type OrderSeed = {
  customer: string;
  daysAgo: number;
  status: OrderStatus;
  deliveryMethod?: "home" | "pickup";
  paymentMethod?: "cod" | "wallet" | "card";
  paymentStatus?: "unpaid" | "paid" | "refunded";
  addressIndex?: number;
  prescriptionIndex?: number | null;
  promoCode?: string;
  lines: OrderLineSeed[];
  customerNote?: string;
  adminNote?: string;
  courier?: { name: string; phone: string };
  eta?: L;
  cancelReason?: string;
  /** Timeline: [status, daysAgo, note?] – must start at "pending". */
  events: [OrderStatus, number, string?][];
};

const orderSeed: OrderSeed[] = [
  {
    // Full journey: prescription frame + coatings, delivered
    customer: "ali", daysAgo: 30, status: "delivered", paymentMethod: "cod", paymentStatus: "paid", prescriptionIndex: 0, promoCode: "WELCOME10",
    lines: [{ product: "ray-ban-rx5228", color: swatch.tortoise, addons: ["antiGlare", "blueLight"] }, { product: "hard-case-classic", color: swatch.black }],
    courier: { name: "كريم التوصيل", phone: "+9647700000001" }, eta: { ar: "١-٢ يوم عمل", en: "1-2 working days" },
    events: [["pending", 30], ["confirmed", 30, "Rx verified, sent to lab"], ["lab", 29], ["onTheWay", 26], ["delivered", 25]],
  },
  {
    // Contact lenses re-order, delivered fast (no lab step)
    customer: "ali", daysAgo: 12, status: "delivered", paymentMethod: "card", paymentStatus: "paid",
    lines: [{ product: "acuvue-oasys-2-week", color: swatch.clear, qty: 2, variantLabel: "OD -2.25 / OS -2.00" }, { product: "renu-solution-360", color: swatch.green }],
    courier: { name: "حيدر", phone: "+9647700000002" },
    events: [["pending", 12], ["confirmed", 12], ["onTheWay", 11], ["delivered", 10]],
  },
  {
    // Progressive lenses – currently in the lab
    customer: "zainab", daysAgo: 3, status: "lab", paymentMethod: "cod", prescriptionIndex: 0,
    lines: [{ product: "gucci-gg0027o", color: swatch.havana, addons: ["progressive", "antiGlare", "photochromic"] }],
    adminNote: "Progressive – needs 3 working days. Corridor 14mm.", eta: { ar: "٣ أيام عمل", en: "3 working days" },
    events: [["pending", 3], ["confirmed", 3, "Rx verified"], ["lab", 2, "Lenses ordered from supplier"]],
  },
  {
    // High-myopia customer picks ultra-thin lenses, pickup in store, ready now
    customer: "omar", daysAgo: 6, status: "ready", deliveryMethod: "pickup", paymentMethod: "cod", prescriptionIndex: 0, promoCode: "FLAT15K",
    lines: [{ product: "oakley-ox8046-airdrop", color: swatch.matteBlack, addons: ["ultraThin", "antiGlare", "hardCoat"] }],
    customerNote: "Please call me when ready, I'll pick up after 5pm.",
    events: [["pending", 6], ["confirmed", 6], ["lab", 5], ["ready", 1, "Ready for pickup at Karrada branch"]],
  },
  {
    // Sunglasses, on the way
    customer: "omar", daysAgo: 2, status: "onTheWay", paymentMethod: "wallet", paymentStatus: "paid", addressIndex: 1, promoCode: "SUMMER20",
    lines: [{ product: "oakley-oo9102-holbrook", color: swatch.matteBlack }, { product: "cleaning-kit-spray", color: swatch.black }],
    courier: { name: "Basra Express", phone: "+9647700000003" }, eta: { ar: "اليوم قبل ٩ مساءً", en: "Today before 9 pm" },
    events: [["pending", 2], ["confirmed", 2], ["onTheWay", 0]],
  },
  {
    // Cancelled by customer before confirmation
    customer: "noor", daysAgo: 15, status: "cancelled", paymentMethod: "cod",
    lines: [{ product: "freshlook-colorblends", color: swatch.grey, qty: 2, variantLabel: "OD 0.00 / OS 0.00" }],
    cancelReason: "غيرت رأيي – أريد لون آخر",
    events: [["pending", 15], ["cancelled", 14, "Cancelled by customer"]],
  },
  {
    // Fresh order still pending – no Rx yet on it (kids frame ordered for exam-first flow)
    customer: "noor", daysAgo: 0, status: "pending", paymentMethod: "cod",
    lines: [{ product: "vc-kids-flex-tr90", color: swatch.pink, addons: ["hardCoat"] }, { product: "vc-kids-sun", color: swatch.pink }],
    customerNote: "الوصفة سأرفعها بعد الفحص يوم الخميس",
    events: [["pending", 0]],
  },
  {
    // Reading glasses – no Rx required, confirmed, waiting for courier
    customer: "zainab", daysAgo: 1, status: "confirmed", paymentMethod: "cod",
    lines: [{ product: "reading-glasses-plus", color: swatch.tortoise, qty: 2, variantLabel: "+2.00" }, { product: "zeiss-lens-wipes-30", color: swatch.blue }],
    events: [["pending", 1], ["confirmed", 0]],
  },
];

/* ───────────────────────────── reviews ───────────────────────────── */

const reviewSeed: { customer: string; product: string; rating: number; comment: string; daysAgo: number; isVisible?: boolean }[] = [
  { customer: "ali", product: "ray-ban-rx5228", rating: 5, comment: "الإطار خفيف والطبقة المضادة للانعكاس فرق واضح بالليل أثناء القيادة", daysAgo: 22 },
  { customer: "ali", product: "acuvue-oasys-2-week", rating: 5, comment: "مريحة جداً حتى مع المكيف طول اليوم", daysAgo: 8 },
  { customer: "ali", product: "hard-case-classic", rating: 4, comment: "جيدة لكن كبيرة قليلاً للإطارات الصغيرة", daysAgo: 22 },
  { customer: "zainab", product: "vc-214", rating: 4, comment: "سعر ممتاز مقابل الجودة، الألوان أجمل على الطبيعة", daysAgo: 60 },
  { customer: "zainab", product: "reading-glasses-plus", rating: 3, comment: "تفي بالغرض للقراءة لكن المفصلات ضعيفة", daysAgo: 45 },
  { customer: "omar", product: "oakley-oo9102-holbrook", rating: 5, comment: "Prizm lenses are unreal on the road, glare completely gone.", daysAgo: 50 },
  { customer: "omar", product: "ray-ban-rb3025-aviator", rating: 4, comment: "Classic. Slightly heavy after a full day.", daysAgo: 70 },
  { customer: "omar", product: "acuvue-1-day-moist", rating: 5, comment: "Best dailies I've tried, zero dryness.", daysAgo: 33 },
  { customer: "noor", product: "freshlook-colorblends", rating: 4, comment: "اللون الرمادي طبيعي جداً", daysAgo: 28 },
  { customer: "noor", product: "vc-square-polarized", rating: 5, comment: "بهذا السعر؟ مستقطبة فعلاً، جربتها على الماء", daysAgo: 19 },
  { customer: "mustafa", product: "ray-ban-rb2140-wayfarer", rating: 5, comment: "أصلية ومعها الشهادة والعلبة", daysAgo: 14 },
  { customer: "mustafa", product: "cleaning-kit-spray", rating: 4, comment: "البخاخ ممتاز، القماشة عادية", daysAgo: 14 },
  { customer: "mustafa", product: "biofinity-monthly", rating: 2, comment: "تجف بسرعة بعد الأسبوع الثالث", daysAgo: 9 },
  { customer: "mustafa", product: "vc-kids-flex-tr90", rating: 1, comment: "spam spam buy cheap glasses at ...", daysAgo: 5, isVisible: false }, // hidden by admin
  { customer: "zainab", product: "ray-ban-rb3016-clubmaster", rating: 5, comment: "هدية لزوجي وعجبته كثير", daysAgo: 4 },
];

/* ───────────────────────────── main ───────────────────────────── */

async function main() {
  logger.info("Seeding demo dataset…");

  /* categories / brands / add-ons ------------------------------------ */
  const categoryIds = new Map<string, string>();
  for (const c of categorySeed) {
    const { slug, ...set } = c;
    const [row] = await db.insert(categories).values(c).onConflictDoUpdate({ target: categories.slug, set }).returning({ id: categories.id });
    categoryIds.set(slug, row!.id);
  }

  const brandIds = new Map<string, string>();
  for (const b of brandSeed) {
    const { slug, ...set } = b;
    const [row] = await db.insert(brands).values(b).onConflictDoUpdate({ target: brands.slug, set }).returning({ id: brands.id });
    brandIds.set(slug, row!.id);
  }

  const addonById = new Map<string, typeof lensAddons.$inferInsert>();
  for (const a of addonSeed) {
    const { id: _id, ...set } = a;
    await db.insert(lensAddons).values(a).onConflictDoUpdate({ target: lensAddons.id, set });
    addonById.set(a.id, a);
  }

  /* products + variants + images ------------------------------------- */
  const productIds = new Map<string, string>();
  const variantIds = new Map<string, string>(); // `${slug}|${hex}`
  const productPrice = new Map<string, number>();
  for (const p of productSeed) {
    const values: typeof products.$inferInsert = {
      slug: p.slug,
      code: p.code ?? null,
      nameAr: p.name.ar,
      nameEn: p.name.en,
      descriptionAr: p.description.ar,
      descriptionEn: p.description.en,
      noteAr: p.note?.ar ?? null,
      noteEn: p.note?.en ?? null,
      categoryId: categoryIds.get(p.category)!,
      brandId: p.brand ? brandIds.get(p.brand)! : null,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      shape: p.shape ?? null,
      gender: p.gender ?? "unisex",
      specs: p.specs ?? null,
      supportsLensAddons: p.supportsLensAddons ?? true,
      requiresPrescription: p.requiresPrescription ?? false,
      isBestSeller: p.isBestSeller ?? false,
    };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: products.id });
    const productId = row!.id;
    productIds.set(p.slug, productId);
    productPrice.set(p.slug, p.price);

    for (const [i, c] of p.colors.entries()) {
      const sku = `${(p.code ?? p.slug).replace(/\s+/g, "").toUpperCase()}-${c.en.replace(/\W+/g, "").toUpperCase()}`;
      const [v] = await db
        .insert(productVariants)
        .values({ productId, sku, colorHex: c.hex, colorNameAr: c.ar, colorNameEn: c.en, stock: p.stock ?? 12 + i * 3, sortOrder: i })
        .onConflictDoUpdate({ target: [productVariants.productId, productVariants.colorHex], set: { sku, colorNameAr: c.ar, colorNameEn: c.en, sortOrder: i } })
        .returning({ id: productVariants.id });
      variantIds.set(`${p.slug}|${c.hex}`, v!.id);
    }

    // Images: one generic gallery + one per colour. Rebuilt every run.
    await db.delete(productImages).where(eq(productImages.productId, productId));
    const imageRows: (typeof productImages.$inferInsert)[] = [
      { productId, url: img(p.slug, 1), alt: p.name.en, sortOrder: 0 },
      { productId, url: img(p.slug, 2), alt: `${p.name.en} – side`, sortOrder: 1 },
      ...p.colors.map((c, i) => ({ productId, variantId: variantIds.get(`${p.slug}|${c.hex}`)!, url: img(`${p.slug}-${c.en}`), alt: `${p.name.en} – ${c.en}`, sortOrder: 10 + i })),
    ];
    await db.insert(productImages).values(imageRows);
  }

  /* doctors / banners / promos --------------------------------------- */
  const doctorIds = new Map<string, string>();
  for (const d of doctorSeed) {
    const existing = await db.query.doctors.findFirst({ where: eq(doctors.nameEn, d.nameEn) });
    const [row] = existing
      ? await db.update(doctors).set(d).where(eq(doctors.id, existing.id)).returning({ id: doctors.id })
      : await db.insert(doctors).values(d).returning({ id: doctors.id });
    doctorIds.set(d.nameEn, row!.id);
  }

  for (const b of bannerSeed) {
    const existing = await db.query.banners.findFirst({ where: eq(banners.titleEn, b.titleEn) });
    if (existing) await db.update(banners).set(b).where(eq(banners.id, existing.id));
    else await db.insert(banners).values(b);
  }

  for (const p of promoSeed) {
    const { code: _code, ...set } = p;
    await db.insert(promoCodes).values(p).onConflictDoUpdate({ target: promoCodes.code, set });
  }

  /* demo customers (wipe + recreate) --------------------------------- */
  const demoEmails = customerSeed.map((c) => c.email);
  const stale = await db.select({ id: user.id }).from(user).where(inArray(user.email, demoEmails));
  if (stale.length) {
    const staleIds = stale.map((u) => u.id);
    // orders.user_id is ON DELETE RESTRICT, everything else cascades.
    await db.delete(orders).where(inArray(orders.userId, staleIds));
    await db.delete(user).where(inArray(user.id, staleIds));
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userIds = new Map<string, string>();
  const addressRows = new Map<string, (typeof addresses.$inferSelect)[]>();
  const rxRows = new Map<string, (typeof prescriptions.$inferSelect)[]>();

  for (const c of customerSeed) {
    const [u] = await db
      .insert(user)
      .values({ name: c.name, email: c.email, emailVerified: true, phone: c.phone, locale: c.locale, role: "user", image: img(`avatar-${c.key}`, 1), createdAt: daysAgo(120) })
      .returning({ id: user.id });
    const userId = u!.id;
    userIds.set(c.key, userId);

    // Better Auth "credential" account – what signUpEmail would have created.
    await db.insert(account).values({ userId, accountId: userId, providerId: "credential", password: passwordHash });

    addressRows.set(c.key, c.addresses.length ? await db.insert(addresses).values(c.addresses.map((a) => ({ ...a, userId }))).returning() : []);
    rxRows.set(c.key, c.prescriptions.length ? await db.insert(prescriptions).values(c.prescriptions.map((r) => ({ ...r, userId }))).returning() : []);

    await db.insert(deviceTokens).values({ userId, platform: c.key === "omar" ? "ios" : "android", token: `ExponentPushToken[demo-${c.key}-${userId.slice(0, 8)}]` });
  }

  /* orders ----------------------------------------------------------- */
  const soldCount = new Map<string, number>();
  for (const o of orderSeed) {
    const userId = userIds.get(o.customer)!;
    const method = o.deliveryMethod ?? "home";
    const addr = method === "home" ? addressRows.get(o.customer)![o.addressIndex ?? 0] : undefined;
    const rx = o.prescriptionIndex != null ? rxRows.get(o.customer)![o.prescriptionIndex] : undefined;

    const items: (Omit<typeof orderItems.$inferInsert, "orderId">)[] = o.lines.map((l) => {
      const p = productSeed.find((x) => x.slug === l.product)!;
      const addonsSnap: OrderItemAddon[] = (l.addons ?? []).map((id) => {
        const a = addonById.get(id)!;
        return { id, nameAr: a.nameAr, nameEn: a.nameEn, price: a.price };
      });
      const unitPrice = p.price + addonsSnap.reduce((s, a) => s + a.price, 0);
      const quantity = l.qty ?? 1;
      return {
        productId: productIds.get(l.product)!,
        variantId: variantIds.get(`${l.product}|${l.color.hex}`)!,
        nameAr: p.name.ar,
        nameEn: p.name.en,
        code: p.code ?? null,
        colorHex: l.color.hex,
        imageUrl: img(`${l.product}-${l.color.en}`),
        variantLabel: l.variantLabel ?? null,
        addons: addonsSnap,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const promo = o.promoCode ? promoSeed.find((p) => p.code === o.promoCode) : undefined;
    let discount = 0;
    if (promo) {
      discount = promo.type === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    }
    const deliveryFee = method === "pickup" ? 0 : subtotal - discount >= env.FREE_DELIVERY_THRESHOLD ? 0 : env.DELIVERY_FEE;
    const total = subtotal - discount + deliveryFee;

    const addressSnap: AddressSnapshot | null = addr
      ? { recipientName: addr.recipientName, phone: addr.phone, city: addr.city, area: addr.area, street: addr.street, building: addr.building, notes: addr.notes }
      : null;
    const rxSnap: PrescriptionSnapshot | null = rx
      ? { id: rx.id, od: { sph: rx.odSph, cyl: rx.odCyl, axis: rx.odAxis }, os: { sph: rx.osSph, cyl: rx.osCyl, axis: rx.osAxis }, pd: rx.pd, add: rx.addPower }
      : null;

    const createdAt = daysAgo(o.daysAgo, 10);
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        status: o.status,
        deliveryMethod: method,
        paymentMethod: o.paymentMethod ?? "cod",
        paymentStatus: o.paymentStatus ?? "unpaid",
        address: addressSnap,
        prescription: rxSnap,
        subtotal,
        discount,
        deliveryFee,
        total,
        promoCode: o.promoCode ?? null,
        customerNote: o.customerNote ?? null,
        adminNote: o.adminNote ?? null,
        courierName: o.courier?.name ?? null,
        courierPhone: o.courier?.phone ?? null,
        etaAr: o.eta?.ar ?? null,
        etaEn: o.eta?.en ?? null,
        cancelReason: o.cancelReason ?? null,
        deliveredAt: o.status === "delivered" ? daysAgo(o.events.at(-1)![1], 17) : null,
        cancelledAt: o.status === "cancelled" ? daysAgo(o.events.at(-1)![1], 15) : null,
        createdAt,
        updatedAt: daysAgo(o.events.at(-1)![1], 17),
      })
      .returning({ id: orders.id, number: orders.number });

    await db.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order!.id })));
    await db.insert(orderEvents).values(
      o.events.map(([status, d, note], i) => ({ orderId: order!.id, status, note: note ?? null, createdAt: daysAgo(d, 10 + i) })),
    );

    if (o.status !== "cancelled") for (const l of o.lines) soldCount.set(l.product, (soldCount.get(l.product) ?? 0) + (l.qty ?? 1));

    // Notifications the customer would have received for this order
    const link = `/orders/${order!.number}`;
    const notes: (typeof notifications.$inferInsert)[] = [];
    if (o.events.some((e) => e[0] === "confirmed")) notes.push({ userId, titleAr: `تم تأكيد طلبك #${order!.number}`, titleEn: `Order #${order!.number} confirmed`, bodyAr: "بدأنا بتجهيز طلبك", bodyEn: "We've started preparing your order", link, readAt: daysAgo(1) });
    if (o.status === "onTheWay") notes.push({ userId, titleAr: `طلبك #${order!.number} في الطريق`, titleEn: `Order #${order!.number} is on the way`, bodyAr: `المندوب ${o.courier?.name ?? ""} سيصلك قريباً`, bodyEn: `Courier ${o.courier?.name ?? ""} will reach you soon`, link });
    if (o.status === "ready") notes.push({ userId, titleAr: `طلبك #${order!.number} جاهز للاستلام`, titleEn: `Order #${order!.number} is ready for pickup`, bodyAr: "بانتظارك في فرع الكرادة", bodyEn: "Waiting for you at the Karrada branch", link });
    if (o.status === "delivered") notes.push({ userId, titleAr: `تم توصيل طلبك #${order!.number}`, titleEn: `Order #${order!.number} delivered`, bodyAr: "نتمنى أن تعجبك! قيّم المنتج", bodyEn: "Enjoy! Leave a review", link, readAt: daysAgo(o.events.at(-1)![1] - 1) });
    if (notes.length) await db.insert(notifications).values(notes);
  }

  /* carts (live, not yet checked out) -------------------------------- */
  const [aliCart] = await db.insert(carts).values({ userId: userIds.get("ali")!, prescriptionId: rxRows.get("ali")![0]!.id, promoCode: "SUMMER20" }).returning({ id: carts.id });
  await db.insert(cartItems).values([
    { cartId: aliCart!.id, productId: productIds.get("ray-ban-rb3025-aviator")!, variantId: variantIds.get(`ray-ban-rb3025-aviator|${swatch.gold.hex}`)!, quantity: 1, addonIds: ["polarized"] },
    { cartId: aliCart!.id, productId: productIds.get("vc-titanium-half-rim")!, variantId: variantIds.get(`vc-titanium-half-rim|${swatch.gunmetal.hex}`)!, quantity: 1, addonIds: ["antiGlare", "blueLight", "thin"].sort() },
  ]);
  const [mustafaCart] = await db.insert(carts).values({ userId: userIds.get("mustafa")! }).returning({ id: carts.id });
  await db.insert(cartItems).values([
    { cartId: mustafaCart!.id, productId: productIds.get("dailies-total1")!, variantId: variantIds.get(`dailies-total1|${swatch.clear.hex}`)!, quantity: 2, variantLabel: "OD -1.00 / OS -1.25" },
  ]);

  /* wishlist --------------------------------------------------------- */
  await db.insert(wishlistItems).values([
    { userId: userIds.get("ali")!, productId: productIds.get("persol-po3007v")! },
    { userId: userIds.get("ali")!, productId: productIds.get("oakley-oo9013-frogskins")! },
    { userId: userIds.get("zainab")!, productId: productIds.get("gucci-gg0061s")! },
    { userId: userIds.get("zainab")!, productId: productIds.get("biofinity-multifocal")! },
    { userId: userIds.get("omar")!, productId: productIds.get("persol-po0714")! },
    { userId: userIds.get("noor")!, productId: productIds.get("ray-ban-rb3447-round")! },
    { userId: userIds.get("mustafa")!, productId: productIds.get("ray-ban-rx7047")! },
  ]);

  /* reviews + denormalised rating / sold counters --------------------- */
  await db.insert(reviews).values(
    reviewSeed.map((r) => ({ userId: userIds.get(r.customer)!, productId: productIds.get(r.product)!, rating: r.rating, comment: r.comment, isVisible: r.isVisible ?? true, createdAt: daysAgo(r.daysAgo) })),
  );
  for (const slug of productIds.keys()) {
    const visible = reviewSeed.filter((r) => r.product === slug && r.isVisible !== false);
    const ratingCount = visible.length;
    const ratingAvg = ratingCount ? Math.round((visible.reduce((s, r) => s + r.rating, 0) / ratingCount) * 100) : 0;
    // Give best-sellers a plausible history beyond the demo orders.
    const p = productSeed.find((x) => x.slug === slug)!;
    const sold = (soldCount.get(slug) ?? 0) + (p.isBestSeller ? 40 : 0) + ratingCount * 3;
    await db.update(products).set({ ratingAvg, ratingCount, soldCount: sold }).where(eq(products.id, productIds.get(slug)!));
  }

  /* appointments ----------------------------------------------------- */
  // Slots are on the clinic grid (10:00-20:00 Baghdad, every 30 min) and on a
  // day the doctor works, so the booking module treats them as valid.
  const slot = (daysFromNow: number, hour: number, minute: number, doctorEn: string) => {
    const d = daysAgo(-daysFromNow);
    // walk forward to a working day of that doctor (ISO 1=Mon … 7=Sun)
    const days = doctorSeed.find((x) => x.nameEn === doctorEn)!.workingDays;
    for (let i = 0; i < 7; i++) {
      const iso = String(((d.getUTCDay() + 6) % 7) + 1);
      if (days.includes(iso)) break;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return zonedTimeToUtc(ymd(d), hour, minute, env.CLINIC_TIMEZONE);
  };
  const ahmed = "Dr. Ahmed Al-Saedy";
  const sara = "Dr. Sara Al-Jubouri";
  const hussein = "Dr. Hussein Al-Rubaie";
  await db.insert(appointments).values([
    { userId: userIds.get("ali")!, doctorId: doctorIds.get(ahmed)!, scheduledAt: slot(-40, 11, 0, ahmed), reason: "exam", status: "completed", notes: "Annual check – Rx updated" },
    { userId: userIds.get("zainab")!, doctorId: doctorIds.get(sara)!, scheduledAt: slot(-20, 16, 30, sara), reason: "rx", status: "completed" },
    { userId: userIds.get("noor")!, doctorId: doctorIds.get(ahmed)!, scheduledAt: slot(-8, 12, 0, ahmed), reason: "exam", status: "noShow" },
    { userId: userIds.get("omar")!, doctorId: doctorIds.get(hussein)!, scheduledAt: slot(-3, 18, 0, hussein), reason: "contacts", status: "cancelled", notes: "Travelling" },
    { userId: userIds.get("mustafa")!, doctorId: doctorIds.get(ahmed)!, scheduledAt: slot(2, 10, 30, ahmed), reason: "exam", status: "confirmed", remindMe: true, notes: "First visit – headaches when reading" },
    { userId: userIds.get("noor")!, doctorId: doctorIds.get(sara)!, scheduledAt: slot(4, 15, 0, sara), reason: "exam", status: "booked", notes: "For daughter (6 years)" },
    { userId: userIds.get("zainab")!, doctorId: doctorIds.get(hussein)!, scheduledAt: slot(6, 17, 30, hussein), reason: "contacts", status: "booked", notes: "Wants to try multifocal contacts" },
  ]);

  await db.insert(notifications).values([
    { userId: userIds.get("mustafa")!, titleAr: "تذكير بموعدك", titleEn: "Appointment reminder", bodyAr: "موعدك مع د. أحمد الصاعدي بعد يومين الساعة ١٠:٣٠", bodyEn: "Your visit with Dr. Ahmed Al-Saedy is in 2 days at 10:30", link: "/appointments" },
    { userId: userIds.get("noor")!, titleAr: "تم رفض الوصفة", titleEn: "Prescription rejected", bodyAr: "الصورة غير واضحة – يرجى إعادة الرفع", bodyEn: "The photo is unreadable – please upload again", link: "/prescriptions" },
    { userId: userIds.get("ali")!, titleAr: "خصم ٢٠٪ على راي بان", titleEn: "20% off Ray-Ban", bodyAr: "استخدم الكود SUMMER20", bodyEn: "Use code SUMMER20", link: "/categories?category=sun", readAt: daysAgo(5) },
  ]);

  logger.info(
    {
      categories: categorySeed.length,
      brands: brandSeed.length,
      addons: addonSeed.length,
      products: productSeed.length,
      doctors: doctorSeed.length,
      customers: customerSeed.length,
      orders: orderSeed.length,
      reviews: reviewSeed.length,
      login: { emails: demoEmails, password: DEMO_PASSWORD },
    },
    "Demo seed complete",
  );
}

try {
  await main();
} catch (err) {
  logger.fatal({ err }, "Demo seed failed");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
