export class AdvisorResponsePolicy {
  build({
    advisorMode = "xuefeng",
    intentResult = null,
    executionPlan = null,
    toolExecution = null,
    contextPacket = null,
    memorySnapshot = null
  } = {}) {
    const primaryIntent = intentResult?.primaryIntent || "general_follow_up";
    const focus = resolveResponseFocus({ toolExecution, contextPacket, primaryIntent });
    const evidenceProfile = summarizeEvidenceProfile({
      toolExecution,
      executionPlan,
      contextPacket
    });
    const decisionFrame = resolveDecisionFrame({ memorySnapshot, contextPacket });
    const answerShape = buildAnswerShape({
      advisorMode,
      primaryIntent,
      executionPlan,
      focus,
      evidenceProfile,
      contextPacket,
      memorySnapshot,
      decisionFrame
    });

    return {
      version: "advisor-response-policy-v2",
      advisorMode,
      primaryIntent,
      focus,
      evidenceProfile,
      decisionFrame,
      answerShape,
      systemPrompt: buildSystemPrompt({
        advisorMode,
        focus,
        evidenceProfile,
        answerShape,
        decisionFrame
      }),
      narrative: buildNarrative({
        primaryIntent,
        focus,
        evidenceProfile,
        answerShape,
        contextPacket,
        decisionFrame
      })
    };
  }
}

export function createAdvisorResponsePolicy() {
  return new AdvisorResponsePolicy();
}

function resolveResponseFocus({ toolExecution, contextPacket, primaryIntent }) {
  const entities = toolExecution?.entities || {};
  const comparison = entities?.comparison || createEmptyComparison();
  const explicitUniversity = entities?.universities?.find((item) => item?.explicit) || null;
  const explicitMajor = entities?.majors?.find((item) => item?.explicit) || null;

  if (comparison.active) {
    const labels =
      comparison.type === "major"
        ? comparison.majors.map((item) => item.name).filter(Boolean)
        : comparison.universities.map((item) => item.name).filter(Boolean);

    return {
      type: "comparison",
      label: labels.join(" vs "),
      labels,
      comparisonType: comparison.type || "mixed"
    };
  }

  if (primaryIntent === "policy_consulting") {
    if (explicitMajor?.name) {
      return {
        type: "major",
        label: explicitMajor.name,
        labels: [explicitMajor.name]
      };
    }

    if (explicitUniversity?.name) {
      return {
        type: "university",
        label: explicitUniversity.name,
        labels: [explicitUniversity.name]
      };
    }

    if (Array.isArray(entities?.policyTopics) && entities.policyTopics.length) {
      return {
        type: "policy",
        label: entities.policyTopics.join(" / "),
        labels: [...entities.policyTopics]
      };
    }
  }

  if (entities?.primaryUniversity?.name) {
    return {
      type: "university",
      label: entities.primaryUniversity.name,
      labels: [entities.primaryUniversity.name]
    };
  }

  if (entities?.primaryMajor?.name) {
    return {
      type: "major",
      label: entities.primaryMajor.name,
      labels: [entities.primaryMajor.name]
    };
  }

  if (Array.isArray(entities?.policyTopics) && entities.policyTopics.length) {
    return {
      type: "policy",
      label: entities.policyTopics.join(" / "),
      labels: [...entities.policyTopics]
    };
  }

  const anchorLabel =
    contextPacket?.workspace?.topSteady?.university ||
    contextPacket?.workspace?.topRush?.university ||
    contextPacket?.workspace?.topSafe?.university ||
    "";

  return {
    type: primaryIntent === "policy_consulting" ? "policy" : "general",
    label: anchorLabel,
    labels: anchorLabel ? [anchorLabel] : []
  };
}

