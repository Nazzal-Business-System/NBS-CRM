import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { canAccessRecord, canDelegate, permissionKeys, type Principal } from "@nbs-crm/shared";
import { hashPassword, verifyPassword } from "./security/password.js";
import { cookieSettings, originProtection, readSessionCookie } from "./security/http.js";
import { assertAdminRemains, assertDelegation } from "./security/policy.js";
import { csrfMatches, sessionService, type SessionLookup, type SessionStore } from "./security/sessions.js";
import { assertBootstrapAllowed, bootstrapSchema } from "./bootstrap.js";
import { errorHandler } from "./errors.js";
import { loginLimiter } from "./security/login-limit.js";
import { requireCsrf } from "./auth.js";

const principal: Principal = { id: "user", roleId: "role", isAdministrator: false, teamIds: ["team"], grants: [{ key: "users.read", scope: "TEAM" }] };
function memoryStore() {
  let row: SessionLookup | null = null;
  const store: SessionStore = {
    async create(data) { row = { ...data, id: "session", revokedAt: null, principal, userActive: true, userSecurityVersion: data.securityVersion }; return row; },
    async find(hash) { return row?.tokenHash === hash ? { ...row } : null; },
    async touch(_id, now, idleExpiresAt) { if (!row || row.revokedAt || row.expiresAt <= now || row.idleExpiresAt <= now) return false; row.lastSeenAt = now; row.idleExpiresAt = idleExpiresAt; return true; },
    async revoke(_id, now) { if (row) row.revokedAt = now; },
    async revokeAll(_id, now) { if (row) row.revokedAt = now; },
  };
  return { store, change: (changes: Partial<SessionLookup>) => { if (row) Object.assign(row, changes); }, read: () => row };
}

test("password hashing is salted, bounded, verifies and rejects wrong/malformed credentials", async () => {
  const password = "synthetic test password only";
  const first = await hashPassword(password); const second = await hashPassword(password);
  assert.ok(first !== second);
  assert.ok(await verifyPassword(password, first));
  assert.ok(!await verifyPassword("incorrect synthetic password", first));
  assert.ok(!await verifyPassword(password, null));
  assert.ok(!await verifyPassword(password, "scrypt$999999999$8$1$invalid$invalid"));
  await assert.rejects(hashPassword("short"));
});

test("opaque sessions store hashes only, slide within absolute bounds, and reject CSRF/revocation/expiry", async () => {
  const memory = memoryStore(); const service = sessionService(memory.store, { idleMs: 1000, absoluteMs: 3000 });
  const start = new Date("2026-01-01T00:00:00Z");
  const created = await service.create({ id: "user", securityVersion: 1 }, start);
  assert.ok(created.token.length === 43 && memory.read()!.tokenHash !== created.token);
  assert.ok(csrfMatches(created.csrfToken, created.session.csrfHash));
  assert.ok(!csrfMatches("invalid", created.session.csrfHash));
  assert.ok(!await service.validate("malformed", start));
  assert.ok(await service.validate(created.token, new Date(start.getTime() + 900)));
  assert.ok(await service.validate(created.token, new Date(start.getTime() + 1800)));
  assert.ok(await service.validate(created.token, new Date(start.getTime() + 2700)));
  assert.ok(memory.read()!.idleExpiresAt.getTime() === start.getTime() + 3000);
  assert.ok(!await service.validate(created.token, new Date(start.getTime() + 3000)));
  await service.revoke(created.session.id);
  assert.ok(!await service.validate(created.token, start));
});

test("inactive users, security-version changes, idle expiry and concurrent revocation fail closed", async () => {
  for (const change of [{ userActive: false }, { userSecurityVersion: 2 }, { idleExpiresAt: new Date(0) }]) {
    const memory = memoryStore(); const service = sessionService(memory.store, { idleMs: 1000, absoluteMs: 3000 });
    const result = await service.create({ id: "user", securityVersion: 1 });
    memory.change(change); assert.ok(!await service.validate(result.token));
  }
  const memory = memoryStore();
  const service = sessionService({ ...memory.store, async touch() { return false; } }, { idleMs: 1000, absoluteMs: 3000 });
  const result = await service.create({ id: "user", securityVersion: 1 });
  assert.ok(!await service.validate(result.token));
  await service.revokeAll("user"); assert.ok(memory.read()!.revokedAt);
});

