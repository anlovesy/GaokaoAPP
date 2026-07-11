const UNIVERSITY_SUFFIXES = ["大学", "学院", "职业技术大学", "职业技术学院", "医学院", "师范大学"];
const MAJOR_SUFFIXES = [
  "工程",
  "科学与技术",
  "技术",
  "医学",
  "管理",
  "设计",
  "经济学",
  "法学",
  "金融学",
  "会计学",
  "自动化"
];

const UNIVERSITY_ALIAS_MAP = new Map([
  ["深大", "深圳大学"],
  ["广大", "广州大学"],
  ["广工", "广东工业大学"],
  ["华工", "华南理工大学"],
  ["华师", "华南师范大学"],
  ["中大", "中山大学"],
  ["暨大", "暨南大学"],
  ["南科大", "南方科技大学"],
  ["北大", "北京大学"],
  ["清华", "清华大学"],
  ["复旦", "复旦大学"],
  ["上交", "上海交通大学"],
  ["浙大", "浙江大学"],
  ["武大", "武汉大学"],
  ["厦大", "厦门大学"]
]);

const MAJOR_ALIAS_MAP = new Map([
  ["计科", "计算机科学与技术"],
  ["软工", "软件工程"],
  ["大数据", "数据科学与大数据技术"],
  ["电气", "电气工程及其自动化"],
  ["临床", "临床医学"],
  ["口腔", "口腔医学"],
  ["人工智能", "人工智能"],
  ["法学", "法学"],
  ["金融", "金融学"],
  ["会计", "会计学"],
  ["自动化", "自动化"],
  ["机械", "机械工程"]
]);

const POLICY_TOPIC_PATTERNS = [
  { topic: "policy_rules", pattern: /政策|规则|批次|章程/ },
  { topic: "subject_requirement", pattern: /选科|科目要求|限选|再选/ },
  { topic: "tuition", pattern: /学费|费用|收费/ },
  { topic: "adjustment", pattern: /调剂|服从调剂/ }
];

const COMPARISON_CONNECTORS = ["还是", "和", "vs", "VS", "对比", "比较", "哪个好", "哪个更"];

export class EntityResolver {
  constructor({ getDataEngine }) {
    this.getDataEngine = getDataEngine;
  }

  resolve({ scope = null, contextPacket = null, memorySnapshot = null } = {}) {
    const message = String(scope?.currentUserMessage || "");
    const engine = this.getDataEngine();
    const policyTopics = detectPolicyTopics(message);

    const universityCandidates = buildUniversityCandidates({
      message,
      scope,
      contextPacket,
      memorySnapshot
    });
    const majorCandidates = buildMajorCandidates({
      message,
      scope,
      contextPacket,
      memorySnapshot
    });

    const universities = resolveUniversities({
      engine,
      scope,
      message,
      candidates: universityCandidates
    });
    const majors = resolveMajors({
      engine,
      message,
      candidates: majorCandidates
    });
    const comparison = detectComparison({
      message,
      policyTopics,
      universities,
      majors
    });

    return {
      version: "entity-resolver-v3",
      universities,
      majors,
      policyTopics,
      comparison,
      primaryUniversity: comparison.universities[0] || pickPrimaryEntity(universities) || null,
      secondaryUniversity: comparison.universities[1] || null,
      primaryMajor: comparison.majors[0] || pickPrimaryEntity(majors) || null,
      secondaryMajor: comparison.majors[1] || null
    };
  }
}

export function createEntityResolver(dependencies) {
  return new EntityResolver(dependencies);
}

function buildUniversityCandidates({ message, scope, contextPacket, memorySnapshot }) {
  const anchorUniversities = scope?.workspaceAnchors?.universities || [];
  const extracted = extractCandidateMentions({
    message,
    suffixes: UNIVERSITY_SUFFIXES,
    kind: "university"
  });
  const aliasExpanded = expandAliasCandidates({
    message,
    aliasMap: UNIVERSITY_ALIAS_MAP,
    kind: "university"
  });
  const fromMessage = anchorUniversities
    .filter((item) => item && message.includes(item))
    .map((item) => createCandidate(item, item, "university", true));
  const contextual = [
    ...anchorUniversities,
    ...(memorySnapshot?.preferences?.universityAnchors || []),
    contextPacket?.workspace?.topRush?.university || "",
    contextPacket?.workspace?.topSteady?.university || "",
    contextPacket?.workspace?.topSafe?.university || ""
  ]
    .filter(Boolean)
    .map((item) => createCandidate(item, item, "university", false));

  return dedupeCandidates([
    ...aliasExpanded,
    ...fromMessage,
    ...extracted,
    ...contextual
  ]).slice(0, 12);
}

