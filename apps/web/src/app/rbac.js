import {
  PERMISSIONS,
  ROLES,
  canManageRole,
  compareRolesByRank,
  getRoleDefinition,
  getRoleOptionList,
  hasAllPermissions,
  normalizeRole
} from "../../../shared/rbac.js";
import {
  SCREEN_ACCOUNT,
  SCREEN_ADMIN_USERS,
  SCREEN_ADVISOR,
  SCREEN_HISTORY,
  SCREEN_NAVIGATION,
  SCREEN_UNIVERSITY,
  SCREEN_WORKSPACE
} from "./constants.js";

export { PERMISSIONS, ROLES, normalizeRole };

const SCREEN_PERMISSION_MAP = {
  [SCREEN_NAVIGATION]: PERMISSIONS.route.NAVIGATION,
  [SCREEN_WORKSPACE]: PERMISSIONS.route.WORKSPACE,
  [SCREEN_ADVISOR]: PERMISSIONS.route.ADVISOR,
  [SCREEN_HISTORY]: PERMISSIONS.route.HISTORY,
  [SCREEN_ACCOUNT]: PERMISSIONS.route.ACCOUNT,
  [SCREEN_ADMIN_USERS]: PERMISSIONS.route.ADMIN_USERS
};

const MENU_PERMISSION_MAP = {
  account: PERMISSIONS.menu.ACCOUNT,
  history: PERMISSIONS.menu.HISTORY,
  adminUsers: PERMISSIONS.menu.ADMIN_USERS,
  logout: PERMISSIONS.menu.LOGOUT
};

export function getUserPermissions(user) {
  if (Array.isArray(user?.permissions)) {
    return user.permissions;
  }

  if (Array.isArray(user?.access?.permissions)) {
    return user.access.permissions;
  }

  return [];
}

export function hasUserPermission(user, permission) {
  return hasAllPermissions(getUserPermissions(user), [permission]);
}

export function canAccessScreen(user, screen) {
  if (screen === SCREEN_UNIVERSITY) {
    return true;
  }

  const permission = SCREEN_PERMISSION_MAP[screen];
  return permission ? hasUserPermission(user, permission) : true;
}

export function canAccessMenu(user, menuKey) {
  const permission = MENU_PERMISSION_MAP[menuKey];
  return permission ? hasUserPermission(user, permission) : false;
}

export function canAccessAdminWorkspace(user) {
  return canAccessScreen(user, SCREEN_ADMIN_USERS);
}

export function canManageUser(actor, targetUser) {
  if (!actor || !targetUser) {
    return false;
  }

  return canManageRole(actor.role, targetUser.role);
}

export function getRoleDisplayName(role) {
  return getRoleDefinition(role)?.zhLabel || "成员";
}

export function getRoleDisplayTone(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLES.SUPER_ADMIN) {
    return "super";
  }

  if (normalizedRole === ROLES.ADMIN) {
    return "admin";
  }

  if (normalizedRole === ROLES.TEACHER) {
    return "teacher";
  }

  if (normalizedRole === ROLES.STUDENT) {
    return "student";
  }

  return "user";
}

export function getDefaultRoleOptions() {
  return getRoleOptionList();
}

export function sortUsersByRolePriority(userList = []) {
  return [...userList].sort((left, right) => {
    const roleCompare = compareRolesByRank(left.role, right.role);
    if (roleCompare !== 0) {
      return roleCompare;
    }

    return String(left.username || "").localeCompare(String(right.username || ""));
  });
}
