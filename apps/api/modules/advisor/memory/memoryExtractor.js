const TOPIC_KEYWORDS = [
  { key: "school_recommendation", patterns: ["学校", "院校", "大学", "冲", "稳", "保"] },
  { key: "major_recommendation", patterns: ["专业", "选专业", "调剂", "专业组"] },
  { key: "city_preference", patterns: ["城市", "留在", "省外", "广东", "广州", "深圳"] },
  { key: "risk_analysis", patterns: ["风险", "稳不稳", "概率", "滑档", "保底"] },
  { key: "employment", patterns: ["就业", "工作", "薪资", "前景", "offer"] },
  { key: "postgraduate", patterns: ["考研", "读研", "保研", "深造"] },
  { key: "policy", patterns: ["政策", "批次", "规则", "招生计划", "选科要求"] }
];

export function extractStableProfileMemory(planningContext = null) {
  const profile = planningContext?.profile || {};

  return {
    province: normalizeText(profile.province),
    examMode: normalizeText(profile.examMode),
    track: normalizeText(profile.track),
    score: toPositiveNumber(profile.score),
    rank: toPositiveNumber(profile.rank),
    selectedSubjects: normalizeTextList(profile.selectedSubjects),
    candidateType: normalizeText(profile.candidateType),
    riskLabel: normalizeText(profile.riskLabel),
    preferredCities: normalizeText(profile.preferredCities),
    careerPlan: normalizeText(profile.careerPlan),
    maxTuition: toPositiveNumber(profile.maxTuition),
    interests: normalizeTextList(profile.interests),
    personalityTags: normalizeTextList(profile.personalityTags),
    schoolTags: normalizeTextList(profile.schoolTags),
    majorNeeds: normalizeTextList(profile.majorNeeds),
    subjectConstraints: normalizeTextList(profile.subjectConstraints),
    willingAdjustment:
      typeof profile.willingAdjustment === "boolean" ? profile.willingAdjustment : null,
    englishScore: toPositiveNumber(profile.englishScore)
  };
}

export function extractPreferenceMemory(planningContext = null) {
  const majorDirections = Array.isArray(planningContext?.majorDirections)
    ? planningContext.majorDirections
    : [];
  const applicationPlan = Array.isArray(planningContext?.applicationPlan)
    ? planningContext.applicationPlan
    : [];

  const topSchools = applicationPlan
    .flatMap((tier) => (Array.isArray(tier?.schools) ? tier.schools : []))
    .slice(0, 6);

  const uniqueCities = dedupeStrings(topSchools.map((item) => normalizeText(item?.city))).slice(0, 4);
  const majorAnchors = dedupeStrings(
    topSchools
      .flatMap((item) => [normalizeText(item?.major), ...normalizeTextList(item?.recommendedMajors)])
      .filter(Boolean)
  ).slice(0, 6);

  return {
    directionLabels: majorDirections
      .map((item) => normalizeText(item?.name || item?.direction || item?.label))
      .filter(Boolean)
      .slice(0, 5),
    cityAnchors: uniqueCities,
    majorAnchors,
    universityAnchors: dedupeStrings(topSchools.map((item) => normalizeText(item?.university))).slice(0, 6)
  };
}

export function extractWorkspaceMemory(planningContext = null) {
  const diagnosis = planningContext?.diagnosis || {};
  const summary = planningContext?.summary || {};
  const applicationPlan = Array.isArray(planningContext?.applicationPlan)
    ? planningContext.applicationPlan
    : [];

  return {
    hasPlan: applicationPlan.length > 0,
    overview: normalizeText(summary.overview),
    strategy: normalizeText(summary.strategy),
    careerAdvice: normalizeText(summary.careerAdvice),
    coverageRate:
      typeof diagnosis.coverageRate === "number" ? Math.round(diagnosis.coverageRate) : null,
    topDirections: normalizeTextList(diagnosis.topDirections).slice(0, 5),
    adjustmentAdvice: normalizeText(diagnosis.adjustmentAdvice),
    riskCounts: {
      rush: toPositiveNumber(diagnosis?.riskProfile?.rushCount),
      steady: toPositiveNumber(diagnosis?.riskProfile?.steadyCount),
      safe: toPositiveNumber(diagnosis?.riskProfile?.safeCount)
    }
  };
}

export function extractConversationSignals({
  mergedMessages = [],
  recentHistory = [],
  latestSession = null,
  planningContext = null
} = {}) {
  const currentUserMessage =
    [...mergedMessages].reverse().find((message) => message?.role === "user")?.content || "";
  const previousAssistantContent =
    [...mergedMessages]
      .slice(0, -1)
      .reverse()
      .find((message) => message?.role === "assistant")?.content || "";
  const stitchedText = [
    ...mergedMessages.slice(-10).map((message) => message?.content || ""),
    ...recentHistory.slice(0, 3).flatMap((item) =>
      Array.isArray(item?.messages) ? item.messages.slice(-4).map((message) => message?.content || "") : []
    ),
    latestSession?.replyText || ""
  ]
    .filter(Boolean)
    .join("\n");

  return {
    currentUserMessage: normalizeText(currentUserMessage),
    previousAssistantPreview: sliceText(previousAssistantContent, 140),
    recentTopicKeys: inferTopicKeys(stitchedText),
    decisionStage: inferDecisionStage(stitchedText, currentUserMessage, planningContext),
    priorityKeys: inferPriorityKeys(stitchedText, planningContext),
    openLoop: inferOpenLoop(currentUserMessage, previousAssistantContent),
    recentQuestionCount: countUserQuestions(mergedMessages),
    isFollowUp:
      mergedMessages.length >= 3 ||
      (Array.isArray(latestSession?.messages) ? latestSession.messages.length >= 3 : false),
    lastSessionReplyPreview: sliceText(latestSession?.replyText || "", 140)
  };
}