function buildMajorCandidates({ message, scope, contextPacket, memorySnapshot }) {
  const anchorMajors = scope?.workspaceAnchors?.majors || [];
  const extracted = extractCandidateMentions({
    message,
    suffixes: MAJOR_SUFFIXES,
    kind: "major"
  });
  const aliasExpanded = expandAliasCandidates({
    message,
    aliasMap: MAJOR_ALIAS_MAP,
    kind: "major"
  });
  const fromMessage = anchorMajors
    .filter((item) => item && message.includes(item))
    .map((item) => createCandidate(item, item, "major", true));
  const contextual = [
    ...anchorMajors,
    ...(memorySnapshot?.preferences?.majorAnchors || []),
    ...(memorySnapshot?.preferences?.directionLabels || []),
    contextPacket?.workspace?.topRush?.major || "",
    contextPacket?.workspace?.topSteady?.major || "",
    contextPacket?.workspace?.topSafe?.major || ""
  ]
    .filter(Boolean)
    .map((item) => createCandidate(item, item, "major", false));

  return dedupeCandidates([
    ...aliasExpanded,
    ...fromMessage,
    ...extracted,
    ...contextual
  ]).slice(0, 12);
}

function resolveUniversities({ engine, scope, message, candidates = [] }) {
  const resolved = [];
  const seenIds = new Set();
  const seenSoftKeys = new Set();

  for (const candidate of candidates) {
    const matches = engine.services.universityQuery.searchUniversities({
      keyword: candidate.keyword,
      provinceCode: scope?.provinceCode || undefined,
      limit: 6
    });

    if (!matches.length && candidate.explicit) {
      const softKey = `${candidate.kind}:${candidate.keyword}`;
      if (!seenSoftKeys.has(softKey)) {
        resolved.push(buildSoftEntity(candidate, message, { city: "", provinceCode: scope?.provinceCode || "" }));
        seenSoftKeys.add(softKey);
      }
      continue;
    }

    for (const match of matches) {
      if (!match?.id || seenIds.has(match.id)) {
        continue;
      }

      resolved.push({
        id: match.id,
        name: match.name_zh,
        keyword: candidate.keyword,
        mentionText: candidate.mentionText,
        explicit: candidate.explicit,
        exact: isExactDatabaseMatch(match.name_zh, candidate, message),
        aliasMatched: candidate.mentionText !== match.name_zh,
        mentionIndex: resolveMentionIndex(message, [candidate.mentionText, candidate.keyword, match.name_zh]),
        city: match.city_name || match.city_code || "",
        provinceCode: match.province_code
      });
      seenIds.add(match.id);
    }
  }

  return sortResolvedEntities(resolved);
}

function resolveMajors({ engine, message, candidates = [] }) {
  const resolved = [];
  const seenIds = new Set();
  const seenSoftKeys = new Set();

  for (const candidate of candidates) {
    const matches = engine.services.majorQuery.searchMajors({
      keyword: candidate.keyword,
      limit: 6
    });

    if (!matches.length && candidate.explicit) {
      const softKey = `${candidate.kind}:${candidate.keyword}`;
      if (!seenSoftKeys.has(softKey)) {
        resolved.push(buildSoftEntity(candidate, message, { category: "", degreeType: "" }));
        seenSoftKeys.add(softKey);
      }
      continue;
    }

    for (const match of matches) {
      if (!match?.id || seenIds.has(match.id)) {
        continue;
      }

      resolved.push({
        id: match.id,
        name: match.major_name_zh,
        keyword: candidate.keyword,
        mentionText: candidate.mentionText,
        explicit: candidate.explicit,
        exact: isExactDatabaseMatch(match.major_name_zh, candidate, message),
        aliasMatched: candidate.mentionText !== match.major_name_zh,
        mentionIndex: resolveMentionIndex(message, [
          candidate.mentionText,
          candidate.keyword,
          match.major_name_zh
        ]),
        category: match.discipline_category || "",
        degreeType: match.degree_type || ""
      });
      seenIds.add(match.id);
    }
  }

  return sortResolvedEntities(resolved);
}

