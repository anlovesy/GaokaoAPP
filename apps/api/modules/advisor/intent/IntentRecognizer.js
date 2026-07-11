import { INTENT_DEFINITIONS, getIntentDefinition } from "./intentCatalog.js";

export class IntentRecognizer {
  recognize({ mergedMessages = [], contextPacket = null, memorySnapshot = null } = {}) {
    const currentUserMessage =
      [...mergedMessages].reverse().find((message) => message?.role === "user")?.content || "";
    const heuristicIntent = resolveHeuristicIntent(currentUserMessage);
    const scores = INTENT_DEFINITIONS.map((intent) => ({
      key: intent.key,
      score: scoreIntent(currentUserMessage, intent.patterns)
    })).sort((left, right) => right.score - left.score);

    const top = scores[0] || { key: "general_follow_up", score: 0 };
    const primaryIntent = heuristicIntent || (top.score > 0 ? top.key : "general_follow_up");
    const requiredFields = resolveRequiredFields(primaryIntent);
    const profile = contextPacket?.profile || memorySnapshot?.profile || {};
    const missingFields = requiredFields.filter((field) => isMissingProfileField(profile, field));

    return {
      version: "intent-recognizer-v2",
      primaryIntent,
      intentLabel: getIntentDefinition(primaryIntent)?.description || "连续追问",
      confidence: heuristicIntent ? "high" : normalizeConfidence(top.score),
      alternatives: scores.slice(1, 3).filter((item) => item.score > 0),
      missingFields,
      currentUserMessage
    };
  }
}

export function createIntentRecognizer() {
  return new IntentRecognizer();
}

function scoreIntent(message, patterns) {
  const content = String(message || "");
  if (!content) {
    return 0;
  }

  return patterns.reduce((score, pattern) => (content.includes(pattern) ? score + 1 : score), 0);
}

function normalizeConfidence(score) {
  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function resolveRequiredFields(intent) {
  if (["school_recommendation", "major_recommendation", "risk_analysis"].includes(intent)) {
    return ["province", "track", "score", "rank"];
  }

  if (["policy_consulting", "university_lookup"].includes(intent)) {
    return ["province", "track"];
  }

  return [];
}

function isMissingProfileField(profile, field) {
  const value = profile?.[field];

  if (typeof value === "number") {
    return !(Number.isFinite(value) && value > 0);
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return !String(value || "").trim();
}

function resolveHeuristicIntent(message) {
  const content = String(message || "");
  if (!content) {
    return "";
  }

  if (/政策|规则|批次|章程|学费|费用|选科要求/.test(content)) {
    return "policy_consulting";
  }

  if (/就业|薪资|行业|前景|找工作/.test(content)) {
    return "employment_consulting";
  }

  if (/考研|保研|读研|研究生|深造/.test(content)) {
    return "postgraduate_planning";
  }

  if (/职业规划|未来方向|四年规划|适合做什么/.test(content)) {
    return "career_planning";
  }

  if (containsComparisonIntent(content) && containsMajorSignal(content)) {
    return "major_recommendation";
  }

  if (containsComparisonIntent(content) && containsUniversitySignal(content)) {
    return "school_recommendation";
  }

  if (containsMajorSignal(content) && /稳|冲|保|推荐|怎么选|哪个更/.test(content)) {
    return "major_recommendation";
  }

  if (containsUniversitySignal(content) && /稳|冲|保|推荐|怎么选|哪个更/.test(content)) {
    return "school_recommendation";
  }

  return "";
}

function containsComparisonIntent(content) {
  return /还是|和|vs|VS|对比|比较|哪个好|哪个更/.test(content);
}

function containsMajorSignal(content) {
  return /专业|转专业|调剂|计科|软工|人工智能|临床|口腔|电气|自动化|机械|法学|金融|会计|大数据/.test(
    content
  );
}

function containsUniversitySignal(content) {
  return /大学|学院|学校|院校|上交|复旦|清华|北大|中大|华工|广工|深大|浙大|武大|厦大/.test(content);
}
