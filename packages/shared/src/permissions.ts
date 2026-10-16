export const scopes = ["OWN", "TEAM", "ALL"] as const;
export type Scope = typeof scopes[number];
// Capability keys are code-defined. Clients customize roles and grants, not code paths.
export const permissionKeys = [
  "users.read", "users.create", "users.update", "users.assign_role", "users.deactivate",
  "users.reset_password", "roles.read", "roles.manage", "teams.read", "teams.manage",
  "sessions.revoke_own", "sessions.revoke_all", "audit.read", "settings.read", "settings.manage",
] as const;
export type PermissionKey = typeof permissionKeys[number];
export interface Grant { key: PermissionKey; scope: Scope }
export interface Principal {
  id: string;
  roleId: string;
  isAdministrator: boolean;
  teamIds: string[];
  grants: Grant[];
}
const rank: Record<Scope, number> = { OWN: 0, TEAM: 1, ALL: 2 };
export function hasGrant(actor: Principal, key: PermissionKey, scope: Scope = "OWN"): boolean {
  return actor.grants.some(grant => grant.key === key && rank[grant.scope] >= rank[scope]);
}
export function canAccessRecord(actor: Principal, key: PermissionKey, record: { ownerId: string | null; teamId: string | null }): boolean {
  return actor.grants.some(grant => grant.key === key && (
    grant.scope === "ALL" || record.ownerId === actor.id ||
    (grant.scope === "TEAM" && record.teamId !== null && actor.teamIds.includes(record.teamId))
  ));
}
export function canDelegate(actor: Principal, grants: readonly Grant[]): boolean {
  return grants.every(grant => hasGrant(actor, grant.key, grant.scope));
}
