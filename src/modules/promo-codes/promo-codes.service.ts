import { createLogger } from "../../config/logger.js";
import type { DbExecutor } from "../../db/index.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { pageMeta, type PaginationQuery } from "../../lib/pagination.js";
import { promoCodesRepository, type PromoCodeRow } from "./promo-codes.repository.js";
import type { CreatePromoCodeInput, PromoCodeDto, UpdatePromoCodeInput } from "./promo-codes.schema.js";

const log = createLogger("promo-codes");

export const toPromoCodeDto = (r: PromoCodeRow): PromoCodeDto => ({
  id: r.id,
  code: r.code,
  type: r.type,
  value: r.value,
  minSubtotal: r.minSubtotal,
  maxDiscount: r.maxDiscount,
  startsAt: r.startsAt?.toISOString() ?? null,
  endsAt: r.endsAt?.toISOString() ?? null,
  maxUses: r.maxUses,
  usedCount: r.usedCount,
  isActive: r.isActive,
  createdAt: r.createdAt.toISOString(),
});

export interface PromoEvaluation {
  code: string;
  discount: number;
}

export const promoCodesService = {
  /**
   * Validates a code against a subtotal and returns the discount in IQD.
   * Throws a 400 with a customer-friendly reason when it can't be applied.
   */
  async evaluate(code: string, subtotal: number, ex?: DbExecutor): Promise<PromoEvaluation> {
    const row = await promoCodesRepository.findByCode(code.trim().toUpperCase(), ex);
    const now = new Date();
    if (!row || !row.isActive) throw new BadRequestError("Promo code is not valid");
    if (row.startsAt && row.startsAt > now) throw new BadRequestError("Promo code is not active yet");
    if (row.endsAt && row.endsAt < now) throw new BadRequestError("Promo code has expired");
    if (row.maxUses !== null && row.usedCount >= row.maxUses) throw new BadRequestError("Promo code has reached its usage limit");
    if (subtotal < row.minSubtotal) throw new BadRequestError(`Promo code requires a minimum order of ${row.minSubtotal} IQD`);

    let discount = row.type === "percent" ? Math.round((subtotal * row.value) / 100) : row.value;
    if (row.maxDiscount !== null) discount = Math.min(discount, row.maxDiscount);
    discount = Math.min(discount, subtotal);
    return { code: row.code, discount };
  },

  /** Same as evaluate but never throws – used when rendering the cart. */
  async tryEvaluate(code: string | null, subtotal: number): Promise<PromoEvaluation & { error?: string }> {
    if (!code) return { code: "", discount: 0 };
    try {
      return await this.evaluate(code, subtotal);
    } catch (err) {
      return { code, discount: 0, error: err instanceof Error ? err.message : "Invalid promo code" };
    }
  },

  async list(query: PaginationQuery & { active?: boolean }) {
    const { rows, total } = await promoCodesRepository.list(query, query.active);
    return { items: rows.map(toPromoCodeDto), meta: pageMeta(total, query) };
  },

  async create(input: CreatePromoCodeInput) {
    if (await promoCodesRepository.findByCode(input.code)) throw new ConflictError(`Promo code ${input.code} already exists`);
    const row = await promoCodesRepository.create({
      code: input.code,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      maxDiscount: input.maxDiscount ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      maxUses: input.maxUses ?? null,
      isActive: input.isActive,
    });
    log.info({ code: row.code }, "Promo code created");
    return toPromoCodeDto(row);
  },

  async update(id: string, input: UpdatePromoCodeInput) {
    const row = await promoCodesRepository.update(id, {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.minSubtotal !== undefined ? { minSubtotal: input.minSubtotal } : {}),
      ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (!row) throw new NotFoundError("Promo code", id);
    return toPromoCodeDto(row);
  },

  async delete(id: string) {
    if (!(await promoCodesRepository.delete(id))) throw new NotFoundError("Promo code", id);
    log.info({ id }, "Promo code deleted");
  },
};
