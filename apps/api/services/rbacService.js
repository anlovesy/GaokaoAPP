import {
  PERMISSIONS,
  buildAccessProfile,
  canAssignRole,
  canManageRole,
  getManageableRoles,
  getRoleOptionList,
  hasAllPermissions,
  hasAnyPermission,
  isAdminRole,
  normalizeRole
} from "../../shared/rbac.js";
import { PermissionError } from "../errors/appError.js";

export { PERMISSIONS };

const ADMIN_PANEL_PERMISSIONS = [
  PERMISSIONS.route.ADMIN_USERS,
  PERMISSIONS.api.USERS_READ,
  PERMISSIONS.api.USERS_CREATE,
  PERMISSIONS.api.USERS_ROLE_UPDATE,
  PERMISSIONS.api.USERS_PASSWORD_RESET,
  PERMISSIONS.api.USERS_DELETE,
  PERMISSIONS.api.IMPORT_UPLOAD
];

export function buildUserAccessContext(user) {
  const accessProfile = buildAccessProfile(user?.role);

  return {
    ...user,
    role: accessProfile.role,
    access: accessProfile,
    permissions: accessProfile.permissions,
    apiPermissions: accessProfile.apiPermissions,
    routePermissions: accessProfile.routePermissions,
    menuPermissions: accessProfile.menuPermissions,
    resourcePermissions: accessProfile.resourcePermissions,
    rolePermissions: accessProfile.rolePermissions,
    manageableRoles: accessProfile.manageableRoles
  };
}

export function normalizeIncomingRole(role) {
  return normalizeRole(role);
}

export function listAssignableRolesForActor(actorRole) {
  const manageableRoles = new Set(getManageableRoles(actorRole));
  return getRoleOptionList().filter((option) => manageableRoles.has(option.value));
}

export function hasApiPermission(userOrAccess, permission) {
  return hasAllPermissions(resolvePermissions(userOrAccess), [permission]);
}

export function assertApiPermission(
  userOrAccess,
  permission,
  message = "当前账号没有执行该操作的权限"
) {
  if (!hasApiPermission(userOrAccess, permission)) {
    throw new PermissionError(message, 403, "API_PERMISSION_DENIED");
  }
}

export function assertAnyApiPermission(
  userOrAccess,
  permissions,
  message = "当前账号没有执行该操作的权限"
) {
  if (!hasAnyPermissions(userOrAccess, permissions)) {
    throw new PermissionError(message, 403, "API_PERMISSION_DENIED");
  }
}

export function hasRoutePermission(userOrAccess, permission) {
  return hasAllPermissions(resolvePermissions(userOrAccess), [permission]);
}

export function hasMenuPermission(userOrAccess, permission) {
  return hasAllPermissions(resolvePermissions(userOrAccess), [permission]);
}

export function hasAnyPermissions(userOrAccess, permissions) {
  return hasAnyPermission(resolvePermissions(userOrAccess), permissions);
}

export function hasAdminPanelAccess(userOrAccess) {
  return hasAnyPermissions(userOrAccess, ADMIN_PANEL_PERMISSIONS);
}

export function isPrivilegedRole(role) {
  return isAdminRole(role);
}

export function assertCanAssignRole(actorRole, nextRole) {
  if (!canAssignRole(actorRole, nextRole)) {
    throw new PermissionError("当前角色不能分配目标角色", 403, "ROLE_ASSIGNMENT_FORBIDDEN");
  }
}

export function assertCanManageTargetRole(actorRole, targetRole) {
  if (!canManageRole(actorRole, targetRole)) {
    throw new PermissionError("当前角色不能管理目标角色", 403, "ROLE_MANAGEMENT_FORBIDDEN");
  }
}

function resolvePermissions(userOrAccess) {
  if (!userOrAccess) {
    return [];
  }

  if (Array.isArray(userOrAccess)) {
    return userOrAccess;
  }

  if (Array.isArray(userOrAccess.permissions)) {
    return userOrAccess.permissions;
  }

  if (Array.isArray(userOrAccess.access?.permissions)) {
    return userOrAccess.access.permissions;
  }

  return buildAccessProfile(userOrAccess.role).permissions;
}
