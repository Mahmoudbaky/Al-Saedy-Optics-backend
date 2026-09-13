import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function pageMeta(total: number, { page, limit }: PaginationQuery): PageMeta {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 };
}

export const offsetOf = ({ page, limit }: PaginationQuery) => (page - 1) * limit;
