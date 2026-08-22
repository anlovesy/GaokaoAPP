import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  LEGACY_TO_TYPED_TOOL_NAME,
  TOOL_ERROR_CODES,
  buildAdvisorToolInput,
  createAdvisorToolDefinitions,
  createToolExecutor,
  createToolRegistry,
  defineTool,
  legacyToolOutputSchema,
  toolResultSchema
} from "../../apps/api/modules/advisor/index.js";

function createOutput({ ok = true, itemCount = 1, payload = { items: ["result"] } } = {}) {
  return {
    ok,
    evidenceKey: "testEvidence",
    payload,
    itemCount,
    citations: itemCount ? [{ sourceType: "test_source", label: "Test evidence" }] : []
  };
}

function createTestTool({
  name = "test_tool",
  inputSchema = z.object({ query: z.string().min(1) }),
  outputSchema = legacyToolOutputSchema,
  requiredPermissions = [],
  execute = async () => createOutput()
} = {}) {
  return defineTool({
    name,
    version: "1",
    description: "A test tool.",
    inputSchema,
    outputSchema,
    metadata: {
      category: "test",
      readOnly: true,
      requiredPermissions,
      evidencePolicy: "test",
      timeoutMs: 0,
      retryPolicy: { maxAttempts: 1 }
    },
    execute
  });
}

test("Tool Contract accepts valid definitions, inputs, outputs and internal results", () => {
  const tool = createTestTool();
  const inputResult = tool.inputSchema.safeParse({ query: "software engineering" });
  const outputResult = tool.outputSchema.safeParse(createOutput());
  const internalResult = toolResultSchema.safeParse({
    ok: true,
    status: "success",
    callId: "contract-call",
    tool: { name: tool.name, version: tool.version },
    data: outputResult.data.payload,
    evidence: outputResult.data.citations,
    error: null,
    metadata: {
      durationMs: 1,
      rowCount: 1,
      attempt: 1,
      truncated: false,
      limitations: [],
      legacyOk: true
    }
  });

  assert.equal(inputResult.success, true);
  assert.equal(outputResult.success, true);
  assert.equal(internalResult.success, true);
  assert.equal(Object.isFrozen(tool), true);
});

test("Tool Contract rejects invalid definitions", () => {
  assert.throws(
    () =>
      defineTool({
        name: "invalid_tool",
        version: "1",
        description: "Missing schemas and execute.",
        metadata: {}
      }),
    /inputSchema/
  );
});

test("Tool Contract schemas reject invalid inputs and outputs", () => {
  const tool = createTestTool();

  assert.equal(tool.inputSchema.safeParse({ query: "" }).success, false);
  assert.equal(
    tool.outputSchema.safeParse({
      ok: true,
      evidenceKey: "testEvidence",
      payload: {},
      itemCount: -1,
      citations: []
    }).success,
    false
  );
});

