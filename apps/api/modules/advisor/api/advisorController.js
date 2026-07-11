import { advisorChatSchema } from "./advisorSchemas.js";

export function createAdvisorController({
  runtime,
  resolveUsageAccess,
  isAdmin,
  handleApiError
}) {
  return async function advisorController(request, response) {
    try {
      const access = resolveUsageAccess(request, response, "chat");
      if (!access.allowed) {
        response.status(403).json({
          ok: false,
          error: access.message
        });
        return;
      }

      const payload = advisorChatSchema.parse(request.body);
      const result = await runtime.handleChatTurn({
        payload,
        access: {
          ...access,
          isAdmin: isAdmin(access.user)
        }
      });

      response.json({
        ok: true,
        data: result
      });
    } catch (error) {
      handleApiError(response, error, "顾问对话失败");
    }
  };
}
