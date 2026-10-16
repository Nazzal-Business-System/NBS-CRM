import type { Prisma } from "../generated/prisma/client.js";
import { permissionKeys, type Principal, type PermissionKey } from "@nbs-crm/shared";
export const userAccess = {
  person: true,
  role: { include: { permissions: true } },
  memberships: { where: { team: { archivedAt: null } }, select: { teamId: true } },
} as const;
export type AccessUser = Prisma.UserGetPayload<{ include: typeof userAccess }>;
export function principalFor(user: AccessUser): Principal {
  return {
    id: user.id, roleId: user.roleId,
    isAdministrator: user.role.isSystem && user.role.key === "administrator",
    teamIds: user.memberships.map(member => member.teamId),
    grants: user.role.permissions.filter(grant => (permissionKeys as readonly string[]).includes(grant.permissionKey)).map(grant => ({ key: grant.permissionKey as PermissionKey, scope: grant.scope })),
  };
}
