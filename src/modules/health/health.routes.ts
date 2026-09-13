import { Router } from "express";
import { pingDatabase } from "../../db/index.js";

export const healthRouter = Router();

const startedAt = Date.now();

/** Liveness – always 200 while the process runs. */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: Math.round((Date.now() - startedAt) / 1000) });
});

/** Readiness – verifies the database is reachable. */
healthRouter.get("/health/ready", async (_req, res) => {
  const db = await pingDatabase();
  res.status(db ? 200 : 503).json({ status: db ? "ok" : "degraded", checks: { database: db ? "up" : "down" } });
});
