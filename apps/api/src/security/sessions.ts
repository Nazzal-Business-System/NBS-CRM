import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Principal } from "@nbs-crm/shared";

export const hashToken = (value: string): string => createHash("sha256").update(value).digest("hex");
export const csrfForToken = (token: string): string => createHmac("sha256", token).update("crm-csrf-v1").digest("base64url");
export interface StoredSession {
  id: string; userId: string; tokenHash: string; csrfHash: string; securityVersion: number;
  createdAt: Date; lastSeenAt: Date; idleExpiresAt: Date; expiresAt: Date; revokedAt: Date | null;
}
export interface SessionLookup extends StoredSession {
  userActive: boolean; userSecurityVersion: number; principal: Principal;
}
export interface SessionStore {
  create(data: Omit<StoredSession, "id" | "revokedAt">): Promise<StoredSession>;
  find(tokenHash: string): Promise<SessionLookup | null>;
  touch(id: string, now: Date, idleExpiresAt: Date): Promise<boolean>;
  revoke(id: string, now: Date, reason: string): Promise<void>;
  revokeAll(userId: string, now: Date, reason: string): Promise<void>;
}
export interface SessionPolicy { idleMs: number; absoluteMs: number }
export function sessionIsValid(row: SessionLookup, now: Date): boolean {
  return row.userActive && row.revokedAt === null && row.securityVersion === row.userSecurityVersion &&
    row.expiresAt > now && row.idleExpiresAt > now;
}
export function csrfMatches(csrf: string | undefined, expectedHash: string): boolean {
  if (!csrf || !/^[A-Za-z0-9_-]{43}$/.test(csrf) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(hashToken(csrf), "hex"), Buffer.from(expectedHash, "hex"));
}
export function sessionService(store: SessionStore, policy: SessionPolicy) {
  if (policy.idleMs <= 0 || policy.absoluteMs < policy.idleMs) throw new Error("Invalid session policy.");
  return {
    async create(user: { id: string; securityVersion: number }, now = new Date()) {
      const token = randomBytes(32).toString("base64url");
      const csrfToken = csrfForToken(token);
      const session = await store.create({ userId: user.id, tokenHash: hashToken(token), csrfHash: hashToken(csrfToken), securityVersion: user.securityVersion, createdAt: now, lastSeenAt: now, idleExpiresAt: new Date(now.getTime() + policy.idleMs), expiresAt: new Date(now.getTime() + policy.absoluteMs) });
      return { token, csrfToken, session };
    },
    async validate(token: string | undefined, now = new Date()) {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const row = await store.find(hashToken(token));
      if (!row || !sessionIsValid(row, now)) return null;
      const idleExpiresAt = new Date(Math.min(now.getTime() + policy.idleMs, row.expiresAt.getTime()));
      if (!await store.touch(row.id, now, idleExpiresAt)) return null;
      return { session: row, principal: row.principal, csrfToken: csrfForToken(token) };
    },
    revoke: (id: string, reason = "logout") => store.revoke(id, new Date(), reason),
    revokeAll: (userId: string, reason = "user_request") => store.revokeAll(userId, new Date(), reason),
  };
}
