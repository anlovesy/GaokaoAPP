import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdvisorPlanner,
  createAdvisorRuntime,
  createAdvisorToolRouter,
  createCitationFormatter,
  createContextBuilder,
  createIntentRecognizer,
  createMemoryEngine,
  createPersonaEngine,
  createAdvisorResponsePolicy,
  createReflectionEngine
} from "../../apps/api/modules/advisor/index.js";

const comparison = {
  active: false,
  type: "single",
  connector: "",
  universities: [],
  majors: []
};

const entities = {
  version: "entity-resolver-test",
  universities: [{ id: 1, name: "测试大学", explicit: true }],
  majors: [{ id: 2, name: "软件工程", explicit: true }],
  policyTopics: ["subject_requirement"],
  comparison,
  primaryUniversity: { id: 1, name: "测试大学", explicit: true },
  secondaryUniversity: null,
  primaryMajor: { id: 2, name: "软件工程", explicit: true },
  secondaryMajor: null
};

function createDataEngineStub() {
  return {
    facade: {
      buildAdmissionEvidence() {
        return [
          {
            university_name: "测试大学",
            major_name: "软件工程",
            min_rank: 12000,
            min_score: 600,
            year: 2025,
            batch_code: "undergraduate_batch",
            subject_requirement: "物理+化学"
          }
        ];
      },
      buildEligiblePlans() {
        return [
          {
            university_name: "测试大学",
            major_name: "软件工程",
            plan_count: 10,
            tuition_fee: 6850,
            normalized_text: "物理+化学",
            batch_code: "undergraduate_batch",
            year: 2025
          }
        ];
      },
      buildUniversitySnapshot() {
        return {
          history: [
            {
              year: 2025,
              major_name: "软件工程",
              min_rank: 12000,
              min_score: 600,
              subject_requirement: "物理+化学"
            }
          ]
        };
      },
      buildMajorSnapshot() {
        return {
          major: {
            careerPaths: ["软件开发"],
            postgraduateDirections: ["计算机科学与技术"]
          },
          history: [
            {
              year: 2025,
              university_name: "测试大学",
              min_rank: 12000,
              min_score: 600,
              subject_requirement: "物理+化学"
            }
          ]
        };
      }
    },
    services: {
      universityQuery: {
        searchUniversities() {
          return [{ id: 1, name_zh: "测试大学" }];
        }
      },
      majorQuery: {
        searchMajors() {
          return [{ id: 2, major_name_zh: "软件工程" }];
        }
      },
      planQuery: {
        getCurrentPlansByUniversity() {
          return [];
        }
      },
      policyQuery: {
        getProvinceVolunteerRules() {
          return [
            {
              province_code: "GD",
              year: 2025,
              batch_code: "undergraduate_batch",
              volunteer_mode: "parallel"
            }
          ];
        },
        getProvincePolicySummary() {
          return [
            {
              province_code: "GD",
              year: 2025,
              policy_type: "subject_requirement",
              title: "测试政策"
            }
          ];
        }
      }
    },
    repositories: {
      admission: {
        findBestHistoricalMatch() {
          return null;
        }
      }
    }
  };
}

function createRouter({ selectModelTool = null, modelToolSelectionEnabled = false } = {}) {
  const dataEngine = createDataEngineStub();
  return createAdvisorToolRouter({
    entityResolver: {
      resolve() {
        return entities;
      }
    },
    getDataEngine() {
      return dataEngine;
    },
    selectModelTool,
    modelToolSelectionEnabled
  });
}

function createExecutionInput(toolName) {
  return {
    executionPlan: {
      primaryIntent: toolName === "policy_database" ? "policy_consulting" : "school_recommendation",
      plannedTools: [toolName]
    },
    contextPacket: {
      profile: {
        province: "广东",
        track: "物理",
        score: 610,
        rank: 15000
      },
      workspace: {
        hasPlan: true,
        summary: {
          overview: "测试概览",
          strategy: "测试策略",
          careerAdvice: "测试职业建议"
        },
        diagnosis: { topDirections: ["软件工程"] },
        topRush: { university: "测试大学", major: "软件工程", city: "广州" },
        topSteady: null,
        topSafe: null
      },
      currentUserMessage: "测试大学的软件工程怎么样？"
    },
    memorySnapshot: {
      profile: { province: "广东", track: "物理", score: 610, rank: 15000 },
      preferences: { majorAnchors: ["软件工程"], directionLabels: ["软件工程"] },
      workspace: {
        strategy: "测试策略",
        overview: "测试概览",
        careerAdvice: "测试职业建议",
        topDirections: ["软件工程"]
      },
      conversationSummary: "测试会话摘要"
    },
    payload: {
      planningContext: { meta: { latestProvinceYear: 2025 } }
    }
  };
}

