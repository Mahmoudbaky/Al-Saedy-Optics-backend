import { createUploadthing, type FileRouter } from "uploadthing/express";
import { UTApi } from "uploadthing/server";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { createLogger } from "./logger.js";

const log = createLogger("uploads");
const f = createUploadthing();

async function sessionFrom(req: { headers: Record<string, string | string[] | undefined> }) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) throw new Error("Unauthorized");
  return result.user;
}

/**
 * UploadThing file routes. The client (admin panel / app) uploads directly to
 * UploadThing; we only authorise and record the resulting URL.
 */
export const uploadRouter = {
  /** Product / category / banner images – admin only. */
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 8 } })
    .middleware(async ({ req }) => {
      const user = await sessionFrom(req);
      if (user.role !== "admin") throw new Error("Admin only");
      return { uploadedBy: user.id };
    })
    .onUploadComplete(({ metadata, file }) => {
      log.info({ uploadedBy: metadata.uploadedBy, url: file.ufsUrl, size: file.size }, "Product image uploaded");
      return { url: file.ufsUrl };
    }),

  /** Photo of a paper prescription – any signed-in customer. */
  prescriptionImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => ({ uploadedBy: (await sessionFrom(req)).id }))
    .onUploadComplete(({ metadata, file }) => {
      log.info({ uploadedBy: metadata.uploadedBy, url: file.ufsUrl }, "Prescription image uploaded");
      return { url: file.ufsUrl };
    }),

  /** Profile avatar. */
  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => ({ uploadedBy: (await sessionFrom(req)).id }))
    .onUploadComplete(({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
export const utapi = new UTApi();
