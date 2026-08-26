import { z } from "zod";

export const TOOL_INVOCATION_SOURCES = ["deterministic", "model"];

export const ToolInvocationSchema = z
  .object({
    invocationId: z.string().min(1),
    tool: z.string().min(1),
    input: z.record(z.unknown()),
    source: z.enum(TOOL_INVOCATION_SOURCES),
    reason: z.string().min(1)
  })
  .strict();

export const toolInvocationSchema = ToolInvocationSchema;

export function validateToolInvocation(invocation, { registry, allowlist = null } = {}) {
  const invocationResult = toolInvocationSchema.safeParse(invocation);
  if (!invocationResult.success) {
    return invocationResult;
  }

  const tool = registry?.get(invocationResult.data.tool);
  if (!tool) {
    return failure(`Unknown tool: ${invocationResult.data.tool}`);
  }

  if (allowlist && !allowlist.includes(tool.name)) {
    return failure(`Tool is not allowlisted: ${tool.name}`);
  }

  const inputResult = tool.inputSchema.safeParse(invocationResult.data.input);
  if (!inputResult.success) {
    return inputResult;
  }

  return {
    success: true,
    data: {
      ...invocationResult.data,
      input: inputResult.data
    }
  };
}

function failure(message) {
  return {
    success: false,
    error: new Error(message)
  };
}