function summarizeEvidenceProfile({ toolExecution, executionPlan, contextPacket }) {
  const evidence = toolExecution?.evidence || {};
  const citationCount = Array.isArray(toolExecution?.citations) ? toolExecution.citations.length : 0;
  const sources = [];

  if (hasEvidence(evidence.workspaceData)) sources.push("workspace");
  if (hasEvidence(evidence.admissionEvidence)) sources.push("admission_database");
  if (hasEvidence(evidence.planEvidence)) sources.push("enrollment_plan_database");
  if (hasEvidence(evidence.universityEvidence)) sources.push("university_database");
  if (hasEvidence(evidence.majorEvidence)) sources.push("major_database");
  if (hasEvidence(evidence.policyEvidence)) sources.push("policy_database");
  if (hasEvidence(evidence.employmentEvidence)) sources.push("employment_database");
  if (hasEvidence(evidence.knowledgeEvidence)) sources.push("knowledge_base");

  const externalSources = sources.filter((item) => !["workspace", "knowledge_base"].includes(item));
  let strength = "weak";

  if (externalSources.length >= 2 || citationCount >= 4) {
    strength = "strong";
  } else if (externalSources.length >= 1 || contextPacket?.workspace?.hasPlan) {
    strength = "medium";
  }

  return {
    strength,
    sources,
    externalSources,
    citationCount,
    plannedTools: executionPlan?.plannedTools || []
  };
}

function resolveDecisionFrame({ memorySnapshot, contextPacket }) {
  const conversation = memorySnapshot?.conversation || {};
  const profile = memorySnapshot?.profile || contextPacket?.profile || {};

  return {
    stage: conversation.decisionStage || "",
    priorities: Array.isArray(conversation.priorityKeys) ? conversation.priorityKeys : [],
    openLoop: conversation.openLoop || "",
    profileConstraints: [
      profile.preferredCities ? `城市偏好 ${profile.preferredCities}` : "",
      profile.careerPlan ? `职业规划 ${profile.careerPlan}` : "",
      profile.maxTuition ? `学费上限 ${profile.maxTuition}` : "",
      profile.riskLabel ? `风险策略 ${profile.riskLabel}` : ""
    ]
      .filter(Boolean)
      .slice(0, 4)
  };
}

function buildAnswerShape({
  advisorMode,
  primaryIntent,
  executionPlan,
  focus,
  evidenceProfile,
  contextPacket,
  memorySnapshot,
  decisionFrame
}) {
  const missingFields = executionPlan?.clarificationNeeded ? executionPlan?.missingFields || [] : [];
  const effectiveMissingFields = missingFields.length
    ? missingFields
    : resolveMissingFieldsFromProfile({
        primaryIntent,
        profile: contextPacket?.profile || memorySnapshot?.profile || {}
      });

  return {
    mode: effectiveMissingFields.length ? "clarify" : "answer",
    namedEntityFirst:
      ["university", "major", "comparison", "policy"].includes(focus.type) && Boolean(focus.label),
    judgmentFirst: true,
    evidenceStrength: evidenceProfile.strength,
    maxQuestions: 2,
    missingFields: effectiveMissingFields,
    continueConversation: Boolean(decisionFrame.openLoop),
    style:
      advisorMode === "xuefeng"
        ? "direct-practical-data-first"
        : "calm-practical-data-first"
  };
}

function buildSystemPrompt({ advisorMode, focus, evidenceProfile, answerShape, decisionFrame }) {
  const lines = [
    "回答策略约束：",
    "1. 第一段先给判断，不要先铺垫，不要先安慰，不要先复述问题。",
    "2. 如果用户点名学校、专业、政策或做对比，第一句必须点名当前焦点对象。",
    "3. 回答要推进对话，不要把上一轮已经说过的话重新换皮再说一遍。",
    "4. 默认结构：结论 → 证据 → 风险边界 → 下一步。",
    "5. 有证据就引用证据，没有硬证据就明确说证据还不够，不准装作确定。",
    "6. 对学校、专业、录取、学费、政策、就业这类具体问题，优先基于数据和工作台上下文回答。",
    "7. 最多只追问 2 个最关键缺失信息，不要一次追问一长串。"
  ];

  if (advisorMode === "xuefeng") {
    lines.push("8. 风格要直接、现实、专业，重点看平台、就业出口、试错成本和普通家庭可承受性。");
    lines.push("9. 先看中位数结果，不要拿顶尖个例当普遍结论。");
    lines.push("10. 如果家庭预算、城市偏好、专业出口互相冲突，要直接指出冲突，不要模糊带过。");
  } else {
    lines.push("8. 风格要自然、可信、陪伴式，但不能空泛。");
  }

  if (focus?.label) {
    lines.push(`11. 当前回答焦点：${focus.label}`);
  }

  lines.push(`12. 当前证据强度：${evidenceProfile.strength}`);

  if (decisionFrame.stage) {
    lines.push(`13. 当前对话阶段：${mapDecisionStageLabel(decisionFrame.stage)}`);
  }

  if (decisionFrame.priorities?.length) {
    lines.push(`14. 用户当前真正权衡的重点：${decisionFrame.priorities.map(mapPriorityLabel).join("、")}`);
  }

  if (decisionFrame.profileConstraints?.length) {
    lines.push(`15. 回答时要记住这些现实约束：${decisionFrame.profileConstraints.join("；")}`);
  }

  if (decisionFrame.openLoop) {
    lines.push(`16. 当前待推进问题：${decisionFrame.openLoop}`);
  }

  if (answerShape.mode === "clarify") {
    lines.push(
      `17. 当前先不要拍板，先补齐这几个硬条件中的最多两个：${answerShape.missingFields
        .slice(0, 2)
        .join("、")}`
    );
  }

  return lines.join("\n");
}

