import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  LEGACY_TO_TYPED_TOOL_NAME,
  buildAdvisorToolInput
} from "../tools/advisorToolDefinitions.js";
import { validateToolInvocation } from "./ToolInvocation.js";

export const ADVISOR_MODEL_TOOL_ALLOWLIST = Object.freeze([
  "get_workspace_context",
  "query_admission_records",
  "query_enrollment_plans",
  "get_university_snapshot",
  "get_major_snapshot",
  "query_policy_rules",
  "get_major_career_paths",
  "search_knowledge_base"
]);

export const MODEL_TOOL_SELECTION_BUDGET = Object.freeze({
  maxModelToolSelections: 1,
  maxToolCallsFromModel: 1
});

const modelSelectionSchema = z
  .object({
    tool: z.string().min(1).nullable(),
    input: z.record(z.unknown()).nullable().optional(),
    reason: z.string().min(1)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.tool && !value.input) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["input"],
        message: "Model-selected tools require input"
      });
    }
  });

export class AdvisorInvocationPlanner {
  constructor({
    registry,
    selectModelTool = null,
    modelSelectionEnabled = false,
    allowlist = ADVISOR_MODEL_TOOL_ALLOWLIST,
    modelSelectionTimeoutMs = resolveSelectionTimeoutMs(),
    createInvocationId = () => crypto.randomUUID()
  }) {
    this.registry = registry;
    this.selectModelTool = selectModelTool;
    this.modelSelectionEnabled = modelSelectionEnabled;
    this.allowlist = [...allowlist];
    this.modelSelectionTimeoutMs = modelSelectionTimeoutMs;
    this.createInvocationId = createInvocationId;
  }

  async plan({
    executionPlan = null,
    scope,
    entities,
    contextPacket = null,
    memorySnapshot = null,
    preferredProvider = "auto"
  } = {}) {
    const candidates = this.buildCandidates({
      scope,
      entities,
      contextPacket,
      memorySnapshot,
      intentKey: executionPlan?.primaryIntent || "general_follow_up"
    });
    const deterministicInvocations = this.buildDeterministicInvocations({
      executionPlan,
      candidates
    });

    if (!this.modelSelectionEnabled || !this.selectModelTool) {
      return deterministicPlan(deterministicInvocations, "disabled");
    }

    try {
      const modelResult = await withTimeout(
        this.selectModelTool({
          preferredProvider,
          timeoutMs: this.modelSelectionTimeoutMs,
          selectionContext: {
            primaryIntent: executionPlan?.primaryIntent || "general_follow_up",
            currentUserMessage: contextPacket?.currentUserMessage || "",
            tools: this.registry.getModelToolDefinitions({ allowlist: this.allowlist }),
            canonicalInputs: Object.fromEntries(
              [...candidates.entries()].map(([toolName, candidate]) => [toolName, candidate.input])
            ),
            budget: MODEL_TOOL_SELECTION_BUDGET
          }
        }),
        this.modelSelectionTimeoutMs
      );
      const rawSelection = typeof modelResult === "string" ? modelResult : modelResult?.text;
      if (!rawSelection) {
        return deterministicPlan(deterministicInvocations, "empty_model_response");
      }

      const selectionResult = parseModelSelection(rawSelection);
      if (!selectionResult.success) {
        return deterministicPlan(deterministicInvocations, selectionResult.reason);
      }

      if (!selectionResult.data.tool) {
        return deterministicPlan(deterministicInvocations, "model_selected_no_tool");
      }

      const canonical = candidates.get(selectionResult.data.tool);
      if (!canonical) {
        return deterministicPlan(deterministicInvocations, "tool_not_allowlisted");
      }

      const invocation = {
        invocationId: this.createInvocationId(),
        tool: selectionResult.data.tool,
        input: selectionResult.data.input,
        source: "model",
        reason: selectionResult.data.reason
      };
      const invocationResult = validateToolInvocation(invocation, {
        registry: this.registry,
        allowlist: this.allowlist
      });
      if (!invocationResult.success) {
        return deterministicPlan(deterministicInvocations, "invalid_model_invocation");
      }

      if (!isDeepStrictEqual(invocationResult.data.input, canonical.input)) {
        return deterministicPlan(deterministicInvocations, "non_canonical_model_input");
      }

      return {
        version: "advisor-invocation-planner-v1",
        mode: "model-assisted",
        invocations: [invocationResult.data],
        modelSelection: {
          status: "selected",
          fallbackReason: null,
          selectionsUsed: 1,
          toolCallsFromModel: 1
        }
      };
    } catch {
      return deterministicPlan(deterministicInvocations, "model_selection_failed");
    }
  }

  buildCandidates({ scope, entities, contextPacket, memorySnapshot, intentKey }) {
    const candidates = new Map();

    for (const toolName of this.allowlist) {
      const tool = this.registry.get(toolName);
      const legacyName = tool?.metadata?.legacyName;
      if (!tool || !tool.metadata.readOnly || !legacyName) {
        continue;
      }

      const input = buildAdvisorToolInput({
        legacyName,
        scope,
        entities,
        contextPacket,
        memorySnapshot,
        intentKey
      });
      const inputResult = tool.inputSchema.safeParse(input);
      if (inputResult.success) {
        candidates.set(toolName, { tool, input: inputResult.data });
      }
    }

    return candidates;
  }

  buildDeterministicInvocations({ executionPlan, candidates }) {
    return (executionPlan?.plannedTools || []).flatMap((legacyName) => {
      const toolName = LEGACY_TO_TYPED_TOOL_NAME[legacyName];
      const candidate = candidates.get(toolName);
      if (!candidate) {
        return [];
      }

      const invocation = {
        invocationId: this.createInvocationId(),
        tool: toolName,
        input: candidate.input,
        source: "deterministic",
        reason: `Deterministic recipe for ${executionPlan?.primaryIntent || "general_follow_up"}`
      };
      const result = validateToolInvocation(invocation, { registry: this.registry });
      return result.success ? [result.data] : [];
    });
  }
}

export function createAdvisorInvocationPlanner(dependencies) {
  return new AdvisorInvocationPlanner(dependencies);
}

function parseModelSelection(rawSelection) {
  let parsed;
  try {
    parsed = JSON.parse(rawSelection);
  } catch {
    return { success: false, reason: "invalid_model_json" };
  }

  const result = modelSelectionSchema.safeParse(parsed);
  return result.success ? result : { success: false, reason: "invalid_model_selection_shape" };
}

function deterministicPlan(invocations, fallbackReason) {
  return {
    version: "advisor-invocation-planner-v1",
    mode: "deterministic",
    invocations,
    modelSelection: {
      status: fallbackReason === "disabled" ? "disabled" : "fallback",
      fallbackReason,
      selectionsUsed: fallbackReason === "disabled" ? 0 : 1,
      toolCallsFromModel: 0
    }
  };
}

function resolveSelectionTimeoutMs() {
  const configured = Number(
    process.env.ADVISOR_MODEL_TOOL_SELECTION_TIMEOUT_MS || process.env.LLM_TIMEOUT_MS || 30000
  );
  return Number.isFinite(configured) && configured > 0 ? configured : 30000;
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Model tool selection timed out")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