function detectComparison({ message = "", policyTopics = [], universities = [], majors = [] }) {
  if (!shouldTreatAsComparison(message, policyTopics)) {
    return createEmptyComparison();
  }

  const connector = COMPARISON_CONNECTORS.find((item) => String(message).includes(item)) || "";
  const segments = splitComparisonSegments(message, connector);
  const universityTargets = pickComparisonTargets(universities, segments);
  const majorTargets = pickComparisonTargets(majors, segments);
  const hasComparablePair = universityTargets.length >= 2 || majorTargets.length >= 2;

  return {
    active: hasComparablePair,
    type:
      universityTargets.length >= 2 && majorTargets.length >= 2
        ? "mixed"
        : universityTargets.length >= 2
          ? "university"
          : majorTargets.length >= 2
            ? "major"
            : "single",
    connector,
    universities: universityTargets,
    majors: majorTargets
  };
}

function detectPolicyTopics(message = "") {
  const normalized = String(message || "");
  return POLICY_TOPIC_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(({ topic }) => topic);
}

function expandAliasCandidates({ message = "", aliasMap, kind }) {
  const content = String(message || "");
  const results = [];

  for (const [alias, target] of aliasMap.entries()) {
    if (content.includes(alias)) {
      results.push(createCandidate(target, alias, kind, true));
    }
  }

  return results;
}

function extractCandidateMentions({ message = "", suffixes = [], kind }) {
  const content = String(message || "");
  if (!content) {
    return [];
  }

  const results = [];
  suffixes.forEach((suffix) => {
    const pattern = new RegExp(`[\\u4e00-\\u9fa5A-Za-z]{2,20}${suffix}`, "g");
    const matches = content.match(pattern) || [];

    matches.forEach((match) => {
      if (kind === "major" && UNIVERSITY_SUFFIXES.some((universitySuffix) => match.endsWith(universitySuffix))) {
        return;
      }

      normalizeExtractedMentions(match, kind).forEach((normalizedMatch) => {
        results.push(createCandidate(normalizedMatch, normalizedMatch, kind, true));
      });
    });
  });

  return dedupeCandidates(results).slice(0, 8);
}

function pickComparisonTargets(items = [], segments = []) {
  const source = items.some((item) => item.explicit) ? items.filter((item) => item.explicit) : [];
  const candidates = source.length ? source : [];
  const targets = [];
  const seenMentionTexts = new Set();
  const seenNames = new Set();
  const filteredCandidates = candidates.filter((item) => isCleanComparisonEntity(item));

  const segmentMatchedCandidates = segments.length
    ? segments
        .map((segment) => pickBestSegmentEntity(filteredCandidates, segment))
        .filter(Boolean)
    : [];
  const orderedCandidates = segmentMatchedCandidates.length
    ? segmentMatchedCandidates
    : filteredCandidates;

  for (const item of orderedCandidates) {
    const mentionKey = String(item.mentionText || item.keyword || item.name || "").trim();
    const nameKey = String(item.name || "").trim();
    const groupKey = mentionKey || nameKey;

    if (!groupKey || seenMentionTexts.has(groupKey) || seenNames.has(nameKey)) {
      continue;
    }

    targets.push(item);
    seenMentionTexts.add(groupKey);
    seenNames.add(nameKey);

    if (targets.length >= 2) {
      break;
    }
  }

  return targets;
}

function normalizeExtractedMentions(match = "", kind = "") {
  if (kind !== "major") {
    return [String(match || "").trim()].filter(Boolean);
  }

  const direct = sanitizeMajorMention(match);
  const splitParts = splitComparisonSegments(match).map((item) => sanitizeMajorMention(item));
  const merged = [direct, ...splitParts].filter(Boolean);

  return [...new Set(merged)].filter(Boolean);
}

function sanitizeMajorMention(value = "") {
  let text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const cutMarkers = [
    "能不能报",
    "可不可以报",
    "适不适合报",
    "是否能报",
    "想报",
    "报",
    "想学",
    "学",
    "想读",
    "读",
    "想选",
    "选"
  ];

  for (const marker of cutMarkers) {
    if (text.includes(marker)) {
      text = text.slice(text.lastIndexOf(marker) + marker.length).trim();
    }
  }

  text = text.replace(/^(广东物化生|广东物化|物化生|物化|历史类|物理类|选科要求|专业要求)+/, "").trim();
  text = text.replace(/(哪个好就业|哪个好|哪个更好|怎么选|前景怎么样|就业怎么样).*$/, "").trim();

  if (!text) {
    return "";
  }

  if (/能不能|可不可以|要求|怎么|多少|费用|学费/.test(text)) {
    return "";
  }

  return text.length > 16 ? text.slice(-16) : text;
}

