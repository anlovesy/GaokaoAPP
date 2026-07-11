export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  USER: "user"
};

export const LEGACY_ROLE_ALIASES = {
  advisor: ROLES.TEACHER
};

export const PERMISSIONS = {
  api: {
    META_READ: "api.meta.read",
    AUTH_SESSION_READ_SELF: "api.auth.session.read.self",
    AUTH_SESSION_REVOKE_SELF: "api.auth.session.revoke.self",
    AUTH_LOG_READ_SELF: "api.auth.log.read.self",
    HISTORY_READ_SELF: "api.history.read.self",
    PLANNER_GENERATE: "api.planner.generate",
    ADVISOR_CHAT: "api.advisor.chat",
    USERS_READ: "api.users.read",
    USERS_CREATE: "api.users.create",
    USERS_ROLE_UPDATE: "api.users.role.update",
    USERS_PASSWORD_RESET: "api.users.password.reset",
    USERS_DELETE: "api.users.delete",
    IMPORT_UPLOAD: "api.import.upload"
  },
  route: {
    NAVIGATION: "route.navigation",
    WORKSPACE: "route.workspace",
    ADVISOR: "route.advisor",
    HISTORY: "route.history",
    ACCOUNT: "route.account",
    ADMIN_USERS: "route.admin.users"
  },
  menu: {
    ACCOUNT: "menu.account",
    HISTORY: "menu.history",
    ADMIN_USERS: "menu.admin.users",
    LOGOUT: "menu.logout"
  },
  resource: {
    SESSION_READ_SELF: "resource.session.read.self",
    SESSION_REVOKE_SELF: "resource.session.revoke.self",
    USER_READ: "resource.user.read",
    USER_CREATE: "resource.user.create",
    USER_UPDATE: "resource.user.update",
    USER_DELETE: "resource.user.delete",
    USER_MANAGE_ADMIN: "resource.user.manage.admin",
    USER_MANAGE_SUPER_ADMIN: "resource.user.manage.super_admin",
    IMPORT_UPLOAD: "resource.import.upload"
  },
  role: {
    ASSIGN_USER: "role.assign.user",
    ASSIGN_STUDENT: "role.assign.student",
    ASSIGN_TEACHER: "role.assign.teacher",
    ASSIGN_ADMIN: "role.assign.admin",
    ASSIGN_SUPER_ADMIN: "role.assign.super_admin"
  }
};

const BASE_MEMBER_PERMISSIONS = [
  PERMISSIONS.api.META_READ,
  PERMISSIONS.api.AUTH_SESSION_READ_SELF,
  PERMISSIONS.api.AUTH_SESSION_REVOKE_SELF,
  PERMISSIONS.api.AUTH_LOG_READ_SELF,
  PERMISSIONS.api.HISTORY_READ_SELF,
  PERMISSIONS.api.PLANNER_GENERATE,
  PERMISSIONS.api.ADVISOR_CHAT,
  PERMISSIONS.route.NAVIGATION,
  PERMISSIONS.route.WORKSPACE,
  PERMISSIONS.route.ADVISOR,
  PERMISSIONS.route.HISTORY,
  PERMISSIONS.route.ACCOUNT,
  PERMISSIONS.menu.ACCOUNT,
  PERMISSIONS.menu.HISTORY,
  PERMISSIONS.menu.LOGOUT,
  PERMISSIONS.resource.SESSION_READ_SELF,
  PERMISSIONS.resource.SESSION_REVOKE_SELF
];

export const ROLE_DEFINITIONS = {
  [ROLES.USER]: {
    id: ROLES.USER,
    label: "User",
    zhLabel: "成员",
    rank: 10,
    permissions: [...BASE_MEMBER_PERMISSIONS]
  },
  [ROLES.STUDENT]: {
    id: ROLES.STUDENT,
    label: "Student",
    zhLabel: "学生",
    rank: 20,
    inherits: [ROLES.USER],
    permissions: []
  },
  [ROLES.TEACHER]: {
    id: ROLES.TEACHER,
    label: "Teacher",
    zhLabel: "教师",
    rank: 40,
    inherits: [ROLES.USER],
    permissions: []
  },
  [ROLES.ADMIN]: {
    id: ROLES.ADMIN,
    label: "Admin",
    zhLabel: "管理员",
    rank: 80,
    inherits: [ROLES.TEACHER],
    permissions: [
      PERMISSIONS.api.USERS_READ,
      PERMISSIONS.api.USERS_CREATE,
      PERMISSIONS.api.USERS_ROLE_UPDATE,
      PERMISSIONS.api.USERS_PASSWORD_RESET,
      PERMISSIONS.api.USERS_DELETE,
      PERMISSIONS.api.IMPORT_UPLOAD,
      PERMISSIONS.route.ADMIN_USERS,
      PERMISSIONS.menu.ADMIN_USERS,
      PERMISSIONS.resource.USER_READ,
      PERMISSIONS.resource.USER_CREATE,
      PERMISSIONS.resource.USER_UPDATE,
      PERMISSIONS.resource.USER_DELETE,
      PERMISSIONS.resource.IMPORT_UPLOAD,
      PERMISSIONS.role.ASSIGN_USER,
      PERMISSIONS.role.ASSIGN_STUDENT,
      PERMISSIONS.role.ASSIGN_TEACHER
    ]
  },
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    zhLabel: "超级管理员",
    rank: 100,
    inherits: [ROLES.ADMIN],
    permissions: [
      PERMISSIONS.resource.USER_MANAGE_ADMIN,
      PERMISSIONS.resource.USER_MANAGE_SUPER_ADMIN,
      PERMISSIONS.role.ASSIGN_ADMIN,
      PERMISSIONS.role.ASSIGN_SUPER_ADMIN
    ]
  }
};

