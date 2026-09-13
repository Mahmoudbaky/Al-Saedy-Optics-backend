import { createLogger } from "../../config/logger.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { localized } from "../../lib/i18n.js";
import { brandsRepository, type BrandRow } from "./brands.repository.js";
import type { BrandDto, CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";

const log = createLogger("brands");

export const toBrandDto = (row: BrandRow): BrandDto => ({
  id: row.id,
  slug: row.slug,
  name: localized(row, "name")!,
  logoUrl: row.logoUrl,
  isActive: row.isActive,
});

export const brandsService = {
  async list(includeInactive = false) {
    return (await brandsRepository.list({ includeInactive })).map(toBrandDto);
  },
  async create(input: CreateBrandInput) {
    if (await brandsRepository.findBySlug(input.slug)) throw new ConflictError(`Brand slug '${input.slug}' is already used`);
    const row = await brandsRepository.create({
      slug: input.slug,
      nameAr: input.name.ar,
      nameEn: input.name.en,
      logoUrl: input.logoUrl ?? null,
      isActive: input.isActive,
    });
    log.info({ id: row.id }, "Brand created");
    return toBrandDto(row);
  },
  async update(id: string, input: UpdateBrandInput) {
    if (input.slug) {
      const existing = await brandsRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) throw new ConflictError(`Brand slug '${input.slug}' is already used`);
    }
    const row = await brandsRepository.update(id, {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name ? { nameAr: input.name.ar, nameEn: input.name.en } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (!row) throw new NotFoundError("Brand", id);
    return toBrandDto(row);
  },
  async delete(id: string) {
    const inUse = await brandsRepository.countProducts(id);
    if (inUse > 0) throw new ConflictError(`Brand is used by ${inUse} product(s)`);
    if (!(await brandsRepository.delete(id))) throw new NotFoundError("Brand", id);
    log.info({ id }, "Brand deleted");
  },
};
