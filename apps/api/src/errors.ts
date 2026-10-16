import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const requestId = String(res.locals.requestId);
  if (error instanceof AppError) { res.status(error.status).json({ error: { code: error.code, message: error.message, requestId } }); return; }
  if (error instanceof ZodError) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed.", requestId } }); return; }
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
  if ([400, 413, 415].includes(status)) { res.status(status).json({ error: { code: "INVALID_REQUEST", message: "Invalid request body.", requestId } }); return; }
  // Never log raw errors, request bodies, credentials, or environment values.
  console.error(JSON.stringify({ event: "request_failed", requestId }));
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred.", requestId } });
};
