import express from "express";

import * as adminController from "../controllers/adminControllers.js";
import { protect, authorize } from "../middleware/auth.js";

export const router = express.Router();

router.get(
  "/overview",
  protect,
  authorize("admin"),
  adminController.getOverviewData
);

export default router;
