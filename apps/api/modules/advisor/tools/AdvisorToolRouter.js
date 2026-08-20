import {
  buildAdvisorQueryScope,
  pickMajorKeyword,
  pickUniversityKeyword,
  resolveRankWindow
} from "./advisorScope.js";

export class AdvisorToolRouter {
  constructor({ entityResolver, getDataEngine }) {
    this.entityResolver = entityResolver;
    this.getDataEngine = getDataEngine;
  }

  execute({
    executionPlan = null,
    contextPacket = null,
    memorySnapshot = null,
    payload = null
  } = {}) {
    const scope = buildAdvisorQueryScope({ contextPacket, memorySnapshot, payload });
    const entities = this.entityResolver
      ? this.entityResolver.resolve({ scope, contextPacket, memorySnapshot })
      : createEmptyEntities();
    const invocations = [];
    const evidence = {};
    const citations = [];

    for (const toolName of executionPlan?.plannedTools || []) {
      const result = executeSingleTool({
        router: this,
        toolName,
        scope,
        entities,
        contextPacket,
        memorySnapshot,
        intentKey: executionPlan?.primaryIntent || "general_follow_up"
      });

      if (!result) {
        continue;
      }

      invocations.push({
        toolName,
        ok: result.ok,
        itemCount: result.itemCount || 0
      });

      if (result.evidenceKey && result.payload !== undefined) {
        evidence[result.evidenceKey] = result.payload;
      }

      citations.push(...(result.citations || []));
    }

    return {
      version: "advisor-tool-router-v3",
      invocations,
      entities,
      evidence,
      citations,
      narrative: buildEvidenceNarrative({ entities, evidence, citations })
    };
  }
}

export function createAdvisorToolRouter(dependencies) {
  return new AdvisorToolRouter(dependencies);
}

function executeSingleTool({
  router,
  toolName,
  scope,
  entities,
  contextPacket,
  memorySnapshot,
  intentKey
}) {
  switch (toolName) {
    case "workspace_data":
      return buildWorkspaceDataEvidence({ contextPacket, entities, memorySnapshot });
    case "admission_database":
      return buildAdmissionEvidence({ router, scope, entities, intentKey });
    case "enrollment_plan_database":
      return buildEnrollmentPlanEvidence({ router, scope, entities, memorySnapshot });
    case "university_database":
      return buildUniversityEvidence({ router, scope, entities });
    case "major_database":
      return buildMajorEvidence({ router, scope, entities, memorySnapshot });
    case "policy_database":
      return buildPolicyEvidence({ router, scope, entities });
    case "employment_database":
      return buildEmploymentEvidence({ router, scope, entities, memorySnapshot });
    case "knowledge_base":
      return buildKnowledgeBaseEvidence({ contextPacket, memorySnapshot });
    default:
      return null;
  }
}

function buildWorkspaceDataEvidence({ contextPacket, entities, memorySnapshot }) {
  const profile = contextPacket?.profile || memorySnapshot?.profile || {};
  const workspace = contextPacket?.workspace || {};

  return {
    ok: true,
    evidenceKey: "workspaceData",
    payload: {
      profile,
      topPlanAnchors: {
        rush: toPlanAnchor(workspace?.topRush),
        steady: toPlanAnchor(workspace?.topSteady),
        safe: toPlanAnchor(workspace?.topSafe)
      },
      strategySummary: memorySnapshot?.workspace?.strategy || workspace?.summary?.strategy || "",
      conversationSummary: memorySnapshot?.conversationSummary || "",
      resolvedEntities: {
        universities: entities?.universities?.slice(0, 4) || [],
        majors: entities?.majors?.slice(0, 4) || [],
        comparison: entities?.comparison || createEmptyComparison(),
        policyTopics: entities?.policyTopics || []
      }
    },
    itemCount: 1,
    citations: [
      {
        sourceType: "workspace",
        label: "Current workspace profile and recommendation anchors"
      }
    ]
  };
}

