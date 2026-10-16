import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createRole, replaceRolePermissions, updateUserSecurity } from "./security/administration.js";
import type { AccessUser } from "./security/principal.js";
import { permissionKeys } from "@nbs-crm/shared";

const actorId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const roleId = "00000000-0000-4000-8000-000000000003";
const timestamps = { createdAt: new Date(0), updatedAt: new Date(0) };
const person = { ...timestamps, id: "00000000-0000-4000-8000-000000000004", name: "Synthetic Person", email: null, phone: null, archivedAt: null };
function user(id: string, administrator = false): AccessUser {
  return { ...timestamps, id, email: "synthetic@example.invalid", passwordHash: "synthetic-not-a-credential", personId: person.id, securityVersion: 1, locale: "en", timezone: null, lastLoginAt: null, isActive: true, person, roleId, memberships: [], role: { ...timestamps, id: roleId, name: "Synthetic", description: null, key: administrator ? "administrator" : "delegated", isSystem: administrator, permissions: (administrator ? permissionKeys : ["roles.manage", "users.assign_role"]).map(permissionKey => ({ ...timestamps, roleId, permissionKey, scope: "ALL" })) } };
}
function database(actor: AccessUser, target = user(otherId), role = target.role) {
  const writes: string[] = [];
  const tx = {
    $executeRaw: async () => 1,
    user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === actor.id ? actor : target, count: async () => 0, update: async () => { writes.push("user"); } },
    role: { findUnique: async () => role, create: async () => { writes.push("role"); } },
    rolePermission: { deleteMany: async () => { writes.push("grants"); } },
  };
  return { writes, db: { $transaction: async (work: (value: typeof tx) => Promise<unknown>) => work(tx) } as unknown as PrismaClient };
}

test("role creation rejects injected system flags and grants outside actor privileges before writes", async () => {
  const fake = database(user(actorId));
  await assert.rejects(createRole(fake.db, actorId, { key: "test-role", name: "Test", grants: [], isSystem: true }));
  await assert.rejects(createRole(fake.db, actorId, { key: "test-role", name: "Test", grants: [{ key: "settings.manage", scope: "ALL" }] }));
  assert.equal(fake.writes.length, 0);
});
test("system/own role editing and self-escalation are denied before writes", async () => {
  const fake = database(user(actorId));
  await assert.rejects(replaceRolePermissions(fake.db, actorId, roleId, []));
  await assert.rejects(updateUserSecurity(fake.db, actorId, actorId, { roleId }));
  assert.equal(fake.writes.length, 0);
});
test("delegated administrators cannot assign protected roles or remove the last administrator", async () => {
  const actor = user(actorId);
  const protectedRole = user(otherId, true).role;
  const fake = database(actor, user(otherId), protectedRole);
  await assert.rejects(updateUserSecurity(fake.db, actorId, otherId, { roleId }));
  assert.equal(fake.writes.length, 0);
  const lastAdmin = database(user(actorId, true), user(otherId, true));
  await assert.rejects(updateUserSecurity(lastAdmin.db, actorId, otherId, { isActive: false }));
  assert.equal(lastAdmin.writes.length, 0);
});
