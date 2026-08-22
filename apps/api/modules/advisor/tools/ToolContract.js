import { z } from "zod";

export const TOOL_STATUSES = ["success", "empty", "partial", "error"];

export const TOOL_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  UNKNOWN_TOOL: "UNKNOWN_TOOL",
  UNAUTHORIZED: "UNAUTHORIZED",
  TOOL_EXECUTION_ERROR: "TOOL_EXECUTION_ERROR",
  INVALID_OUTPUT: "INVALID_OUTPUT"
};

export const toolCitationSchema = z.object({
  sourceType: z.string().min(1),
  label: z.string().min(1)
});

export const legacyToolOutputSchema = z.object({
  ok: z.boolean(),
  evidenceKey: z.string().min(1),
  payload: z.unknown().nullable(),
  itemCount: z.number().int().min(0),
  citations: z.array(toolCitationSchema)
});

export const toolResultSchema = z.object({
  ok: z.boolean(),
  status: z.enum(TOOL_STATUSES),
  callId: z.string().min(1),
  tool: z.object({
    name: z.string().min(1),
    version: z.string().min(1)
  }),
  data: z.unknown().nullable(),
  evidence: z.array(
    z.object({
      sourceType: z.string().min(1),
      label: z.string().min(1)
    })
  ),
  error: z
    .object({
      code: z.enum(Object.values(TOOL_ERROR_CODES)),
      message: z.string().min(1)
    })
    .nullable(),
  metadata: z.object({
    durationMs: z.number().min(0),
    rowCount: z.number().int().min(0),
    attempt: z.number().int().min(1),
    truncated: z.boolean(),
    limitations: z.array(z.string()),
    legacyOk: z.boolean()
  })
});

export function defineTool(definition) {
  assertToolContract(definition);

  return Object.freeze({
    ...definition,
    metadata: Object.freeze({
      category: "advisor",
      readOnly: true,
      requiredPermissions: [],
      evidencePolicy: "optional",
      timeoutMs: 0,
      retryPolicy: { maxAttempts: 1 },
      ...definition.metadata
    })
  });
}

export function assertToolContract(definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError("Tool definition must be an object");
  }

  for (const field of ["name", "version", "description"]) {
    if (!String(definition[field] || "").trim()) {
      throw new TypeError(`Tool definition requires ${field}`);
    }
  }

  if (!isZodSchema(definition.inputSchema)) {
    throw new TypeError(`Tool ${definition.name} requires a Zod inputSchema`);
  }

  if (!isZodSchema(definition.outputSchema)) {
    throw new TypeError(`Tool ${definition.name} requires a Zod outputSchema`);
  }

  if (typeof definition.execute !== "function") {
    throw new TypeError(`Tool ${definition.name} requires execute()`);
  }

  if (!definition.metadata || typeof definition.metadata !== "object") {
    throw new TypeError(`Tool ${definition.name} requires metadata`);
  }

  return definition;
}

function isZodSchema(value) {
  return Boolean(
    value && typeof value.safeParse === "function" && typeof value.parse === "function"
  );
}
