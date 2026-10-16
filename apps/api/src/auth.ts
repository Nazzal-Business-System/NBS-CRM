import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { hasGrant } from "@nbs-crm/shared";
import { getDb } from "./db.js";
import { env } from "./env.js";
import { AppError } from "./errors.js";
import { cookieSettings, readSessionCookie } from "./security/http.js";
import { loginLimiter } from "./security/login-limit.js";
import { verifyPassword } from "./security/password.js";
import { userAccess, principalFor } from "./security/principal.js";
import { prismaSessionStore } from "./security/session-store.js";
import { csrfMatches, hashToken, sessionService } from "./security/sessions.js";
import { audit, securityTransaction } from "./security/transactions.js";

export const sessionPolicy = { idleMs: env.SESSION_IDLE_MINUTES * 60_000, absoluteMs: env.SESSION_ABSOLUTE_HOURS * 3600_000 };
type ValidSession = NonNullable<Awaited<ReturnType<ReturnType<typeof sessionService>["validate"]>>>;
declare module "express-serve-static-core" { interface Request { security?: ValidSession } }
export const authenticate: RequestHandler = async (req, _res, next) => {
  const cookie = cookieSettings(env.NODE_ENV === "production");
  const token = readSessionCookie(req.headers.cookie, cookie.name);
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Sign in required.");
  const result = await sessionService(prismaSessionStore(getDb()), sessionPolicy).validate(token);
  if (!result) throw new AppError(401, "UNAUTHENTICATED", "Sign in required.");
  req.security = result; next();
};
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (!req.security || !csrfMatches(req.get("X-CSRF-Token"), req.security.session.csrfHash)) throw new AppError(403, "CSRF_REJECTED", "Request verification failed.");
  next();
};
export function authRouter() {
  const router = Router();
  const limiter = loginLimiter();
  const cookie = cookieSettings(env.NODE_ENV === "production");
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  router.post("/login", async (req, res) => {
    const input = z.object({ email: z.email().max(254).transform(value => value.toLowerCase()), password: z.string().min(1).max(1024) }).strict().parse(req.body);
    limiter.attempt(req.socket.remoteAddress ?? "unknown", input.email);
    const db = getDb();
    const user = await db.user.findUnique({ where: { email: input.email }, include: userAccess });
    const matches = await limiter.hash(() => verifyPassword(input.password, user?.passwordHash ?? null));
    if (!matches || !user?.isActive || user.person.archivedAt) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    const result = await securityTransaction(db, async tx => {
      const current = await tx.user.findUnique({ where: { id: user.id }, include: userAccess });
      if (!current?.isActive || current.person.archivedAt || current.securityVersion !== user.securityVersion || current.passwordHash !== user.passwordHash) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      const oldToken = readSessionCookie(req.headers.cookie, cookie.name);
      if (oldToken) await tx.session.updateMany({ where: { tokenHash: hashToken(oldToken), revokedAt: null }, data: { revokedAt: new Date(), revocationReason: "login_rotated" } });
      const created = await sessionService(prismaSessionStore(tx), sessionPolicy).create(current);
      await tx.user.update({ where: { id: current.id }, data: { lastLoginAt: new Date() } });
      await audit(tx, current.id, "LOGIN_SUCCEEDED", "SESSION", created.session.id);
      return { ...created, user: { id: current.id, name: current.person.name, email: current.email, access: principalFor(current) } };
    });
    res.cookie(cookie.name, result.token, { ...cookie.options, maxAge: sessionPolicy.absoluteMs });
    res.json({ data: { user: result.user, csrfToken: result.csrfToken } });
  });
  router.get("/me", authenticate, (req, res) => res.json({ data: { user: req.security!.principal, csrfToken: req.security!.csrfToken } }));
  router.post("/logout", authenticate, requireCsrf, async (req, res) => {
    const session = req.security!.session;
    await getDb().$transaction(async tx => {
      await prismaSessionStore(tx).revoke(session.id, new Date(), "logout");
      await audit(tx, session.userId, "LOGOUT", "SESSION", session.id);
    });
    res.clearCookie(cookie.name, cookie.options); res.json({ data: { ok: true } });
  });
  router.post("/sessions/revoke-all", authenticate, requireCsrf, async (req, res) => {
    const security = req.security!;
    if (!hasGrant(security.principal, "sessions.revoke_own")) throw new AppError(403, "FORBIDDEN", "Insufficient permission.");
    await securityTransaction(getDb(), async tx => {
      await tx.user.update({ where: { id: security.principal.id }, data: { securityVersion: { increment: 1 } } });
      await prismaSessionStore(tx).revokeAll(security.principal.id, new Date(), "user_request");
      await audit(tx, security.principal.id, "SESSIONS_REVOKED", "USER", security.principal.id);
    });
    res.clearCookie(cookie.name, cookie.options); res.json({ data: { ok: true } });
  });
  return router;
}
