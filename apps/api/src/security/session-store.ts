import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import type { SessionStore } from "./sessions.js";
import { principalFor, userAccess } from "./principal.js";
export function prismaSessionStore(db: PrismaClient | Prisma.TransactionClient): SessionStore {
  return {
    create: data => db.session.create({ data }),
    async find(tokenHash) {
      const row = await db.session.findUnique({ where: { tokenHash }, include: { user: { include: userAccess } } });
      return row ? { ...row, userActive: row.user.isActive && row.user.person.archivedAt === null, userSecurityVersion: row.user.securityVersion, principal: principalFor(row.user) } : null;
    },
    async touch(id, now, idleExpiresAt) {
      const result = await db.session.updateMany({ where: { id, revokedAt: null, expiresAt: { gt: now }, idleExpiresAt: { gt: now }, user: { isActive: true, person: { archivedAt: null } } }, data: { lastSeenAt: now, idleExpiresAt } });
      return result.count === 1;
    },
    async revoke(id, now, reason) { await db.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now, revocationReason: reason } }); },
    async revokeAll(userId, now, reason) { await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now, revocationReason: reason } }); },
  };
}
