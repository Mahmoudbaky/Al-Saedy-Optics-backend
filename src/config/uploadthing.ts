import { createUploadthing, type FileRouter } from "uploadthing/express";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 }, // Adjust max file size as needed
  }).onUploadComplete((data) => {
    console.log("upload completed", data);
  }),
} satisfies FileRouter;

type OurFileRouter = typeof uploadRouter;
const utapi = new UTApi();

export { OurFileRouter, utapi };
