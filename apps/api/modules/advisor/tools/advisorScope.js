const PROVINCE_CODE_MAP = new Map([
  ["北京", "BJ"],
  ["天津", "TJ"],
  ["河北", "HE"],
  ["山西", "SX"],
  ["内蒙古", "NM"],
  ["辽宁", "LN"],
  ["吉林", "JL"],
  ["黑龙江", "HL"],
  ["上海", "SH"],
  ["江苏", "JS"],
  ["浙江", "ZJ"],
  ["安徽", "AH"],
  ["福建", "FJ"],
  ["江西", "JX"],
  ["山东", "SD"],
  ["河南", "HA"],
  ["湖北", "HB"],
  ["湖南", "HN"],
  ["广东", "GD"],
  ["广西", "GX"],
  ["海南", "HI"],
  ["重庆", "CQ"],
  ["四川", "SC"],
  ["贵州", "GZ"],
  ["云南", "YN"],
  ["西藏", "XZ"],
  ["陕西", "SN"],
  ["甘肃", "GS"],
  ["青海", "QH"],
  ["宁夏", "NX"],
  ["新疆", "XJ"]
]);

export function buildAdvisorQueryScope({ contextPacket = null, memorySnapshot = null, payload = null } = {}) {
  const profile = contextPacket?.profile || memorySnapshot?.profile || {};
  const workspace = contextPacket?.workspace || {};
  const message = contextPacket?.currentUserMessage || "";

  const provinceCode = normalizeProvinceCode(profile.province);
  const trackType = normalizeTrackType(profile.track);
  const year = resolveCandidateYear(payload, provinceCode, trackType);
  const rank = Number(profile.rank || 0) || 0;
  const score = Number(profile.score || 0) || 0;

  return {
    province: String(profile.province || "").trim(),
    provinceCode,
    track: String(profile.track || "").trim(),
    trackType,
    year,
    score,
    rank,
    currentUserMessage: message,
    workspaceAnchors: {
      universities: dedupeStrings(
        [workspace?.topRush?.university, workspace?.topSteady?.university, workspace?.topSafe?.university]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      ),
      majors: dedupeStrings(
        [workspace?.topRush?.major, workspace?.topSteady?.major, workspace?.topSafe?.major]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    }
  };
}

export function normalizeProvinceCode(value) {
  const normalized = String(value || "").trim();
  return PROVINCE_CODE_MAP.get(normalized) || null;
}

export function normalizeTrackType(value) {
  const normalized = String(value || "").trim();
  if (normalized === "物理") {
    return "physics";
  }

  if (normalized === "历史") {
    return "history";
  }

  return null;
}

export function resolveRankWindow(rank, intentKey = "general_follow_up") {
  const safeRank = Number(rank || 0);
  if (!safeRank) {
    return { rankMin: null, rankMax: null };
  }

  const band =
    intentKey === "risk_analysis"
      ? { lower: 3000, upper: 6000 }
      : intentKey === "school_recommendation"
        ? { lower: 2500, upper: 5000 }
        : { lower: 1800, upper: 3600 };

  return {
    rankMin: Math.max(1, safeRank - band.lower),
    rankMax: safeRank + band.upper
  };
}

export function pickUniversityKeyword(scope) {
  return pickAnchorMention(scope?.currentUserMessage, scope?.workspaceAnchors?.universities) || "";
}

export function pickMajorKeyword(scope, memorySnapshot = null) {
  const anchorMatch =
    pickAnchorMention(scope?.currentUserMessage, scope?.workspaceAnchors?.majors) || "";
  if (anchorMatch) {
    return anchorMatch;
  }

  return (
    memorySnapshot?.preferences?.majorAnchors?.[0] ||
    memorySnapshot?.preferences?.directionLabels?.[0] ||
    ""
  );
}

function pickAnchorMention(message, anchors = []) {
  const content = String(message || "");
  if (!content) {
    return anchors?.[0] || "";
  }

  return anchors.find((anchor) => anchor && content.includes(anchor)) || anchors?.[0] || "";
}

function resolveCandidateYear(payload, provinceCode, trackType) {
  const directYear = Number(payload?.planningContext?.meta?.latestProvinceYear || 0);
  if (Number.isFinite(directYear) && directYear > 0) {
    return directYear;
  }

  const fallbackYear = Number(new Date().getFullYear());
  if (provinceCode && trackType) {
    return fallbackYear;
  }

  return fallbackYear;
}

function dedupeStrings(values = []) {
  return [...new Set(values.filter(Boolean))];
}