test("all eight Advisor tools expose typed names and accept their built inputs", () => {
  const definitions = createAdvisorToolDefinitions();
  const registry = createToolRegistry(definitions);
  const comparison = {
    active: false,
    type: "single",
    connector: "",
    universities: [],
    majors: []
  };
  const scope = {
    provinceCode: "GD",
    province: "广东",
    trackType: "physics",
    year: 2025,
    rank: 15000,
    workspaceAnchors: { universities: ["测试大学"], majors: ["软件工程"] }
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
    profile: { province: "广东", track: "物理", rank: 15000 },
    workspace: {
      topRush: { university: "测试大学", major: "软件工程" },
      topSteady: null,
      topSafe: null,
      summary: { strategy: "测试策略", overview: "测试概览", careerAdvice: "测试建议" },
      diagnosis: { topDirections: ["软件工程"] }
    }
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

  assert.equal(definitions.length, 8);

  for (const [legacyName, typedName] of Object.entries(LEGACY_TO_TYPED_TOOL_NAME)) {
    const tool = registry.get(typedName);
    const input = buildAdvisorToolInput({
      legacyName,
      scope,
      entities,
      contextPacket,
      memorySnapshot,
      intentKey: "school_recommendation"
    });

    assert.ok(tool, `${typedName} should be registered`);
    assert.equal(tool.metadata.legacyName, legacyName);
    assert.equal(
      tool.inputSchema.safeParse(input).success,
      true,
      `${typedName} input should parse`
    );
  }
});

test("Tool Registry registers, resolves, lists and exposes metadata", () => {
  const tool = createTestTool();
  const registry = createToolRegistry();

  assert.equal(registry.register(tool), tool);
  assert.equal(registry.has(tool.name), true);
  assert.equal(registry.get(tool.name), tool);
  assert.equal(registry.resolve(tool.name), tool);
  assert.deepEqual(registry.list(), [tool]);
  assert.deepEqual(registry.listMetadata(), [
    {
      name: tool.name,
      version: tool.version,
      description: tool.description,
      metadata: tool.metadata
    }
  ]);
  assert.equal(registry.get("missing_tool"), null);
  assert.equal(registry.resolve("missing_tool"), null);
});

test("Tool Registry rejects duplicate names", () => {
  const tool = createTestTool();
  const registry = createToolRegistry([tool]);

  assert.throws(() => registry.register(tool), /already registered/);
});

test("Tool Executor returns a validated success result", async () => {
  const tool = createTestTool();
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({
    toolName: tool.name,
    input: { query: "software engineering" },
    callId: "success-call"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
  assert.equal(result.callId, "success-call");
  assert.deepEqual(result.tool, { name: "test_tool", version: "1" });
  assert.deepEqual(result.data, { items: ["result"] });
  assert.equal(result.evidence.length, 1);
  assert.equal(result.error, null);
  assert.equal(result.metadata.rowCount, 1);
  assert.equal(result.metadata.attempt, 1);
  assert.equal(result.metadata.legacyOk, true);
});

test("Tool Executor represents a valid zero-row output as empty", async () => {
  const tool = createTestTool({ execute: async () => createOutput({ itemCount: 0, payload: {} }) });
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({ toolName: tool.name, input: { query: "none" } });

  assert.equal(result.ok, true);
  assert.equal(result.status, "empty");
  assert.equal(result.metadata.rowCount, 0);
  assert.equal(result.error, null);
});

test("Tool Executor normalizes execution errors without leaking exception details", async () => {
  const tool = createTestTool({
    execute: async () => {
      throw new Error("database-password-should-not-leak");
    }
  });
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({ toolName: tool.name, input: { query: "fail" } });

  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.equal(result.error.code, TOOL_ERROR_CODES.TOOL_EXECUTION_ERROR);
  assert.equal(result.error.message.includes("database-password"), false);
  assert.equal("stack" in result.error, false);
});

test("Tool Executor blocks invalid input before execute", async () => {
  let executionCount = 0;
  const tool = createTestTool({
    execute: async () => {
      executionCount += 1;
      return createOutput();
    }
  });
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({ toolName: tool.name, input: { query: "" } });

  assert.equal(result.error.code, TOOL_ERROR_CODES.INVALID_INPUT);
  assert.equal(executionCount, 0);
});

test("Tool Executor rejects unknown tools", async () => {
  const executor = createToolExecutor({ registry: createToolRegistry() });
  const result = await executor.execute({ toolName: "missing_tool", input: {} });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, TOOL_ERROR_CODES.UNKNOWN_TOOL);
  assert.deepEqual(result.tool, { name: "missing_tool", version: "unknown" });
});

test("Tool Executor enforces required permissions", async () => {
  let executionCount = 0;
  const tool = createTestTool({
    requiredPermissions: ["advisor:data:read"],
    execute: async () => {
      executionCount += 1;
      return createOutput();
    }
  });
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({
    toolName: tool.name,
    input: { query: "protected" },
    executionContext: { permissions: [] }
  });

  assert.equal(result.error.code, TOOL_ERROR_CODES.UNAUTHORIZED);
  assert.equal(executionCount, 0);
});

test("Tool Executor rejects invalid tool output", async () => {
  const tool = createTestTool({
    execute: async () => ({
      ok: true,
      evidenceKey: "testEvidence",
      payload: {},
      itemCount: -1,
      citations: []
    })
  });
  const executor = createToolExecutor({ registry: createToolRegistry([tool]) });
  const result = await executor.execute({ toolName: tool.name, input: { query: "invalid" } });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, TOOL_ERROR_CODES.INVALID_OUTPUT);
  assert.equal(result.data, null);
});