function buildAdmissionEvidence({ router, scope, entities, intentKey }) {
  if (!scope.provinceCode || !scope.trackType || !scope.year || !scope.rank) {
    return skippedResult("admissionEvidence");
  }

  const engine = router.getDataEngine();
  const comparison = entities?.comparison || createEmptyComparison();
  let rows;

  if (comparison.active && comparison.universities.length >= 2) {
    rows = comparison.universities.flatMap((item) =>
      buildUniversityHistoryEvidence({
        engine,
        universityId: item.id,
        universityName: item.name,
        provinceCode: scope.provinceCode,
        year: scope.year,
        trackType: scope.trackType
      })
    );
  } else if (comparison.active && comparison.majors.length >= 2) {
    rows = comparison.majors.flatMap((item) =>
      buildMajorHistoryEvidence({
        engine,
        majorId: item.id,
        majorName: item.name,
        provinceCode: scope.provinceCode,
        year: scope.year,
        trackType: scope.trackType
      })
    );
  } else {
    const { rankMin, rankMax } = resolveRankWindow(scope.rank, intentKey);
    rows = engine.facade.buildAdmissionEvidence({
      provinceCode: scope.provinceCode,
      year: scope.year,
      trackType: scope.trackType,
      rankMin,
      rankMax,
      limit: 12
    });

    if (!rows.length && entities?.primaryUniversity?.id) {
      rows = buildUniversityHistoryEvidence({
        engine,
        universityId: entities.primaryUniversity.id,
        universityName: entities.primaryUniversity.name,
        provinceCode: scope.provinceCode,
        year: scope.year,
        trackType: scope.trackType
      });
    }

    if (!rows.length && entities?.primaryMajor?.id) {
      rows = buildMajorHistoryEvidence({
        engine,
        majorId: entities.primaryMajor.id,
        majorName: entities.primaryMajor.name,
        provinceCode: scope.provinceCode,
        year: scope.year,
        trackType: scope.trackType
      });
    }
  }

  const payload = rows.slice(0, 12).map((item) => ({
    university: item.university_name,
    major: item.major_name,
    minRank: item.min_rank,
    minScore: item.min_score,
    year: item.year,
    batchCode: item.batch_code,
    subjectRequirement: item.subject_requirement || item.normalized_text || ""
  }));

  return {
    ok: true,
    evidenceKey: "admissionEvidence",
    payload: {
      comparison,
      items: payload
    },
    itemCount: payload.length,
    citations: payload.slice(0, 6).map((item) => ({
      sourceType: "admission_database",
      label: `${item.year} ${item.university} ${item.major} admission line`
    }))
  };
}

function buildEnrollmentPlanEvidence({ router, scope, entities, memorySnapshot }) {
  if (!scope.provinceCode || !scope.trackType || !scope.year) {
    return skippedResult("planEvidence");
  }

  const engine = router.getDataEngine();
  const comparison = entities?.comparison || createEmptyComparison();
  let rows;

  if (comparison.active && comparison.universities.length >= 2) {
    rows = comparison.universities.flatMap((item) =>
      item.id
        ? engine.services.planQuery.getCurrentPlansByUniversity({
            provinceCode: scope.provinceCode,
            year: scope.year,
            universityId: item.id,
            limit: 8
          })
        : []
    );
  } else {
    const keyword =
      entities?.primaryUniversity?.name ||
      entities?.primaryMajor?.name ||
      pickUniversityKeyword(scope) ||
      pickMajorKeyword(scope, memorySnapshot);

    rows = engine.facade.buildEligiblePlans({
      provinceCode: scope.provinceCode,
      year: scope.year,
      trackType: scope.trackType,
      keyword,
      batchCode: "undergraduate_batch"
    });

    if (!rows.length && entities?.primaryUniversity?.id) {
      rows = engine.services.planQuery.getCurrentPlansByUniversity({
        provinceCode: scope.provinceCode,
        year: scope.year,
        universityId: entities.primaryUniversity.id,
        limit: 12
      });
    }
  }

  const payload = rows.slice(0, 12).map((item) => ({
    university: item.university_name,
    major: item.major_name,
    planCount: item.plan_count,
    tuitionFee: item.tuition_fee,
    subjectRequirement: item.normalized_text || item.subject_requirement || "",
    batchCode: item.batch_code,
    year: item.year
  }));

  return {
    ok: true,
    evidenceKey: "planEvidence",
    payload: {
      comparison,
      items: payload
    },
    itemCount: payload.length,
    citations: payload.slice(0, 6).map((item) => ({
      sourceType: "enrollment_plan_database",
      label: `${item.year} ${item.university} enrollment plan`
    }))
  };
}

