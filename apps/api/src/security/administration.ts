import { z } from "zod";
import { permissionKeys, scopes, type Grant } from "@nbs-crm/shared";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors.js";
import { hashPassword, validPassword } from "./password.js";
import { assertAdminRemains, assertDelegation, requireCapability } from "./policy.js";
import { principalFor, userAccess } from "./principal.js";
import { audit, currentActor, securityTransaction } from "./transactions.js";

const grantsSchema = z.array(z.object({ key: z.enum(permissionKeys), scope: z.enum(scopes) }).strict()).max(permissionKeys.length).refine(grants => new Set(grants.map(g => g.key)).size === grants.length);
const emailSchema = z.email().max(254).transform(value => value.trim().toLowerCase());
export async function createRole(db: PrismaClient, actorId: string, raw: unknown) {
  const input = z.object({ key: z.string().regex(/^[a-z][a-z0-9_-]{1,79}$/), name: z.string().trim().min(1).max(120), grants: grantsSchema }).strict().parse(raw);
  if (input.key === "administrator") throw new AppError(403, "FORBIDDEN", "Protected role.");
  return securityTransaction(db, async tx => {
    const actor = await currentActor(tx, actorId);
    requireCapability(actor, "roles.manage"); assertDelegation(actor, input.grants);
    const role = await tx.role.create({ data: { key: input.key, name: input.name, permissions: { create: input.grants.map(g => ({ permissionKey: g.key, scope: g.scope })) } } });
    await audit(tx, actorId, "ROLE_CREATED", "ROLE", role.id, { grants: input.grants });
    return { id: role.id, name: role.name };
  });
}
export async function replaceRolePermissions(db: PrismaClient, actorId: string, roleId: string, raw: unknown) {
  const grants = grantsSchema.parse(raw);
  return securityTransaction(db, async tx => {
    const actor = await currentActor(tx, actorId); requireCapability(actor, "roles.manage");
    const role = await tx.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
    if (!role) throw new AppError(404, "NOT_FOUND", "Role not found.");
    if (role.isSystem || role.id === actor.roleId) throw new AppError(403, "FORBIDDEN", "Protected or own role cannot be edited.");
    assertDelegation(actor, role.permissions.map(g => ({ key: g.permissionKey, scope: g.scope })) as Grant[]);
    assertDelegation(actor, grants);
    await tx.rolePermission.deleteMany({ where: { roleId } });
    await tx.rolePermission.createMany({ data: grants.map(g => ({ roleId, permissionKey: g.key, scope: g.scope })) });
    await tx.user.updateMany({ where: { roleId }, data: { securityVersion: { increment: 1 } } });
    await tx.session.updateMany({ where: { user: { roleId }, revokedAt: null }, data: { revokedAt: new Date(), revocationReason: "role_changed" } });
    await audit(tx, actorId, "ROLE_GRANTS_CHANGED", "ROLE", roleId, { grants });
  });
}
export async function createUser(db: PrismaClient, actorId: string, raw: unknown) {
  const input = z.object({ personId: z.uuid(), email: emailSchema, password: z.string().refine(validPassword), roleId: z.uuid() }).strict().parse(raw);
  const passwordHash = await hashPassword(input.password);
  return securityTransaction(db, async tx => {
    const actor = await currentActor(tx, actorId); requireCapability(actor, "users.create"); requireCapability(actor, "users.assign_role");
    const role = await tx.role.findUnique({ where: { id: input.roleId }, include: { permissions: true } });
    const person = await tx.person.findUnique({ where: { id: input.personId } });
    if (!role || !person || person.archivedAt) throw new AppError(400, "INVALID_REQUEST", "Invalid person or role.");
    assertDelegation(actor, role.permissions.map(g => ({ key: g.permissionKey, scope: g.scope })) as Grant[], role.isSystem);
    const user = await tx.user.create({ data: { email: input.email, passwordHash, roleId: role.id, personId: person.id } });
    await audit(tx, actorId, "USER_CREATED", "USER", user.id, { roleId: role.id });
    return { id: user.id };
  });
}
export async function updateUserSecurity(db: PrismaClient, actorId: string, targetId: string, raw: unknown) {
  const input = z.object({ roleId: z.uuid().optional(), isActive: z.boolean().optional(), password: z.string().refine(validPassword).optional() }).strict().refine(value => Object.keys(value).length > 0).parse(raw);
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  return securityTransaction(db, async tx => {
    const actor = await currentActor(tx, actorId);
    if (input.roleId !== undefined) requireCapability(actor, "users.assign_role");
    if (input.isActive !== undefined) requireCapability(actor, "users.deactivate");
    if (passwordHash) requireCapability(actor, "users.reset_password");
    const target = await tx.user.findUnique({ where: { id: targetId }, include: userAccess });
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (actorId === targetId && (input.roleId !== undefined || input.isActive !== undefined)) throw new AppError(403, "FORBIDDEN", "Cannot change your own role or activation.");
    assertDelegation(actor, principalFor(target).grants, target.role.isSystem);
    const nextRole = input.roleId ? await tx.role.findUnique({ where: { id: input.roleId }, include: { permissions: true } }) : target.role;
    if (!nextRole) throw new AppError(400, "INVALID_REQUEST", "Invalid role.");
    assertDelegation(actor, nextRole.permissions.map(g => ({ key: g.permissionKey, scope: g.scope })) as Grant[], nextRole.isSystem);
    const wasAdmin = target.isActive && target.role.isSystem && target.role.key === "administrator";
    const willBeAdmin = (input.isActive ?? target.isActive) && nextRole.isSystem && nextRole.key === "administrator";
    const otherAdmins = await tx.user.count({ where: { id: { not: targetId }, isActive: true, person: { archivedAt: null }, role: { key: "administrator", isSystem: true } } });
    assertAdminRemains(wasAdmin, willBeAdmin, otherAdmins);
    if (input.isActive && target.person.archivedAt) throw new AppError(409, "CONFLICT", "Restore the person before activating access.");
    await tx.user.update({ where: { id: targetId }, data: { roleId: nextRole.id, ...(input.isActive === undefined ? {} : { isActive: input.isActive }), ...(passwordHash ? { passwordHash } : {}), securityVersion: { increment: 1 } } });
    await tx.session.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date(), revocationReason: "access_changed" } });
    await audit(tx, actorId, "USER_ACCESS_CHANGED", "USER", targetId, { roleId: nextRole.id, isActive: input.isActive ?? target.isActive, passwordChanged: Boolean(passwordHash) });
  });
}