const toolExpectations = {
  workspace_data: { evidenceKey: "workspaceData", payloadKey: "profile" },
  admission_database: { evidenceKey: "admissionEvidence", payloadKey: "items" },
  enrollment_plan_database: { evidenceKey: "planEvidence", payloadKey: "items" },
  university_database: { evidenceKey: "universityEvidence", payloadKey: "university" },
  major_database: { evidenceKey: "majorEvidence", payloadKey: "major" },
  policy_database: { evidenceKey: "policyEvidence", payloadKey: "policies" },
  employment_database: { evidenceKey: "employmentEvidence", payloadKey: "major" },
  knowledge_base: { evidenceKey: "knowledgeEvidence", payloadKey: "strategy" }
};

for (const [toolName, expectation] of Object.entries(toolExpectations)) {
  test(`characterizes ${toolName}`, async () => {
    const result = await createRouter().execute(createExecutionInput(toolName));
    const invocation = result.invocations[0];
    const payload = result.evidence[expectation.evidenceKey];

    assert.equal(result.version, "advisor-tool-router-v3");
    assert.equal(invocation.toolName, toolName);
    assert.equal(invocation.ok, true);
    assert.equal(typeof invocation.itemCount, "number");
    assert.ok(payload);
    assert.ok(expectation.payloadKey in payload);
    assert.ok(result.citations.length >= 1);
    assert.equal(typeof result.narrative, "string");
  });
}

test("characterizes AdvisorRuntime planned tools and response metadata", async () => {
  const saved = [];
  const runtime = createAdvisorRuntime({
    loadLatestSession: () => null,
    loadChatHistory: () => [],
    citationFormatter: createCitationFormatter(),
    contextBuilder: createContextBuilder(),
    intentRecognizer: createIntentRecognizer(),
    memoryEngine: createMemoryEngine(),
    planner: createAdvisorPlanner(),
    personaEngine: createPersonaEngine(),
    responsePolicyEngine: createAdvisorResponsePolicy(),
    reflectionEngine: createReflectionEngine(),
    toolRouter: createRouter(),
    generateReply: async () => ({
      provider: "local",
      model: "local-fallback",
      reply: "先给判断：测试大学可以作为当前方案的比较锚点。"
    }),
    saveSessionHistory(value) {
      saved.push(value);
    },
    saveHistory(value) {
      saved.push(value);
    }
  });

  const result = await runtime.handleChatTurn({
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      sessionId: "characterization-session",
      planningContext: {
        profile: { province: "广东", track: "物理", score: 610, rank: 15000 },
        summary: { strategy: "测试策略" },
        applicationPlan: [
          { tierClass: "rush", schools: [{ university: "测试大学", major: "软件工程" }] }
        ],
        meta: { latestProvinceYear: 2025 }
      },
      messages: [{ role: "user", content: "测试大学怎么样？" }]
    },
    access: { user: { id: 1 }, isAdmin: false }
  });

  assert.deepEqual(result.meta.plannedTools, [
    "workspace_data",
    "admission_database",
    "enrollment_plan_database",
    "university_database"
  ]);
  assert.deepEqual(
    result.meta.toolInvocations.map((item) => item.toolName),
    result.meta.plannedTools
  );
  assert.equal(result.meta.toolRouterVersion, "advisor-tool-router-v3");
  assert.equal(result.meta.primaryIntent, "school_recommendation");
  assert.ok(Array.isArray(result.meta.citations));
  assert.ok(result.meta.reflection);
  assert.equal(saved.length, 1);
});

test("model-selected invocation still executes through the legacy-compatible Router", async () => {
  let modelCalls = 0;
  const router = createRouter({
    modelToolSelectionEnabled: true,
    selectModelTool: async ({ selectionContext }) => {
      modelCalls += 1;
      return {
        text: JSON.stringify({
          tool: "query_admission_records",
          input: selectionContext.canonicalInputs.query_admission_records,
          reason: "Use admission evidence."
        })
      };
    }
  });
  const result = await router.execute({
    ...createExecutionInput("admission_database"),
    executionPlan: {
      primaryIntent: "school_recommendation",
      plannedTools: ["workspace_data", "admission_database"]
    }
  });

  assert.equal(modelCalls, 1);
  assert.deepEqual(
    result.invocations.map((item) => item.toolName),
    ["admission_database"]
  );
  assert.ok(result.evidence.admissionEvidence);
  assert.equal(result.invocations[0].ok, true);
});
