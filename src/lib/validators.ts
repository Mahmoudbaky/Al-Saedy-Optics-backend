import z from "zod";

export const createCategoryValidationSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
});

export const createProductValidationSchema = z.object({
  name: z.string().min(2).max(100),
  brand: z.string().min(2).max(100),
  description: z.string().min(2).max(500).optional(),
  aboutItem: z.array(z.string().min(2).max(100)).optional(),
  price: z.number().min(0),
  category: z.string().min(2).max(100),
  stock: z.number().min(0),
  discount: z.number().min(0).max(100),
  images: z.array(z.string().min(2).max(300)).optional(),
  banner: z.string().min(2).max(500).or(z.literal("")).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserProfileValidationSchema = z.object({
  email: z.string().email(),
  userName: z.string().min(2).max(100),
  userImage: z.string().min(2).max(500).optional(),
});

export const createFeedbackValidationSchema = z.object({
  productId: z.string().min(2).max(100),
  rating: z.number().min(1).max(5),
  comment: z.string().min(2).max(500).optional(),
});