function inferTopicKeys(text) {
  const normalized = String(text || "");

  return TOPIC_KEYWORDS.filter((topic) =>
    topic.patterns.some((pattern) => normalized.includes(pattern))
  )
    .map((topic) => topic.key)
    .slice(0, 5);
}

function countUserQuestions(messages = []) {
  return messages.reduce((count, message) => {
    if (message?.role !== "user") {
      return count;
    }

    return /[?？吗么怎如何为什么]/.test(String(message.content || "")) ? count + 1 : count;
  }, 0);
}

function inferDecisionStage(text, currentUserMessage, planningContext) {
  const normalized = `${text || ""}\n${currentUserMessage || ""}`;
  const hasPlan = Array.isArray(planningContext?.applicationPlan) && planningContext.applicationPlan.length > 0;

  if (/对比|比较|vs|VS|还是/.test(normalized)) {
    return "compare_options";
  }

  if (/冲|稳|保|风险|滑档|调剂|专业组/.test(normalized)) {
    return "risk_calibration";
  }

  if (/顺序|排序|怎么排|志愿表|第一志愿|第二志愿/.test(normalized)) {
    return "finalize_order";
  }

  if (/政策|规则|选科要求|学费|招生计划|章程/.test(normalized)) {
    return "policy_verification";
  }

  if (/就业|薪资|前景|工作|读研|保研|考研|四年规划/.test(normalized)) {
    return "path_evaluation";
  }

  if (hasPlan) {
    return "plan_iteration";
  }

  return "profile_discovery";
}

function inferPriorityKeys(text, planningContext) {
  const normalized = `${text || ""}\n${serializePlanningHints(planningContext)}`;
  const priorities = [];

  if (/就业|稳定|铁饭碗|考公|编制|薪资|前景/.test(normalized)) {
    priorities.push("employment");
  }
  if (/专业优先|专业组|不调剂|转专业|热爱专业/.test(normalized)) {
    priorities.push("major");
  }
  if (/学校优先|平台|985|211|双一流|名校/.test(normalized)) {
    priorities.push("platform");
  }
  if (/城市|留在|广州|深圳|杭州|上海|北京|省外/.test(normalized)) {
    priorities.push("city");
  }
  if (/学费|预算|费用|便宜|公办/.test(normalized)) {
    priorities.push("cost");
  }
  if (/读研|保研|考研|深造/.test(normalized)) {
    priorities.push("postgraduate");
  }
  if (/稳|保底|风险|滑档/.test(normalized)) {
    priorities.push("risk_control");
  }

  return priorities.slice(0, 5);
}

function inferOpenLoop(currentUserMessage, previousAssistantContent) {
  const userText = normalizeText(currentUserMessage);
  const assistantText = normalizeText(previousAssistantContent);

  if (!userText && !assistantText) {
    return "";
  }

  if (isExtendedFollowUpMemoryCue(userText)) {
    return `用户正在追问上一轮展开项：${sliceText(userText, 48)}`;
  }

  if (/第一|第二|第三|继续|展开|具体|细说/.test(userText)) {
    return `用户正在追问上一轮展开项：${sliceText(userText, 48)}`;
  }

  if (userText) {
    return `当前待解决问题：${sliceText(userText, 72)}`;
  }

  if (/下一步|可以继续问|二选一/.test(assistantText)) {
    return `上一轮还留有待推进动作：${sliceText(assistantText, 72)}`;
  }

  return "";
}

function isExtendedFollowUpMemoryCue(content) {
  const normalized = normalizeText(content).replace(/\s+/g, "");

  if (!normalized) {
    return false;
  }

  return /继续|展开|具体|细说|再说|然后|第一|第二|第三|第一个|第二个|第三个|第一条|第二条|第三条|前两个|后两个|前两条|后两条|前两点|后两点|1和2|1\+2|12|123/.test(
    normalized
  );
}

function serializePlanningHints(planningContext) {
  const profile = planningContext?.profile || {};
  return [
    profile.preferredCities,
    profile.careerPlan,
    ...(Array.isArray(profile.majorNeeds) ? profile.majorNeeds : []),
    ...(Array.isArray(profile.schoolTags) ? profile.schoolTags : []),
    ...(Array.isArray(profile.subjectConstraints) ? profile.subjectConstraints : [])
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTextList(values) {
  return Array.isArray(values)
    ? values.map((item) => normalizeText(item)).filter(Boolean)
    : [];
}

function dedupeStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sliceText(value, maxLength = 120) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function toPositiveNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
