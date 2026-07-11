import { requireAuthContext } from "../services/authService.js";
import { assertAnyApiPermission, buildUserAccessContext } from "../services/rbacService.js";

export function permissionGuard(requiredPermissions = [], options = {}) {
  return (request, response, next) => {
    try {
      const auth = requireAuthContext(request, response, { allowRefresh: options.allowRefresh !== false });
      const accessUser = buildUserAccessContext(auth.user);
      assertAnyApiPermission(accessUser, requiredPermissions, options.message);
      request.authContext = {
        ...auth,
        user: accessUser
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
