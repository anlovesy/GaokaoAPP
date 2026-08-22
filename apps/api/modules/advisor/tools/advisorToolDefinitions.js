import { z } from "zod";
import { defineTool, legacyToolOutputSchema } from "./ToolContract.js";
import { pickMajorKeyword, pickUniversityKeyword } from "./advisorScope.js";

const entitySchema = z.record(z.unknown());
const nullableEntitySchema = entitySchema.nullable();
const comparisonSchema = z
  .object({
    active: z.boolean(),
    type: z.string(),
    universities: z.array(entitySchema),
    majors: z.array(entitySchema)
  })
  .passthrough();

const queryScopeShape = {
  provinceCode: z.string().nullable(),
  trackType: z.string().nullable(),
  year: z.number().int().positive()
};

const toolSpecifications = [
  {
    legacyName: "workspace_data",
    name: "get_workspace_context",
    description: "Read the current candidate profile and recommendation workspace anchors.",
    evidenceKey: "workspaceData",
    category: "context",
    inputSchema: z.object({
      profile: entitySchema,
      workspace: z
        .object({
          topRush: z.unknown().nullable(),
          topSteady: z.unknown().nullable(),
          topSafe: z.unknown().nullable(),
          summary: z.unknown().nullable()
        })
        .passthrough(),
      strategySummary: z.string(),
      conversationSummary: z.string(),
      resolvedEntities: entitySchema
    })
  },
  {
    legacyName: "admission_database",
    name: "query_admission_records",
    description: "Query historical admission records for a candidate rank or resolved entity.",
    evidenceKey: "admissionEvidence",
    category: "admission",
    inputSchema: z.object({
      ...queryScopeShape,
      rank: z.number().min(0),
      intentKey: z.string().min(1),
      comparison: comparisonSchema,
      primaryUniversity: nullableEntitySchema,
      primaryMajor: nullableEntitySchema
    })
  },
  {
    legacyName: "enrollment_plan_database",
    name: "query_enrollment_plans",
    description: "Query enrollment plans, plan counts, tuition and subject requirements.",
    evidenceKey: "planEvidence",
    category: "enrollment",
    inputSchema: z.object({
      ...queryScopeShape,
      keyword: z.string(),
      comparison: comparisonSchema,
      primaryUniversity: nullableEntitySchema
    })
  },
  {
    legacyName: "university_database",
    name: "get_university_snapshot",
    description: "Get one or more university profiles with admission history.",
    evidenceKey: "universityEvidence",
    category: "university",
    inputSchema: z.object({
      ...queryScopeShape,
      keyword: z.string(),
      comparison: comparisonSchema,
      primaryUniversity: nullableEntitySchema
    })
  },
  {
    legacyName: "major_database",
    name: "get_major_snapshot",
    description: "Get one or more major profiles with admission and plan support.",
    evidenceKey: "majorEvidence",
    category: "major",
    inputSchema: createMajorInputSchema()
  },
  {
    legacyName: "policy_database",
    name: "query_policy_rules",
    description: "Query province policy and volunteer rules for the candidate scope.",
    evidenceKey: "policyEvidence",
    category: "policy",
    inputSchema: z.object({
      provinceCode: z.string().nullable(),
      year: z.number().int().positive(),
      province: z.string(),
      topics: z.array(z.string())
    })
  },
  {
    legacyName: "employment_database",
    name: "get_major_career_paths",
    description: "Read career and postgraduate directions stored on resolved major profiles.",
    evidenceKey: "employmentEvidence",
    category: "career",
    inputSchema: createMajorInputSchema()
  },
  {
    legacyName: "knowledge_base",
    name: "search_knowledge_base",
    description: "Read the current plan summary and diagnosis as local knowledge context.",
    evidenceKey: "knowledgeEvidence",
    category: "context",
    inputSchema: z.object({
      strategy: z.string(),
      overview: z.string(),
      careerAdvice: z.string(),
      topDirections: z.array(z.unknown())
    })
  }
];

export const LEGACY_TO_TYPED_TOOL_NAME = Object.freeze(
  Object.fromEntries(toolSpecifications.map((item) => [item.legacyName, item.name]))
);

