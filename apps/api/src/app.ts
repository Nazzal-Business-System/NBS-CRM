import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthSchema } from "@nbs-crm/shared";
import { env } from "./env.js";
import { AppError, errorHandler } from "./errors.js";
import { authRouter } from "./auth.js";
import { originProtection } from "./security/http.js";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.locals.requestId = randomUUID(); res.setHeader("X-Request-Id", res.locals.requestId); next(); });
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true, allowedHeaders: ["Content-Type", "X-CRM-Request", "X-CSRF-Token"] }));
  app.use(express.json({ limit: "1mb" }));
  app.use(originProtection(env.WEB_ORIGIN));
  app.get("/api/health", (_req, res) => res.json({ data: healthSchema.parse({ status: "ok", service: "crm-api" }) }));
  if (env.AUTH_ENABLED) app.use("/api/auth", authRouter());
  app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Route not found.")));
  app.use(errorHandler);
  return app;
}
