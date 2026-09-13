import { createLogger } from "../../config/logger.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { localized, toColumns } from "../../lib/i18n.js";
import { lensAddonsRepository, type LensAddonRow } from "./lens-addons.repository.js";
import type { CreateLensAddonInput, LensAddonDto, UpdateLensAddonInput } from "./lens-addons.schema.js";

const log = createLogger("lens-addons");

export const toLensAddonDto = (row: LensAddonRow): LensAddonDto => ({
  id: row.id,
  name: localized(row, "name")!,
  description: localized(row, "description"),
  price: row.price,
  sortOrder: row.sortOrder,
  isActive: row.isActive,
});

export const lensAddonsService = {
  async list(includeInactive = false) {
    return (await lensAddonsRepository.list({ includeInactive })).map(toLensAddonDto);
  },

  /**
   * Resolves a list of addon ids to active rows, throwing if any is unknown or
   * inactive. Used by the cart / order services when pricing a line.
   */
  async resolveActive(ids: string[]): Promise<LensAddonRow[]> {
    const unique = [...new Set(ids)].sort();
    const rows = await lensAddonsRepository.findManyActive(unique);
    const active = rows.filter((r) => r.isActive);
    if (active.length !== unique.length) {
      const found = new Set(active.map((r) => r.id));
      const missing = unique.filter((id) => !found.has(id));
      throw new BadRequestError(`Unknown or inactive lens add-on(s): ${missing.join(", ")}`);
    }
    return active.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async create(input: CreateLensAddonInput) {
    if (await lensAddonsRepository.findById(input.id)) throw new ConflictError(`Add-on '${input.id}' already exists`);
    const row = await lensAddonsRepository.create({
      id: input.id,
      nameAr: input.name.ar,
      nameEn: input.name.en,
      ...toColumns("description", input.description),
      price: input.price,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    log.info({ id: row.id }, "Lens add-on created");
    return toLensAddonDto(row);
  },

  async update(id: string, input: UpdateLensAddonInput) {
    const row = await lensAddonsRepository.update(id, {
      ...(input.name ? { nameAr: input.name.ar, nameEn: input.name.en } : {}),
      ...toColumns("description", input.description),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (!row) throw new NotFoundError("Lens add-on", id);
    return toLensAddonDto(row);
  },

  async delete(id: string) {
    if (!(await lensAddonsRepository.delete(id))) throw new NotFoundError("Lens add-on", id);
    log.info({ id }, "Lens add-on deleted");
  },
};