const toolInputBuilders = {
  workspace_data({ entities, contextPacket, memorySnapshot }) {
    const workspace = contextPacket?.workspace || {};
    return {
      profile: contextPacket?.profile || memorySnapshot?.profile || {},
      workspace: {
        topRush: workspace.topRush || null,
        topSteady: workspace.topSteady || null,
        topSafe: workspace.topSafe || null,
        summary: workspace.summary || null
      },
      strategySummary: memorySnapshot?.workspace?.strategy || workspace?.summary?.strategy || "",
      conversationSummary: memorySnapshot?.conversationSummary || "",
      resolvedEntities: {
        universities: entities?.universities?.slice(0, 4) || [],
        majors: entities?.majors?.slice(0, 4) || [],
        comparison: entities?.comparison || createEmptyComparison(),
        policyTopics: entities?.policyTopics || []
      }
    };
  },
  admission_database({ scope, entities, intentKey }) {
    return {
      provinceCode: scope.provinceCode,
      trackType: scope.trackType,
      year: scope.year,
      rank: scope.rank,
      intentKey,
      comparison: entities?.comparison || createEmptyComparison(),
      primaryUniversity: entities?.primaryUniversity || null,
      primaryMajor: entities?.primaryMajor || null
    };
  },
  enrollment_plan_database({ scope, entities, memorySnapshot }) {
    return {
      provinceCode: scope.provinceCode,
      trackType: scope.trackType,
      year: scope.year,
      keyword:
        entities?.primaryUniversity?.name ||
        entities?.primaryMajor?.name ||
        pickUniversityKeyword(scope) ||
        pickMajorKeyword(scope, memorySnapshot),
      comparison: entities?.comparison || createEmptyComparison(),
      primaryUniversity: entities?.primaryUniversity || null
    };
  },
  university_database({ scope, entities }) {
    return {
      provinceCode: scope.provinceCode,
      trackType: scope.trackType,
      year: scope.year,
      keyword: pickUniversityKeyword(scope),
      comparison: entities?.comparison || createEmptyComparison(),
      primaryUniversity: entities?.primaryUniversity || null
    };
  },
  major_database(args) {
    return buildMajorInput(args);
  },
  policy_database({ scope, entities }) {
    return {
      provinceCode: scope.provinceCode,
      year: scope.year,
      province: scope.province,
      topics: entities?.policyTopics || []
    };
  },
  employment_database(args) {
    return buildMajorInput(args);
  },
  knowledge_base({ contextPacket, memorySnapshot }) {
    return {
      strategy:
        memorySnapshot?.workspace?.strategy || contextPacket?.workspace?.summary?.strategy || "",
      overview:
        memorySnapshot?.workspace?.overview || contextPacket?.workspace?.summary?.overview || "",
      careerAdvice:
        memorySnapshot?.workspace?.careerAdvice ||
        contextPacket?.workspace?.summary?.careerAdvice ||
        "",
      topDirections:
        memorySnapshot?.workspace?.topDirections ||
        contextPacket?.workspace?.diagnosis?.topDirections ||
        []
    };
  }
};

export function createAdvisorToolDefinitions() {
  return toolSpecifications.map((specification) =>
    defineTool({
      name: specification.name,
      version: "1",
      description: specification.description,
      inputSchema: specification.inputSchema,
      outputSchema: createLegacyOutputSchema(specification.evidenceKey),
      metadata: {
        category: specification.category,
        readOnly: true,
        requiredPermissions: [],
        evidencePolicy: "legacy-citations",
        timeoutMs: 0,
        retryPolicy: { maxAttempts: 1 },
        legacyName: specification.legacyName,
        legacyEvidenceKey: specification.evidenceKey
      },
      execute(input, executionContext) {
        return executionContext.executeLegacyTool({
          legacyName: specification.legacyName,
          input
        });
      }
    })
  );
}

export function buildAdvisorToolInput({
  legacyName,
  scope,
  entities,
  contextPacket,
  memorySnapshot,
  intentKey
}) {
  const builder = toolInputBuilders[legacyName];
  return builder ? builder({ scope, entities, contextPacket, memorySnapshot, intentKey }) : null;
}

export function toLegacyToolResult(internalResult, tool) {
  return {
    ok: internalResult.metadata.legacyOk,
    evidenceKey: tool.metadata.legacyEvidenceKey,
    payload: internalResult.data,
    itemCount: internalResult.metadata.rowCount,
    citations: internalResult.evidence.map((item) => ({
      sourceType: item.sourceType,
      label: item.label
    }))
  };
}

function createMajorInputSchema() {
  return z.object({
    ...queryScopeShape,
    keyword: z.string(),
    comparison: comparisonSchema,
    primaryMajor: nullableEntitySchema,
    universityCandidates: z.array(entitySchema),
    workspaceUniversityAnchors: z.array(z.string())
  });
}

function buildMajorInput({ scope, entities, memorySnapshot }) {
  return {
    provinceCode: scope.provinceCode,
    trackType: scope.trackType,
    year: scope.year,
    keyword: pickMajorKeyword(scope, memorySnapshot),
    comparison: entities?.comparison || createEmptyComparison(),
    primaryMajor: entities?.primaryMajor || null,
    universityCandidates: entities?.universities || [],
    workspaceUniversityAnchors: scope?.workspaceAnchors?.universities || []
  };
}

function createLegacyOutputSchema(evidenceKey) {
  return legacyToolOutputSchema.refine((value) => value.evidenceKey === evidenceKey, {
    message: `Expected evidenceKey ${evidenceKey}`,
    path: ["evidenceKey"]
  });
}

function createEmptyComparison() {
  return {
    active: false,
    type: "single",
    connector: "",
    universities: [],
    majors: []
  };
}
