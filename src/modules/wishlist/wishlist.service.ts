import { NotFoundError } from "../../lib/errors.js";
import { productsRepository } from "../products/products.repository.js";
import { productsService } from "../products/products.service.js";
import { wishlistRepository } from "./wishlist.repository.js";

export const wishlistService = {
  async list(userId: string) {
    const ids = await wishlistRepository.productIds(userId);
    return productsService.cardsByIds(ids);
  },

  /** Lightweight – lets the app mark hearts without loading products. */
  ids: (userId: string) => wishlistRepository.productIds(userId),

  async add(userId: string, productId: string) {
    const product = await productsRepository.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError("Product", productId);
    await wishlistRepository.add(userId, productId);
    return { productId, inWishlist: true };
  },

  async remove(userId: string, productId: string) {
    await wishlistRepository.remove(userId, productId);
    return { productId, inWishlist: false };
  },

  async toggle(userId: string, productId: string) {
    return (await wishlistRepository.has(userId, productId)) ? this.remove(userId, productId) : this.add(userId, productId);
  },

  clear: (userId: string) => wishlistRepository.clear(userId),
};
