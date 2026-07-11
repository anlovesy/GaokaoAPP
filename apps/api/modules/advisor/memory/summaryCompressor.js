export function buildMemorySummary(memorySnapshot = {}) {
  const segments = [];
  const profile = memorySnapshot.profile || {};
  const preferences = memorySnapshot.preferences || {};
  const workspace = memorySnapshot.workspace || {};

  const profileParts = [
    profile.province,
    profile.track,
    profile.score ? `${profile.score}分` : "",
    profile.rank ? `位次约 ${profile.rank}` : "",
    Array.isArray(profile.selectedSubjects) && profile.selectedSubjects.length
      ? `选科 ${profile.selectedSubjects.join("/")}`
      : "",
    profile.riskLabel ? `策略 ${profile.riskLabel}` : ""
  ].filter(Boolean);

  if (profileParts.length) {
    segments.push(`已知考生画像：${profileParts.join("，")}。`);
  }

  if (preferences.directionLabels?.length || preferences.majorAnchors?.length) {
    segments.push(
      `当前偏好锚点：${[
        preferences.directionLabels?.length
          ? `方向 ${preferences.directionLabels.slice(0, 3).join(" / ")}`
          : "",
        preferences.majorAnchors?.length
          ? `专业 ${preferences.majorAnchors.slice(0, 3).join(" / ")}`
          : "",
        preferences.cityAnchors?.length
          ? `城市 ${preferences.cityAnchors.slice(0, 2).join(" / ")}`
          : ""
      ]
        .filter(Boolean)
        .join("，")}。`
    );
  }

  if (profile.preferredCities || profile.careerPlan || profile.maxTuition) {
    segments.push(
      `隐含约束：${[
        profile.preferredCities ? `城市偏好 ${profile.preferredCities}` : "",
        profile.careerPlan ? `职业规划 ${shorten(profile.careerPlan, 24)}` : "",
        profile.maxTuition ? `学费上限 ${profile.maxTuition}` : ""
      ]
        .filter(Boolean)
        .join("，")}。`
    );
  }

  if (workspace.hasPlan) {
    const riskCounts = workspace.riskCounts || {};
    segments.push(
      `当前已有正式志愿方案：冲${riskCounts.rush || 0}、稳${riskCounts.steady || 0}、保${riskCounts.safe || 0}。`
    );
  }

  if (workspace.strategy) {
    segments.push(`当前方案主策略：${workspace.strategy}`);
  }

  return segments.join("\n");
}

export function buildConversationSummary(memorySnapshot = {}) {
  const conversation = memorySnapshot.conversation || {};
  const labels = mapTopicLabels(conversation.recentTopicKeys || []);
  const priorityLabels = mapPriorityLabels(conversation.priorityKeys || []);
  const segments = [];

  if (conversation.isFollowUp) {
    segments.push("当前对话处于连续追问场景，回答必须顺着上一轮继续推进。");
  }

  if (conversation.decisionStage) {
    segments.push(`当前决策阶段：${mapDecisionStageLabel(conversation.decisionStage)}。`);
  }

  if (labels.length) {
    segments.push(`最近持续关注的话题：${labels.join("、")}。`);
  }

  if (priorityLabels.length) {
    segments.push(`用户真正正在权衡的维度：${priorityLabels.join("、")}。`);
  }

  if (conversation.previousAssistantPreview) {
    segments.push(`上一轮助手结论摘要：${conversation.previousAssistantPreview}`);
  }

  if (conversation.currentUserMessage) {
    segments.push(`本轮用户最新问题：${conversation.currentUserMessage}`);
  }

  if (conversation.openLoop) {
    segments.push(conversation.openLoop);
  }

  return segments.join("\n");
}

function mapTopicLabels(topicKeys) {
  const dictionary = {
    school_recommendation: "学校推荐",
    major_recommendation: "专业选择",
    city_preference: "城市偏好",
    risk_analysis: "风险判断",
    employment: "就业前景",
    postgraduate: "考研深造",
    policy: "招生政策"
  };

  return topicKeys.map((key) => dictionary[key]).filter(Boolean);
}

function mapPriorityLabels(priorityKeys) {
  const dictionary = {
    employment: "就业出口",
    major: "专业匹配",
    platform: "学校平台",
    city: "城市发展",
    cost: "学费成本",
    postgraduate: "读研深造",
    risk_control: "风险可控性"
  };

  return priorityKeys.map((key) => dictionary[key]).filter(Boolean);
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

function shorten(value, maxLength = 20) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
