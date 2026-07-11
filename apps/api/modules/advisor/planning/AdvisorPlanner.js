import { TOOL_RECIPES } from "../intent/intentCatalog.js";

export class AdvisorPlanner {
  plan({ intentResult = null, contextPacket = null, memorySnapshot = null } = {}) {
    const primaryIntent = intentResult?.primaryIntent || "general_follow_up";
    const plannedTools = resolvePlannedTools({
      primaryIntent,
      currentUserMessage: contextPacket?.currentUserMessage || intentResult?.currentUserMessage || "",
      contextPacket
    });
    const clarificationNeeded = Boolean(intentResult?.missingFields?.length);
    const profile = contextPacket?.profile || memorySnapshot?.profile || {};
    const workspace = contextPacket?.workspace || memorySnapshot?.workspace || {};

    return {
      version: "advisor-planner-v2",
      primaryIntent,
      clarificationNeeded,
      plannedTools,
      responseMode: clarificationNeeded ? "clarify" : "answer",
      narrative: buildPlannerNarrative({
        primaryIntent,
        plannedTools,
        clarificationNeeded,
        missingFields: intentResult?.missingFields || [],
        profile,
        workspace
      })
    };
  }
}

export function createAdvisorPlanner() {
  return new AdvisorPlanner();
}

function resolvePlannedTools({ primaryIntent, currentUserMessage = "", contextPacket = null }) {
  const plannedTools = [...(TOOL_RECIPES[primaryIntent] || TOOL_RECIPES.general_follow_up)];
  const message = String(currentUserMessage || "");
  const policyTopics = detectPolicyTopics(message);

  if (
    primaryIntent === "major_recommendation" &&
    /稳|风险|概率|录取|位次|分数|能不能上/.test(message)
  ) {
    plannedTools.push("admission_database");
  }

  if (primaryIntent === "school_recommendation" || primaryIntent === "university_lookup") {
    plannedTools.push("university_database");
  }

  if (policyTopics.includes("tuition")) {
    plannedTools.push("enrollment_plan_database");
  }

  if (
    contextPacket?.workspace?.hasPlan &&
    !plannedTools.includes("workspace_data") &&
    primaryIntent !== "policy_consulting"
  ) {
    plannedTools.unshift("workspace_data");
  }

  return [...new Set(plannedTools)];
}

function buildPlannerNarrative({
  primaryIntent,
  plannedTools,
  clarificationNeeded,
  missingFields,
  profile,
  workspace
}) {
  const lines = [
    "Advisor Planner:",
    `- primary_intent: ${primaryIntent}`,
    `- response_mode: ${clarificationNeeded ? "clarify" : "answer"}`,
    `- planned_tools: ${plannedTools.join(", ")}`
  ];

  if (clarificationNeeded) {
    lines.push(`- missing_profile_fields: ${missingFields.join(", ")}`);
    lines.push("- instruction: 先补最关键缺失信息，再给建议，不要假设缺失数据。");
  } else {
    lines.push("- instruction: 直接回答，但必须优先引用当前工作台与已知画像。");
  }

  const anchors = [
    profile?.province,
    profile?.track,
    profile?.score ? `${profile.score}分` : "",
    profile?.rank ? `位次${profile.rank}` : "",
    workspace?.topRush?.university ? `冲刺锚点 ${workspace.topRush.university}` : "",
    workspace?.topSteady?.university ? `稳妥锚点 ${workspace.topSteady.university}` : "",
    workspace?.topSafe?.university ? `保底锚点 ${workspace.topSafe.university}` : ""
  ].filter(Boolean);

  if (anchors.length) {
    lines.push(`- candidate_anchors: ${anchors.join(" | ")}`);
  }

  return lines.join("\n");
}

function detectPolicyTopics(message = "") {
  const topics = [];
  const content = String(message || "");

  if (/学费|费用|收费/.test(content)) {
    topics.push("tuition");
  }

  if (/政策|规则|批次|章程|选科要求/.test(content)) {
    topics.push("policy_rules");
  }

  return topics;
}