function buildUniversityEvidence({ router, scope, entities }) {
  const engine = router.getDataEngine();
  const comparison = entities?.comparison || createEmptyComparison();

  if (comparison.active && comparison.universities.length >= 2) {
    const targets = comparison.universities
      .map((item) => buildUniversitySnapshotPayload({ engine, scope, target: item }))
      .filter(Boolean);

    return {
      ok: true,
      evidenceKey: "universityEvidence",
      payload: {
        comparison,
        targets
      },
      itemCount: targets.length,
      citations: targets.flatMap((item) => [
        {
          sourceType: "university_database",
          label: `${item.university.name} university profile`
        },
        ...item.history.slice(0, 2).map((historyItem) => ({
          sourceType: "admission_database",
          label: `${historyItem.year} ${item.university.name} ${historyItem.major} admission line`
        }))
      ])
    };
  }

  const target =
    entities?.primaryUniversity ||
    engine.services.universityQuery.searchUniversities({
      keyword: pickUniversityKeyword(scope),
      provinceCode: scope.provinceCode,
      limit: 3
    })[0];

  const payload = buildUniversitySnapshotPayload({ engine, scope, target });
  if (!payload) {
    return skippedResult("universityEvidence");
  }

  return {
    ok: true,
    evidenceKey: "universityEvidence",
    payload,
    itemCount: payload.history.length + 1,
    citations: [
      {
        sourceType: "university_database",
        label: `${payload.university.name} university profile`
      },
      ...payload.history.slice(0, 3).map((item) => ({
        sourceType: "admission_database",
        label: `${item.year} ${payload.university.name} ${item.major} admission line`
      }))
    ]
  };
}

function buildMajorEvidence({ router, scope, entities, memorySnapshot }) {
  const engine = router.getDataEngine();
  const comparison = entities?.comparison || createEmptyComparison();
  const comparisonSupport =
    comparison.active && comparison.majors.length >= 2
      ? buildMajorComparisonSupport({ engine, scope, entities, majors: comparison.majors })
      : null;

  if (comparison.active && comparison.majors.length >= 2) {
    const targets = comparison.majors
      .map((item) => buildMajorSnapshotPayload({ engine, scope, target: item }))
      .filter(Boolean);

    return {
      ok: true,
      evidenceKey: "majorEvidence",
      payload: {
        comparison,
        targets,
        comparisonSupport
      },
      itemCount:
        targets.length +
        (comparisonSupport?.historicalMatches?.length || 0) +
        (comparisonSupport?.anchorPlans?.length || 0),
      citations: targets
        .flatMap((item) => [
          {
            sourceType: "major_database",
            label: `${item.major.name} major profile`
          },
          ...item.history.slice(0, 2).map((historyItem) => ({
            sourceType: "admission_database",
            label: `${historyItem.year} ${historyItem.university} ${item.major.name} admission line`
          }))
        ])
        .concat(buildMajorSupportCitations(comparisonSupport))
    };
  }

  const target =
    entities?.primaryMajor ||
    engine.services.majorQuery.searchMajors({
      keyword: pickMajorKeyword(scope, memorySnapshot),
      limit: 3
    })[0];

  const payload = buildMajorSnapshotPayload({ engine, scope, target });
  if (!payload) {
    return skippedResult("majorEvidence");
  }
  const singleSupport = !target?.id
    ? buildMajorComparisonSupport({
        engine,
        scope,
        entities,
        majors: [target]
      })
    : null;

  return {
    ok: true,
    evidenceKey: "majorEvidence",
    payload: {
      ...payload,
      comparisonSupport: singleSupport
    },
    itemCount:
      payload.history.length +
      1 +
      (singleSupport?.historicalMatches?.length || 0) +
      (singleSupport?.anchorPlans?.length || 0),
    citations: [
      {
        sourceType: "major_database",
        label: `${payload.major.name} major profile`
      },
      ...payload.history.slice(0, 3).map((item) => ({
        sourceType: "admission_database",
        label: `${item.year} ${item.university} ${payload.major.name} admission line`
      })),
      ...buildMajorSupportCitations(singleSupport)
    ]
  };
}

