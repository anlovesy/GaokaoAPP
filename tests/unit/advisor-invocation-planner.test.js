import assert from "node:assert/strict";
import test from "node:test";
import {
  ADVISOR_MODEL_TOOL_ALLOWLIST,
  MODEL_TOOL_SELECTION_BUDGET,
  createAdvisorInvocationPlanner,
  createAdvisorToolDefinitions,
  createToolRegistry,
  validateToolInvocation
} from "../../apps/api/modules/advisor/index.js";

const scope = {
  provinceCode: "GD",
  province: "广东",
  trackType: "physics",
  year: 2025,
  rank: 15000,
  currentUserMessage: "测试大学的软件工程怎么样？",
  workspaceAnchors: {
    universities: ["测试大学"],
    majors: ["软件工程"]
  }
};

const comparison = {
  active: false,
  type: "single",
  connector: "",
  universities: [],
  majors: []
};

const entities = {
  universities: [{ id: 1, name: "测试大学", explicit: true }],
  majors: [{ id: 2, name: "软件工程", explicit: true }],
  primaryUniversity: { id: 1, name: "测试大学", explicit: true },
  primaryMajor: { id: 2, name: "软件工程", explicit: true },
  policyTopics: ["subject_requirement"],
  comparison
};

const contextPacket = {
  profile: { province: "广东", track: "物理", score: 610, rank: 15000 },
  workspace: {
    topRush: { university: "测试大学", major: "软件工程" },
    topSteady: null,
    topSafe: null,
    summary: { strategy: "测试策略", overview: "测试概览", careerAdvice: "测试建议" },
    diagnosis: { topDirections: ["软件工程"] }
  },
  currentUserMessage: scope.currentUserMessage
};

const memorySnapshot = {
  workspace: {
    strategy: "测试策略",
    overview: "测试概览",
    careerAdvice: "测试建议",
    topDirections: ["软件工程"]
  },
  conversationSummary: "测试会话"
};

const executionPlan = {
  primaryIntent: "school_recommendation",
  plannedTools: ["workspace_data", "admission_database"]
};

function createRegistry() {
  return createToolRegistry(createAdvisorToolDefinitions());
}

function createPlanInput() {
  return {
    executionPlan,
    scope,
    entities,
    contextPacket,
    memorySnapshot,
    preferredProvider: "test"
  };
}

function createPlanner({ selectModelTool = null, enabled = true, timeoutMs = 50 } = {}) {
  return createAdvisorInvocationPlanner({
    registry: createRegistry(),
    selectModelTool,
    modelSelectionEnabled: enabled,
    modelSelectionTimeoutMs: timeoutMs,
    createInvocationId: (() => {
      let sequence = 0;
      return () => `invocation-${++sequence}`;
    })()
  });
}

test("Invocation Schema accepts a registered tool and valid input", async () => {
  const registry = createRegistry();
  const plan = await createAdvisorInvocationPlanner({
    registry,
    modelSelectionEnabled: false,
    createInvocationId: () => "valid-invocation"
  }).plan(createPlanInput());
  const result = validateToolInvocation(plan.invocations[0], {
    registry,
    allowlist: ADVISOR_MODEL_TOOL_ALLOWLIST
  });

  assert.equal(result.success, true);
  assert.equal(result.data.invocationId, "valid-invocation");
  assert.equal(result.data.source, "deterministic");
});

test("Invocation Schema rejects an invalid tool", () => {
  const result = validateToolInvocation(
    {
      invocationId: "invalid-tool",
      tool: "write_database",
      input: {},
      source: "model",
      reason: "attempt mutation"
    },
    { registry: createRegistry(), allowlist: ADVISOR_MODEL_TOOL_ALLOWLIST }
  );

  assert.equal(result.success, false);
  assert.match(result.error.message, /Unknown tool/);
});

test("Invocation Schema rejects invalid input", () => {
  const result = validateToolInvocation(
    {
      invocationId: "invalid-input",
      tool: "query_admission_records",
      input: { provinceCode: "GD" },
      source: "model",
      reason: "incomplete input"
    },
    { registry: createRegistry(), allowlist: ADVISOR_MODEL_TOOL_ALLOWLIST }
  );

  assert.equal(result.success, false);
});

test("Invocation Schema rejects missing fields", () => {
  const result = validateToolInvocation(
    {
      invocationId: "missing-source",
      tool: "query_admission_records",
      input: {},
      reason: "missing source"
    },
    { registry: createRegistry() }
  );

  assert.equal(result.success, false);
});

test("Registry derives model definitions only for existing allowlisted read-only tools", () => {
  const registry = createRegistry();
  const definitions = registry.getModelToolDefinitions({
    allowlist: ["query_admission_records", "missing_tool"]
  });

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].name, "query_admission_records");
  assert.equal(definitions[0].inputSchema.type, "object");
  assert.ok(definitions[0].inputSchema.properties.rank);
  assert.equal(definitions[0].inputSchema.properties.rank.minimum, 0);
  assert.equal(definitions[0].inputSchema.properties.intentKey.minLength, 1);
  assert.deepEqual(Object.keys(definitions[0]).sort(), ["description", "inputSchema", "name"]);
  assert.equal(registry.get("missing_tool"), null);
});