test("OWN/TEAM/ALL scopes and delegation never grant access implicitly", () => {
  assert.ok(canAccessRecord(principal, "users.read", { ownerId: "user", teamId: null }));
  assert.ok(canAccessRecord(principal, "users.read", { ownerId: "other", teamId: "team" }));
  assert.ok(!canAccessRecord(principal, "users.read", { ownerId: "other", teamId: "foreign" }));
  assert.ok(!canAccessRecord(principal, "users.update", { ownerId: "user", teamId: "team" }));
  assert.ok(!canDelegate(principal, [{ key: "users.read", scope: "ALL" }]));
  assert.throws(() => assertDelegation(principal, [], true));
  assert.throws(() => assertAdminRemains(true, false, 0));
  assert.doesNotThrow(() => assertAdminRemains(true, false, 1));
  const admin: Principal = { ...principal, isAdministrator: true, grants: permissionKeys.map(key => ({ key, scope: "ALL" })) };
  assert.ok(canDelegate(admin, [{ key: "users.update", scope: "TEAM" }]));
});

test("production cookies are host-only, secure, HttpOnly, and duplicate cookies are rejected", () => {
  const production = cookieSettings(true);
  assert.equal(production.name, "__Host-crm_session");
  assert.ok(production.options.secure && production.options.httpOnly && production.options.path === "/" && production.options.sameSite === "lax");
  assert.ok(!production.options.domain);
  const token = "a".repeat(43);
  assert.ok(readSessionCookie(`${production.name}=${token}`, production.name));
  assert.ok(!readSessionCookie(`${production.name}=${token}; ${production.name}=${token}`, production.name));
});

test("origin guard rejects missing, forged, cross-site and simple requests without contacting a DB", async () => {
  const app = express(); app.use(express.json());
  app.use((_req, res, next) => { res.locals.requestId = "synthetic"; next(); });
  app.use(originProtection("http://localhost:3000"));
  const memory = memoryStore();
  const service = sessionService(memory.store, { idleMs: 1000, absoluteMs: 3000 });
  const created = await service.create({ id: "user", securityVersion: 1 });
  app.post("/protected", (req, _res, next) => { req.security = { session: memory.read()!, principal, csrfToken: created.csrfToken }; next(); }, requireCsrf, (_req, res) => res.json({ ok: true }));
  app.post("/login", (_req, res) => res.json({ ok: true })); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/login`;
  try {
    const cases: Record<string, string>[] = [{}, { Origin: "http://evil.example", "X-CRM-Request": "1" }, { Origin: "http://localhost:3000" }, { Origin: "http://localhost:3000", "X-CRM-Request": "1", "Sec-Fetch-Site": "cross-site" }];
    for (const headers of cases) {
      assert.equal((await fetch(url, { method: "POST", headers })).status, 403);
    }
    assert.equal((await fetch(url, { method: "POST", headers: { Origin: "http://localhost:3000", "X-CRM-Request": "1", "Content-Type": "application/json" }, body: "{}" })).status, 200);
    const protectedUrl = url.replace("/login", "/protected");
    const headers = { Origin: "http://localhost:3000", "X-CRM-Request": "1" };
    assert.equal((await fetch(protectedUrl, { method: "POST", headers })).status, 403);
    assert.equal((await fetch(protectedUrl, { method: "POST", headers: { ...headers, "X-CSRF-Token": "invalid" } })).status, 403);
    assert.equal((await fetch(protectedUrl, { method: "POST", headers: { ...headers, "X-CSRF-Token": created.csrfToken } })).status, 200);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test("bootstrap is explicit, one-time and validates credentials/configuration without connecting", () => {
  assert.throws(() => assertBootstrapAllowed(false, 0)); assert.throws(() => assertBootstrapAllowed(true, 1));
  assert.doesNotThrow(() => assertBootstrapAllowed(true, 0));
  assert.ok(!bootstrapSchema.safeParse({}).success);
  assert.ok(!bootstrapSchema.safeParse({ name: "Example", email: "example@example.invalid", password: "short", currency: { code: "USD", name: "Example currency", minorUnits: 2 }, timezone: "Not/AZone", locale: "en" }).success);
});

test("login limiter bounds attempts and hashing concurrency, then expires buckets", async () => {
  let now = 0; const limiter = loginLimiter(() => now);
  for (let i = 0; i < 10; i++) limiter.attempt("local", "synthetic@example.invalid");
  assert.throws(() => limiter.attempt("local", "synthetic@example.invalid"));
  now += 16 * 60_000; assert.doesNotThrow(() => limiter.attempt("local", "synthetic@example.invalid"));
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const first = limiter.hash(() => gate); const second = limiter.hash(() => gate);
  await assert.rejects(limiter.hash(async () => {})); release(); await Promise.all([first, second]);
});

