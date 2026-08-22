import crypto from "node:crypto";
import { TOOL_ERROR_CODES, toolResultSchema } from "./ToolContract.js";

export class ToolExecutor {
  constructor({ registry }) {
    this.registry = registry;
  }

  async execute({ toolName, input, executionContext = {}, callId = crypto.randomUUID() }) {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return createErrorResult({
        callId,
        toolName,
        code: TOOL_ERROR_CODES.UNKNOWN_TOOL,
        message: `Unknown tool: ${toolName}`
      });
    }

    const inputResult = tool.inputSchema.safeParse(input);
    if (!inputResult.success) {
      return createErrorResult({
        callId,
        tool,
        code: TOOL_ERROR_CODES.INVALID_INPUT,
        message: inputResult.error.issues?.[0]?.message || "Tool input validation failed"
      });
    }

    if (!hasRequiredPermissions(tool, executionContext)) {
      return createErrorResult({
        callId,
        tool,
        code: TOOL_ERROR_CODES.UNAUTHORIZED,
        message: `Not authorized to execute tool: ${tool.name}`
      });
    }

    const startedAt = performance.now();
    let output;

    try {
      output = await tool.execute(inputResult.data, executionContext);
    } catch {
      return createErrorResult({
        callId,
        tool,
        code: TOOL_ERROR_CODES.TOOL_EXECUTION_ERROR,
        message: `Tool execution failed: ${tool.name}`,
        durationMs: performance.now() - startedAt
      });
    }

    const outputResult = tool.outputSchema.safeParse(output);
    if (!outputResult.success) {
      return createErrorResult({
        callId,
        tool,
        code: TOOL_ERROR_CODES.INVALID_OUTPUT,
        message: outputResult.error.issues?.[0]?.message || "Tool output validation failed",
        durationMs: performance.now() - startedAt
      });
    }

    const parsedOutput = outputResult.data;
    const status = resolveStatus(parsedOutput);
    return toolResultSchema.parse({
      ok: status !== "error",
      status,
      callId,
      tool: { name: tool.name, version: tool.version },
      data: parsedOutput.payload,
      evidence: parsedOutput.citations,
      error: null,
      metadata: {
        durationMs: performance.now() - startedAt,
        rowCount: parsedOutput.itemCount,
        attempt: 1,
        truncated: false,
        limitations: [],
        legacyOk: parsedOutput.ok
      }
    });
  }
}

export function createToolExecutor({ registry }) {
  return new ToolExecutor({ registry });
}

function hasRequiredPermissions(tool, executionContext) {
  const required = tool.metadata.requiredPermissions || [];
  if (!required.length) {
    return true;
  }

  const granted = new Set(executionContext.permissions || []);
  return required.every((permission) => granted.has(permission));
}

function resolveStatus(output) {
  if (!output.ok || output.payload === null || output.itemCount === 0) {
    return "empty";
  }

  return "success";
}

function createErrorResult({
  callId,
  tool = null,
  toolName = "unknown",
  code,
  message,
  durationMs = 0
}) {
  return toolResultSchema.parse({
    ok: false,
    status: "error",
    callId,
    tool: {
      name: tool?.name || toolName || "unknown",
      version: tool?.version || "unknown"
    },
    data: null,
    evidence: [],
    error: { code, message },
    metadata: {
      durationMs,
      rowCount: 0,
      attempt: 1,
      truncated: false,
      limitations: [],
      legacyOk: false
    }
  });
}