function buildPolicyEvidence({ router, scope, entities }) {
  if (!scope.provinceCode || !scope.year) {
    return skippedResult("policyEvidence");
  }

  const engine = router.getDataEngine();
  const rules = engine.services.policyQuery.getProvinceVolunteerRules({
    provinceCode: scope.provinceCode,
    year: scope.year,
    batchCode: "undergraduate_batch"
  });
  const policies = engine.services.policyQuery.getProvincePolicySummary({
    provinceCode: scope.provinceCode,
    year: scope.year,
    limit: 6
  });

  return {
    ok: true,
    evidenceKey: "policyEvidence",
    payload: {
      topics: entities?.policyTopics || [],
      volunteerRules: rules.slice(0, 6),
      policies: policies.slice(0, 6)
    },
    itemCount: Math.min(6, rules.length) + Math.min(6, policies.length),
    citations: [
      {
        sourceType: "policy_database",
        label: `${scope.year} ${scope.province} volunteer policy`
      }
    ]
  };
}

function buildEmploymentEvidence({ router, scope, entities, memorySnapshot }) {
  const majorResult = buildMajorEvidence({ router, scope, entities, memorySnapshot });
  if (!majorResult?.ok || !majorResult?.payload) {
    return skippedResult("employmentEvidence");
  }

  if (majorResult.payload.targets) {
    return {
      ok: true,
      evidenceKey: "employmentEvidence",
      payload: {
        comparison: majorResult.payload.comparison,
        targets: majorResult.payload.targets.map((item) => ({
          major: item.major.name,
          careerPaths: item.major.careerPaths || [],
          postgraduateDirections: item.major.postgraduateDirections || []
        }))
      },
      itemCount: majorResult.payload.targets.length,
      citations: majorResult.payload.targets.map((item) => ({
        sourceType: "employment_database",
        label: `${item.major.name} employment and postgraduate directions`
      }))
    };
  }

  return {
    ok: true,
    evidenceKey: "employmentEvidence",
    payload: {
      major: majorResult.payload.major.name,
      careerPaths: majorResult.payload.major.careerPaths || [],
      postgraduateDirections: majorResult.payload.major.postgraduateDirections || []
    },
    itemCount:
      (majorResult.payload.major.careerPaths || []).length +
      (majorResult.payload.major.postgraduateDirections || []).length,
    citations: [
      {
        sourceType: "employment_database",
        label: `${majorResult.payload.major.name} employment and postgraduate directions`
      }
    ]
  };
}