function buildNarrative({
  primaryIntent,
  focus,
  evidenceProfile,
  answerShape,
  contextPacket,
  decisionFrame
}) {
  const profile = contextPacket?.profile || {};

  return [
    "Advisor Response Policy:",
    `- primary_intent: ${primaryIntent}`,
    `- focus_type: ${focus.type}`,
    `- focus_label: ${focus.label || "none"}`,
    `- answer_mode: ${answerShape.mode}`,
    `- judgment_first: ${answerShape.judgmentFirst ? "yes" : "no"}`,
    `- named_entity_first: ${answerShape.namedEntityFirst ? "yes" : "no"}`,
    `- evidence_strength: ${evidenceProfile.strength}`,
    `- evidence_sources: ${(evidenceProfile.sources || []).join(", ") || "none"}`,
    `- decision_stage: ${decisionFrame.stage || "unknown"}`,
    `- decision_priorities: ${(decisionFrame.priorities || []).join(", ") || "none"}`,
    `- open_loop: ${decisionFrame.openLoop || "none"}`,
    `- candidate_anchor: ${[
      profile.province,
      profile.track,
      profile.score ? `${profile.score}分` : "",
      profile.rank ? `位次${profile.rank}` : ""
    ]
      .filter(Boolean)
      .join(" | ") || "unknown"}`,
    answerShape.mode === "clarify"
      ? `- missing_fields: ${answerShape.missingFields.join(", ")}`
      : "- missing_fields: none",
    "- response_contract: conclusion first, evidence second, risk boundary third, next step last"
  ].join("\n");
}

function resolveMissingFieldsFromProfile({ primaryIntent, profile }) {
  const fields =
    primaryIntent === "policy_consulting"
      ? ["province", "track"]
      : ["school_recommendation", "major_recommendation", "risk_analysis"].includes(primaryIntent)
        ? ["province", "track", "score", "rank"]
        : [];

  return fields.filter((field) => {
    const value = profile?.[field];
    if (typeof value === "number") {
      return !(Number.isFinite(value) && value > 0);
    }
    return !String(value || "").trim();
  });
}

function hasEvidence(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (Array.isArray(value.items)) return value.items.length > 0;
  if (Array.isArray(value.targets)) return value.targets.length > 0;
  return Object.keys(value).length > 0;
}

function mapDecisionStageLabel(stage) {
  const dictionary = {
    profile_discovery: "建立画像",
    path_evaluation: "评估出口",
    compare_options: "方案对比",
    risk_calibration: "校准风险",
    policy_verification: "核对规则",
    finalize_order: "排定顺序",
    plan_iteration: "方案调整"
  };

  return dictionary[stage] || stage;
}

function mapPriorityLabel(priority) {
  const dictionary = {
    employment: "就业出口",
    major: "专业匹配",
    platform: "学校平台",
    city: "城市发展",
    cost: "学费成本",
    postgraduate: "读研深造",
    risk_control: "风险可控"
  };

  return dictionary[priority] || priority;
}

function createEmptyComparison() {
  return {
    active: false,
    type: "single",
    universities: [],
    majors: []
  };
}
