import { z } from "zod";
import { permissionKeys } from "@nbs-crm/shared";
import type { PrismaClient } from "./generated/prisma/client.js";
import { AppError } from "./errors.js";
import { hashPassword, validPassword } from "./security/password.js";
import { audit, securityTransaction } from "./security/transactions.js";

export const bootstrapSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.email().max(254).transform(value => value.toLowerCase()),
  password: z.string().refine(validPassword),
  currency: z.object({ code: z.string().regex(/^[A-Z]{3}$/), name: z.string().trim().min(1).max(80), minorUnits: z.number().int().min(0).max(4) }).strict(),
  timezone: z.string().max(64).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }),
  locale: z.enum(["en", "ar"]),
}).strict();
export function assertBootstrapAllowed(enabled: boolean, existingUsers: number): void {
  if (!enabled || existingUsers !== 0) throw new AppError(409, "BOOTSTRAP_CLOSED", "Bootstrap is disabled or already completed.");
}
export async function bootstrapAdmin(db: PrismaClient, raw: unknown, enabled: boolean): Promise<void> {
  assertBootstrapAllowed(enabled, 0);
  const input = bootstrapSchema.parse(raw);
  const passwordHash = await hashPassword(input.password);
  await securityTransaction(db, async tx => {
    assertBootstrapAllowed(enabled, await tx.user.count());
    if (await tx.role.count() || await tx.workspaceSettings.count()) throw new AppError(409, "BOOTSTRAP_CLOSED", "Bootstrap requires an empty identity foundation.");
    await tx.permission.createMany({ data: permissionKeys.map(key => ({ key, description: key.replaceAll("_", " ").replace(".", ": ") })), skipDuplicates: true });
    const role = await tx.role.create({ data: { key: "administrator", name: "Administrator", isSystem: true, permissions: { create: permissionKeys.map(permissionKey => ({ permissionKey, scope: "ALL" })) } } });
    const person = await tx.person.create({ data: { name: input.name } });
    const user = await tx.user.create({ data: { email: input.email, passwordHash, personId: person.id, roleId: role.id, locale: input.locale } });
    await tx.currency.create({ data: input.currency });
    await tx.workspaceSettings.create({ data: { id: 1, defaultCurrencyCode: input.currency.code, timezone: input.timezone, locale: input.locale } });
    await audit(tx, user.id, "INITIAL_ADMIN_CREATED", "USER", user.id, { roleId: role.id });
  });
}
