import { createLogger } from "../../config/logger.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { localized, toColumns } from "../../lib/i18n.js";
import { categoriesRepository, type CategoryRow } from "./categories.repository.js";
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from "./categories.schema.js";

const log = createLogger("categories");

export function toCategoryDto(row: CategoryRow & { productCount?: number }): CategoryDto {
  return {
    id: row.id,
    slug: row.slug,
    name: localized(row, "name")!,
    description: localized(row, "description"),
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    ...(row.productCount !== undefined ? { productCount: row.productCount } : {}),
  };
}

export const categoriesService = {
  async list(includeInactive = false) {
    const rows = await categoriesRepository.list({ includeInactive });
    return rows.map(toCategoryDto);
  },

  async getById(id: string) {
    const row = await categoriesRepository.findById(id);
    if (!row) throw new NotFoundError("Category", id);
    return toCategoryDto(row);
  },

  async create(input: CreateCategoryInput) {
    if (await categoriesRepository.findBySlug(input.slug)) {
      throw new ConflictError(`Category slug '${input.slug}' is already used`);
    }
    const row = await categoriesRepository.create({
      slug: input.slug,
      nameAr: input.name.ar,
      nameEn: input.name.en,
      ...toColumns("description", input.description),
      imageUrl: input.imageUrl ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    log.info({ id: row.id, slug: row.slug }, "Category created");
    return toCategoryDto(row);
  },

  async update(id: string, input: UpdateCategoryInput) {
    if (input.slug) {
      const existing = await categoriesRepository.findBySlug(input.slug);
      if (existing && existing.id !== id) throw new ConflictError(`Category slug '${input.slug}' is already used`);
    }
    const row = await categoriesRepository.update(id, {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name ? { nameAr: input.name.ar, nameEn: input.name.en } : {}),
      ...toColumns("description", input.description),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (!row) throw new NotFoundError("Category", id);
    log.info({ id }, "Category updated");
    return toCategoryDto(row);
  },

  async delete(id: string) {
    const inUse = await categoriesRepository.countProducts(id);
    if (inUse > 0) {
      throw new ConflictError(`Category has ${inUse} product(s). Move or delete them first, or deactivate the category.`);
    }
    const deleted = await categoriesRepository.delete(id);
    if (!deleted) throw new NotFoundError("Category", id);
    log.info({ id }, "Category deleted");
  },
};