function buildKnowledgeBaseEvidence({ contextPacket, memorySnapshot }) {
  const payload = {
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

  return {
    ok: true,
    evidenceKey: "knowledgeEvidence",
    payload,
    itemCount: Object.values(payload).filter((item) => (Array.isArray(item) ? item.length : item))
      .length,
    citations: [
      {
        sourceType: "knowledge_base",
        label: "Current plan summary and diagnosis"
      }
    ]
  };
}

function buildEvidenceNarrative({ entities, evidence, citations }) {
  const blocks = [];

  blocks.push(
    `Resolved Entities:\n${JSON.stringify(
      {
        universities: entities?.universities?.slice(0, 4) || [],
        majors: entities?.majors?.slice(0, 4) || [],
        comparison: entities?.comparison || createEmptyComparison(),
        policyTopics: entities?.policyTopics || []
      },
      null,
      2
    )}`
  );

  if (evidence.workspaceData) {
    blocks.push(`Workspace Evidence:\n${JSON.stringify(evidence.workspaceData, null, 2)}`);
  }
  if (evidence.admissionEvidence) {
    blocks.push(`Admission Evidence:\n${JSON.stringify(evidence.admissionEvidence, null, 2)}`);
  }
  if (evidence.planEvidence) {
    blocks.push(`Enrollment Plan Evidence:\n${JSON.stringify(evidence.planEvidence, null, 2)}`);
  }
  if (evidence.universityEvidence) {
    blocks.push(`University Evidence:\n${JSON.stringify(evidence.universityEvidence, null, 2)}`);
  }
  if (evidence.majorEvidence) {
    blocks.push(`Major Evidence:\n${JSON.stringify(evidence.majorEvidence, null, 2)}`);
  }
  if (evidence.policyEvidence) {
    blocks.push(`Policy Evidence:\n${JSON.stringify(evidence.policyEvidence, null, 2)}`);
  }
  if (evidence.employmentEvidence) {
    blocks.push(`Employment Evidence:\n${JSON.stringify(evidence.employmentEvidence, null, 2)}`);
  }
  if (evidence.knowledgeEvidence) {
    blocks.push(`Knowledge Evidence:\n${JSON.stringify(evidence.knowledgeEvidence, null, 2)}`);
  }
  if (citations.length) {
    blocks.push(`Citations:\n${JSON.stringify(citations, null, 2)}`);
  }

  return blocks.join("\n\n");
}

function buildUniversityHistoryEvidence({
  engine,
  universityId,
  universityName,
  provinceCode,
  year,
  trackType
}) {
  if (!universityId) {
    return [];
  }

  const snapshot = engine.facade.buildUniversitySnapshot({
    universityId,
    provinceCode,
    year,
    trackType
  });

  return (snapshot?.history || []).map((item) => ({
    ...item,
    university_name: item.university_name || universityName
  }));
}

function buildMajorHistoryEvidence({ engine, majorId, majorName, provinceCode, year, trackType }) {
  if (!majorId) {
    return [];
  }

  const snapshot = engine.facade.buildMajorSnapshot({
    majorId,
    provinceCode,
    year,
    trackType
  });

  return (snapshot?.history || []).map((item) => ({
    ...item,
    major_name: item.major_name || majorName
  }));
}

function buildUniversitySnapshotPayload({ engine, scope, target }) {
  if (!target?.id) {
    return null;
  }

  const snapshot = engine.facade.buildUniversitySnapshot({
    universityId: target.id,
    provinceCode: scope.provinceCode,
    year: scope.year,
    trackType: scope.trackType
  });

  return {
    university: {
      id: target.id,
      name: target.name,
      city: target.city || target.city_name || target.city_code || "",
      provinceCode: target.provinceCode || target.province_code || "",
      level: summarizeUniversityLevel(target)
    },
    history: (snapshot?.history || []).slice(0, 6).map((item) => ({
      year: item.year,
      major: item.major_name,
      minRank: item.min_rank,
      minScore: item.min_score,
      subjectRequirement: item.subject_requirement || item.normalized_text || ""
    }))
  };
}

function buildMajorSnapshotPayload({ engine, scope, target }) {
  if (!target) {
    return null;
  }

  const snapshot = target.id
    ? engine.facade.buildMajorSnapshot({
        majorId: target.id,
        provinceCode: scope.provinceCode,
        year: scope.year,
        trackType: scope.trackType
      })
    : null;
  const majorProfile = snapshot?.major || target;

  return {
    major: {
      id: target.id || null,
      name: target.name || target.major_name_zh,
      category: target.category || target.discipline_category || "",
      degreeType: target.degreeType || target.degree_type || "",
      evidenceLevel: target.id ? "hard" : "soft",
      evidenceNote: target.id
        ? ""
        : "Current admissions data is still grouped by professional-group records, so this major is being compared with soft major mapping plus live plan anchors.",
      careerPaths: Array.isArray(majorProfile.careerPaths)
        ? majorProfile.careerPaths.slice(0, 4)
        : [],
      postgraduateDirections: Array.isArray(majorProfile.postgraduateDirections)
        ? majorProfile.postgraduateDirections.slice(0, 4)
        : []
    },
    history: (snapshot?.history || []).slice(0, 6).map((item) => ({
      year: item.year,
      university: item.university_name,
      minRank: item.min_rank,
      minScore: item.min_score,
      subjectRequirement: item.subject_requirement || item.normalized_text || ""
    }))
  };
}

function buildMajorComparisonSupport({ engine, scope, entities, majors = [] }) {
  const anchorUniversities = resolveAnchorUniversities({ engine, scope, entities });
  const historicalMatches = [];

  anchorUniversities.forEach((university) => {
    majors.forEach((major) => {
      const match = engine.repositories.admission.findBestHistoricalMatch({
        provinceCode: scope.provinceCode,
        trackType: scope.trackType,
        universityName: university.name || university.name_zh,
        majorName: major.name
      });

      if (match) {
        historicalMatches.push({
          university: match.university_name,
          major: major.name,
          matchedMajor: match.major_name,
          year: match.year,
          minRank: match.min_rank,
          minScore: match.min_score,
          subjectRequirement: match.subject_requirement || match.normalized_text || ""
        });
      }
    });
  });

  const anchorPlans = anchorUniversities.flatMap((university) =>
    engine.services.planQuery
      .getCurrentPlansByUniversity({
        provinceCode: scope.provinceCode,
        year: scope.year,
        universityId: university.id,
        limit: 4
      })
      .map((item) => ({
        university: item.university_name,
        major: item.major_name,
        planCount: item.plan_count,
        tuitionFee: item.tuition_fee,
        year: item.year,
        subjectRequirement: item.normalized_text || item.subject_requirement || ""
      }))
  );

  return {
    requestedMajors: majors.map((item) => item.name),
    anchorUniversities: anchorUniversities.map((item) => ({
      id: item.id,
      name: item.name || item.name_zh,
      level: summarizeUniversityLevel(item)
    })),
    historicalMatches: historicalMatches.slice(0, 8),
    anchorPlans: anchorPlans.slice(0, 8),
    dataMode: historicalMatches.length ? "mixed" : "group_only",
    note: historicalMatches.length
      ? "Some historical university-major matches were found and can be used as direct evidence."
      : "No one-to-one major admission line was found for the requested majors, so comparison should lean on major profiles plus current university plan anchors."
  };
}

function resolveAnchorUniversities({ engine, scope, entities }) {
  const explicit = (entities?.universities || []).filter((item) => item?.id && item.explicit);
  if (explicit.length) {
    return dedupeUniversityTargets(explicit).slice(0, 3);
  }

  const contextual = dedupeStrings([
    ...(scope?.workspaceAnchors?.universities || []),
    entities?.primaryUniversity?.name || ""
  ]);

  return contextual
    .map((name) => {
      const matches = engine.services.universityQuery.searchUniversities({
        keyword: name,
        provinceCode: scope?.provinceCode || undefined,
        limit: 3
      });

      return (
        matches.find((item) => String(item.name_zh || "").trim() === name) ||
        matches.find((item) => !/\(|医学院/.test(String(item.name_zh || ""))) ||
        matches[0] ||
        null
      );
    })
    .filter((item) => item?.id)
    .filter(
      (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
    )
    .slice(0, 3);
}

function buildMajorSupportCitations(support) {
  if (!support) {
    return [];
  }

  return [
    ...support.historicalMatches.slice(0, 4).map((item) => ({
      sourceType: "admission_database",
      label: `${item.year} ${item.university} ${item.matchedMajor} admission line`
    })),
    ...support.anchorPlans.slice(0, 4).map((item) => ({
      sourceType: "enrollment_plan_database",
      label: `${item.year} ${item.university} enrollment plan`
    }))
  ];
}

function dedupeUniversityTargets(items = []) {
  return items.filter(
    (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
  );
}

function dedupeStrings(values = []) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

function summarizeUniversityLevel(record) {
  const levels = [];
  if (record?.is_985) {
    levels.push("985");
  }
  if (record?.is_211) {
    levels.push("211");
  }
  if (record?.is_double_first_class) {
    levels.push("Double First Class");
  }
  return levels.join(" / ");
}

function toPlanAnchor(item) {
  if (!item) {
    return null;
  }

  return {
    university: item.university || "",
    major: item.major || "",
    city: item.city || ""
  };
}

function skippedResult(evidenceKey) {
  return {
    ok: false,
    evidenceKey,
    payload: null,
    itemCount: 0,
    citations: []
  };
}

function createEmptyEntities() {
  return {
    version: "disabled",
    universities: [],
    majors: [],
    policyTopics: [],
    comparison: createEmptyComparison(),
    primaryUniversity: null,
    secondaryUniversity: null,
    primaryMajor: null,
    secondaryMajor: null
  };
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