export const MANAGEABLE_ROLE_MATRIX = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.USER,
    ROLES.STUDENT,
    ROLES.TEACHER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  ],
  [ROLES.ADMIN]: [ROLES.USER, ROLES.STUDENT, ROLES.TEACHER],
  [ROLES.TEACHER]: [],
  [ROLES.STUDENT]: [],
  [ROLES.USER]: []
};

export function normalizeRole(role) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  if (LEGACY_ROLE_ALIASES[normalizedRole]) {
    return LEGACY_ROLE_ALIASES[normalizedRole];
  }

  return ROLE_DEFINITIONS[normalizedRole] ? normalizedRole : ROLES.USER;
}

export function getRoleDefinition(role) {
  return ROLE_DEFINITIONS[normalizeRole(role)];
}

export function getRolePermissions(role) {
  const visited = new Set();
  const permissions = new Set();

  function walk(roleId) {
    const normalizedRoleId = normalizeRole(roleId);
    if (visited.has(normalizedRoleId)) {
      return;
    }

    visited.add(normalizedRoleId);
    const definition = ROLE_DEFINITIONS[normalizedRoleId];
    if (!definition) {
      return;
    }

    (definition.inherits || []).forEach(walk);
    (definition.permissions || []).forEach((permission) => permissions.add(permission));
  }

  walk(role);
  return [...permissions];
}

export function getRoleRank(role) {
  return getRoleDefinition(role)?.rank || 0;
}

export function isAdminRole(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === ROLES.ADMIN || normalizedRole === ROLES.SUPER_ADMIN;
}

export function hasPermission(roleOrPermissions, permission) {
  const permissions = Array.isArray(roleOrPermissions)
    ? roleOrPermissions
    : getRolePermissions(roleOrPermissions);

  return permissions.includes(permission);
}

export function hasAnyPermission(roleOrPermissions, requiredPermissions = []) {
  return requiredPermissions.some((permission) => hasPermission(roleOrPermissions, permission));
}

export function hasAllPermissions(roleOrPermissions, requiredPermissions = []) {
  return requiredPermissions.every((permission) => hasPermission(roleOrPermissions, permission));
}

export function getManageableRoles(role) {
  return [...(MANAGEABLE_ROLE_MATRIX[normalizeRole(role)] || [])];
}

export function canAssignRole(actorRole, targetRole) {
  return getManageableRoles(actorRole).includes(normalizeRole(targetRole));
}

export function canManageRole(actorRole, targetRole) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (normalizedActorRole === ROLES.SUPER_ADMIN) {
    return true;
  }

  return getManageableRoles(normalizedActorRole).includes(normalizedTargetRole);
}

export function compareRolesByRank(leftRole, rightRole) {
  return getRoleRank(rightRole) - getRoleRank(leftRole);
}

export function buildAccessProfile(role, extraPermissions = []) {
  const normalizedRole = normalizeRole(role);
  const roleDefinition = getRoleDefinition(normalizedRole);
  const permissions = [...new Set([...getRolePermissions(normalizedRole), ...extraPermissions])];

  return {
    role: normalizedRole,
    roleLabel: roleDefinition.label,
    roleZhLabel: roleDefinition.zhLabel,
    rank: roleDefinition.rank,
    permissions,
    apiPermissions: permissions.filter((permission) => permission.startsWith("api.")),
    routePermissions: permissions.filter((permission) => permission.startsWith("route.")),
    menuPermissions: permissions.filter((permission) => permission.startsWith("menu.")),
    resourcePermissions: permissions.filter((permission) => permission.startsWith("resource.")),
    rolePermissions: permissions.filter((permission) => permission.startsWith("role.")),
    manageableRoles: getManageableRoles(normalizedRole)
  };
}

export function getRoleOptionList() {
  return Object.values(ROLE_DEFINITIONS)
    .slice()
    .sort((left, right) => right.rank - left.rank)
    .map((roleDefinition) => ({
      value: roleDefinition.id,
      label: roleDefinition.label,
      zhLabel: roleDefinition.zhLabel,
      rank: roleDefinition.rank
    }));
}
