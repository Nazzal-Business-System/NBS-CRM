import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors.js";
import { principalFor, userAccess } from "./principal.js";

export const SECURITY_LOCK = 1864005;
export async function securityTransaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  // All access mutations and bootstrap share this lock. Serialization failures fail closed.
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SECURITY_LOCK})`;
    return work(tx);
  }, { isolationLevel: "Serializable", timeout: 15000 });
}
export async function currentActor(tx: Prisma.TransactionClient, actorId: string) {
  const user = await tx.user.findUnique({ where: { id: actorId }, include: userAccess });
  if (!user?.isActive || user.person.archivedAt) throw new AppError(403, "FORBIDDEN", "Access denied.");
  return principalFor(user);
}
export function audit(tx: Prisma.TransactionClient, actorUserId: string | null, action: string, entityType: string, entityId: string, changes?: Prisma.InputJsonValue) {
  // Call sites supply only explicitly selected non-secret fields, never request objects.
  return tx.auditLog.create({ data: { actorUserId, action, entityType, entityId, ...(changes === undefined ? {} : { changes }) } });
}
