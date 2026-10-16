import type { CookieOptions, RequestHandler } from "express";
import { AppError } from "../errors.js";

export function cookieSettings(production: boolean): { name: string; options: CookieOptions } {
  return { name: production ? "__Host-crm_session" : "crm_session", options: { httpOnly: true, secure: production, sameSite: "lax", path: "/" } };
}
export function readSessionCookie(header: string | undefined, name: string): string | undefined {
  const values = (header ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (values.length !== 1) return undefined;
  const value = values[0]!.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export function originProtection(origin: string): RequestHandler {
  return (req, _res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
    // Require exact Origin and a non-simple header, including on login (login CSRF).
    if (req.headers.origin !== origin || req.get("X-CRM-Request") !== "1" || req.get("Sec-Fetch-Site") === "cross-site") {
      throw new AppError(403, "ORIGIN_REJECTED", "Request origin rejected.");
    }
    if (req.body !== undefined && !req.is("application/json")) throw new AppError(415, "INVALID_REQUEST", "JSON is required.");
    next();
  };
}