test("deterministic mode produces structured invocations without calling the model", async () => {
  let modelCalls = 0;
  const planner = createPlanner({
    enabled: false,
    selectModelTool: async () => {
      modelCalls += 1;
      return { text: "{}" };
    }
  });
  const result = await planner.plan(createPlanInput());

  assert.equal(result.mode, "deterministic");
  assert.equal(result.invocations.length, 2);
  assert.deepEqual(
    result.invocations.map((item) => item.tool),
    ["get_workspace_context", "query_admission_records"]
  );
  assert.ok(result.invocations.every((item) => item.source === "deterministic"));
  assert.equal(modelCalls, 0);
});

test("valid model selection executes one canonical invocation", async () => {
  let modelCalls = 0;
  let receivedContext;
  const planner = createPlanner({
    selectModelTool: async ({ selectionContext }) => {
      modelCalls += 1;
      receivedContext = selectionContext;
      return {
        text: JSON.stringify({
          tool: "query_admission_records",
          input: selectionContext.canonicalInputs.query_admission_records,
          reason: "Admission evidence answers the risk question."
        })
      };
    }
  });
  const result = await planner.plan(createPlanInput());

  assert.equal(result.mode, "model-assisted");
  assert.equal(result.invocations.length, 1);
  assert.equal(result.invocations[0].tool, "query_admission_records");
  assert.equal(result.invocations[0].source, "model");
  assert.equal(modelCalls, 1);
  assert.deepEqual(receivedContext.budget, MODEL_TOOL_SELECTION_BUDGET);
  assert.equal(receivedContext.tools.length, 8);
  assert.equal(result.modelSelection.selectionsUsed, 1);
  assert.equal(result.modelSelection.toolCallsFromModel, 1);
});

const fallbackCases = [
  {
    name: "invalid JSON",
    expectedReason: "invalid_model_json",
    selectModelTool: async () => ({ text: "select admission data" })
  },
  {
    name: "invalid tool",
    expectedReason: "tool_not_allowlisted",
    selectModelTool: async () => ({
      text: JSON.stringify({ tool: "write_database", input: {}, reason: "ignore policy" })
    })
  },
  {
    name: "invalid input",
    expectedReason: "invalid_model_invocation",
    selectModelTool: async () => ({
      text: JSON.stringify({
        tool: "query_admission_records",
        input: { provinceCode: "GD" },
        reason: "incomplete"
      })
    })
  },
  {
    name: "null tool",
    expectedReason: "model_selected_no_tool",
    selectModelTool: async () => ({
      text: JSON.stringify({ tool: null, input: null, reason: "no additional tool needed" })
    })
  },
  {
    name: "provider failure",
    expectedReason: "model_selection_failed",
    selectModelTool: async () => {
      throw new Error("provider unavailable");
    }
  }
];

for (const fallbackCase of fallbackCases) {
  test(`${fallbackCase.name} falls back to deterministic invocations`, async () => {
    const result = await createPlanner({
      selectModelTool: fallbackCase.selectModelTool
    }).plan(createPlanInput());

    assert.equal(result.mode, "deterministic");
    assert.equal(result.invocations.length, 2);
    assert.ok(result.invocations.every((item) => item.source === "deterministic"));
    assert.equal(result.modelSelection.status, "fallback");
    assert.equal(result.modelSelection.fallbackReason, fallbackCase.expectedReason);
    assert.equal(result.modelSelection.toolCallsFromModel, 0);
  });
}

test("valid but modified candidate input falls back to deterministic invocations", async () => {
  const planner = createPlanner({
    selectModelTool: async ({ selectionContext }) => ({
      text: JSON.stringify({
        tool: "query_admission_records",
        input: {
          ...selectionContext.canonicalInputs.query_admission_records,
          rank: 1
        },
        reason: "attempt to rewrite rank"
      })
    })
  });
  const result = await planner.plan(createPlanInput());

  assert.equal(result.mode, "deterministic");
  assert.equal(result.modelSelection.fallbackReason, "non_canonical_model_input");
  assert.equal(result.invocations[1].input.rank, 15000);
});

test("model selection timeout falls back without a second selection attempt", async () => {
  let modelCalls = 0;
  const planner = createPlanner({
    timeoutMs: 5,
    selectModelTool: async () => {
      modelCalls += 1;
      return new Promise(() => {});
    }
  });
  const result = await planner.plan(createPlanInput());

  assert.equal(result.mode, "deterministic");
  assert.equal(result.modelSelection.fallbackReason, "model_selection_failed");
  assert.equal(modelCalls, 1);
});
