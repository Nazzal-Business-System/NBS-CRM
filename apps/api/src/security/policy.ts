import { canDelegate, hasGrant, type Grant, type PermissionKey, type Principal } from "@nbs-crm/shared";
import { AppError } from "../errors.js";
export function requireCapability(actor: Principal, key: PermissionKey): void {
  if (!hasGrant(actor, key, "ALL")) throw new AppError(403, "FORBIDDEN", "Insufficient permission.");
}
export function assertDelegation(actor: Principal, grants: readonly Grant[], systemRole = false): void {
  if ((systemRole && !actor.isAdministrator) || !canDelegate(actor, grants)) throw new AppError(403, "FORBIDDEN", "Cannot delegate these privileges.");
}
export function assertAdminRemains(wasAdmin: boolean, willBeAdmin: boolean, otherAdmins: number): void {
  if (wasAdmin && !willBeAdmin && otherAdmins < 1) throw new AppError(409, "LAST_ADMIN", "The last active administrator must be retained.");
}