function shouldTreatAsComparison(message = "", policyTopics = []) {
  const normalized = String(message || "");
  const hasCompareVerb = /还是|vs|VS|对比|比较|哪个好|哪个更|怎么选|选哪个|谁更好/.test(normalized);
  const hasAndQuestion = normalized.includes("和") && /哪个好|哪个更|怎么选|谁更好|区别/.test(normalized);
  const policyOnly =
    policyTopics.length > 0 &&
    !hasCompareVerb &&
    !hasAndQuestion;

  if (policyOnly) {
    return false;
  }

  return hasCompareVerb || hasAndQuestion;
}

function splitComparisonSegments(message = "", connector = "") {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return [];
  }

  const separators = connector
    ? [connector]
    : ["还是", " vs ", " VS ", "vs", "VS", "和"];
  const separator = separators.find((item) => normalized.includes(item));

  if (!separator) {
    return [];
  }

  return normalized
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function isCleanComparisonEntity(item = null) {
  const text = String(item?.mentionText || item?.keyword || item?.name || "").trim();
  if (!text) {
    return false;
  }

  return !/还是|vs|VS|对比|比较|哪个好|哪个更|怎么选|谁更好|能不能|要求|学费/.test(text);
}

function pickBestSegmentEntity(candidates = [], segment = "") {
  const normalizedSegment = String(segment || "").trim();
  if (!normalizedSegment) {
    return null;
  }

  return (
    candidates.find((item) => normalizedSegment.includes(String(item.mentionText || "").trim())) ||
    candidates.find((item) => normalizedSegment.includes(String(item.name || "").trim())) ||
    null
  );
}

function pickPrimaryEntity(items = []) {
  return items.find((item) => item.explicit) || items[0] || null;
}

function buildSoftEntity(candidate, message, extras) {
  return {
    id: null,
    name: candidate.keyword,
    keyword: candidate.keyword,
    mentionText: candidate.mentionText,
    explicit: candidate.explicit,
    exact:
      candidate.keyword === candidate.mentionText ||
      String(message || "").includes(candidate.keyword) ||
      String(message || "").includes(candidate.mentionText),
    aliasMatched: candidate.mentionText !== candidate.keyword,
    mentionIndex: resolveMentionIndex(message, [candidate.mentionText, candidate.keyword]),
    ...extras
  };
}

function isExactDatabaseMatch(resolvedName, candidate, message) {
  return resolvedName === candidate.keyword || String(message || "").includes(resolvedName);
}

function createCandidate(keyword, mentionText, kind, explicit) {
  return {
    keyword: String(keyword || "").trim(),
    mentionText: String(mentionText || keyword || "").trim(),
    kind,
    explicit: Boolean(explicit)
  };
}

function dedupeCandidates(items = []) {
  const map = new Map();

  items.forEach((item) => {
    const key = `${item.kind}:${item.keyword}:${item.mentionText}`;
    const previous = map.get(key);

    if (!previous || (!previous.explicit && item.explicit)) {
      map.set(key, item);
    }
  });

  return [...map.values()].filter((item) => item.keyword);
}

function sortResolvedEntities(items = []) {
  return [...items].sort((left, right) => {
    if (left.mentionIndex !== right.mentionIndex) {
      return left.mentionIndex - right.mentionIndex;
    }
    if (left.explicit !== right.explicit) {
      return left.explicit ? -1 : 1;
    }
    if (left.exact !== right.exact) {
      return left.exact ? -1 : 1;
    }
    if (left.aliasMatched !== right.aliasMatched) {
      return left.aliasMatched ? -1 : 1;
    }

    return String(left.name || "").length - String(right.name || "").length;
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

function resolveMentionIndex(message, candidates = []) {
  const content = String(message || "");
  const indexes = candidates
    .map((candidate) => content.indexOf(candidate))
    .filter((index) => index >= 0);

  return indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
}
