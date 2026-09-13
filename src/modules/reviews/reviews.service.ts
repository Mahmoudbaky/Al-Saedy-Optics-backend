import { eq } from "drizzle-orm";
import { createLogger } from "../../config/logger.js";
import { reviews } from "../../db/schema/index.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { pageMeta } from "../../lib/pagination.js";
import { productsRepository } from "../products/products.repository.js";
import { reviewsRepository } from "./reviews.repository.js";
import type { AdminListReviewsQuery, ListReviewsQuery, ReviewDto, UpsertReviewInput } from "./reviews.schema.js";

const log = createLogger("reviews");

type ReviewWithUser = NonNullable<Awaited<ReturnType<typeof reviewsRepository.findById>>>;

const toReviewDto = (r: ReviewWithUser): ReviewDto => ({
  id: r.id,
  productId: r.productId,
  rating: r.rating,
  comment: r.comment,
  isVisible: r.isVisible,
  createdAt: r.createdAt.toISOString(),
  user: { id: r.user.id, name: r.user.name, image: r.user.image },
});

/** Recomputes the denormalised rating on the product row. */
async function syncProductRating(productId: string) {
  const s = await reviewsRepository.summary(productId);
  await productsRepository.setRating(productId, Math.round(s.average * 100), s.count);
}

export const reviewsService = {
  async listForProduct(productId: string, query: ListReviewsQuery) {
    const filters = [eq(reviews.productId, productId), eq(reviews.isVisible, true)];
    if (query.rating) filters.push(eq(reviews.rating, query.rating));
    const [{ rows, total }, summary] = await Promise.all([reviewsRepository.list(filters, query), reviewsRepository.summary(productId)]);
    return { items: rows.map(toReviewDto), meta: { ...pageMeta(total, query), summary } };
  },

  async mine(userId: string, productId: string) {
    const row = await reviewsRepository.findByUserAndProduct(userId, productId);
    return row ? toReviewDto(row) : null;
  },

  async upsert(userId: string, productId: string, input: UpsertReviewInput) {
    const product = await productsRepository.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError("Product", productId);
    if (!(await reviewsRepository.hasPurchased(userId, productId))) {
      throw new ForbiddenError("You can review a product after it has been delivered to you");
    }
    const row = await reviewsRepository.upsert(userId, productId, { rating: input.rating, comment: input.comment ?? null });
    await syncProductRating(productId);
    log.info({ userId, productId, rating: input.rating }, "Review saved");
    return toReviewDto((await reviewsRepository.findById(row.id))!);
  },

  async deleteMine(userId: string, productId: string) {
    const row = await reviewsRepository.findByUserAndProduct(userId, productId);
    if (!row) throw new NotFoundError("Review");
    await reviewsRepository.delete(row.id);
    await syncProductRating(productId);
  },

  // ---- admin ---------------------------------------------------------------
  async adminList(query: AdminListReviewsQuery) {
    const filters = [];
    if (query.productId) filters.push(eq(reviews.productId, query.productId));
    if (query.userId) filters.push(eq(reviews.userId, query.userId));
    if (query.visible !== undefined) filters.push(eq(reviews.isVisible, query.visible));
    const { rows, total } = await reviewsRepository.list(filters, query);
    return { items: rows.map(toReviewDto), meta: pageMeta(total, query) };
  },

  async setVisible(id: string, isVisible: boolean) {
    const row = await reviewsRepository.setVisible(id, isVisible);
    if (!row) throw new NotFoundError("Review", id);
    await syncProductRating(row.productId);
    return toReviewDto((await reviewsRepository.findById(id))!);
  },

  async adminDelete(id: string) {
    const row = await reviewsRepository.delete(id);
    if (!row) throw new NotFoundError("Review", id);
    await syncProductRating(row.productId);
  },
};
