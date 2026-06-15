import {
  interestCatalog,
  majorDirections,
  provinceDifficultyFactor,
  riskConfig,
  universityCatalog
} from "../data/plannerData.js";
import {
  loadGeneratedGaokaoData,
  findHistoricalMajorLine,
  findNearbyScoreRank,
  getLatestProvinceYear,
  getLatestUniversityYear
} from "./dataService.js";
import { generateStructuredPlanningSummary } from "./llmService.js";

const MAJOR_DIRECTION_ALIAS = [
  {
    direction: "计算机科学与技术",
    keywords: ["计算机", "软件", "信息", "人工智能", "大数据", "网络", "数字", "电子信息"]
  },
  {
    direction: "人工智能",
    keywords: ["人工智能", "智能", "算法", "模型", "机器学习", "自动化", "智能制造"]
  },
  {
    direction: "软件工程",
    keywords: ["软件", "程序", "信息", "数字", "互联网", "系统"]
  },
  {
    direction: "数据科学与大数据技术",
    keywords: ["数据", "统计", "大数据", "信息", "分析"]
  },
  {
    direction: "临床医学",
    keywords: ["临床", "医学", "医", "健康", "医院", "医工"]
  },
  {
    direction: "口腔医学",
    keywords: ["口腔", "医学", "医"]
  },
  {
    direction: "药学",
    keywords: ["药学", "制药", "医学", "生物", "药"]
  },
  {
    direction: "金融学",
    keywords: ["金融", "经济", "投资", "商科", "财务"]
  },
  {
    direction: "会计学",
    keywords: ["会计", "财务", "审计", "商科"]
  },
  {
    direction: "法学",
    keywords: ["法学", "法律", "法政", "政治"]
  },
  {
    direction: "行政管理",
    keywords: ["行政", "管理", "治理", "公共", "政策"]
  },
  {
    direction: "机械工程",
    keywords: ["机械", "装备", "制造", "机电", "工业"]
  },
  {
    direction: "电气工程及其自动化",
    keywords: ["电气", "电力", "自动化", "控制", "能源"]
  },
  {
    direction: "自动化",
    keywords: ["自动化", "控制", "智能制造", "机器"]
  },
  {
    direction: "建筑学",
    keywords: ["建筑", "设计", "城乡", "空间", "规划"]
  },
  {
    direction: "新闻传播学",
    keywords: ["新闻", "传播", "传媒", "汉语言", "广告", "内容", "播音"]
  },
  {
    direction: "教育学",
    keywords: ["教育", "师范", "教学", "教师"]
  },
  {
    direction: "心理学",
    keywords: ["心理", "教育", "成长", "咨询"]
  },
  {
    direction: "英语",
    keywords: ["英语", "外语", "语言", "翻译", "国际"]
  },
  {
    direction: "食品科学与工程",
    keywords: ["食品", "营养", "生物", "加工"]
  },
  {
    direction: "环境工程",
    keywords: ["环境", "生态", "环保", "绿色"]
  }
];

export async function generateVolunteerPlan(profile) {
  const normalizedProfile = normalizeProfile(profile);
  const selectedInterests = interestCatalog.filter((item) =>
    normalizedProfile.interests.includes(item.id)
  );
  const keywordPool = buildKeywordPool(normalizedProfile, selectedInterests);
  const matchedDirections = scoreDirections(keywordPool);
  const generatedData = loadGeneratedGaokaoData();
  const dataDrivenPool = buildDataDrivenRecommendations(
    normalizedProfile,
    matchedDirections,
    selectedInterests,
    generatedData
  );
  const staticFallbackPool = scoreSchools(
    normalizedProfile,
    matchedDirections,
    selectedInterests,
    generatedData
  );
  const rescuePool = buildRescueRecommendations(
    normalizedProfile,
    matchedDirections,
    generatedData
  );
  const rawRecommendationPool = mergeRecommendationPools(
    dataDrivenPool,
    staticFallbackPool,
    rescuePool
  );
  const recommendationPool = normalizeRecommendationPoolForPlanV3(
    rawRecommendationPool,
    normalizedProfile
  );
  const applicationPlan = buildApplicationPlanV3(
    recommendationPool,
    normalizedProfile,
    generatedData
  );
  const backupOptions = recommendationPool.slice(12, 24);
  const profileDiagnosis = buildProfileDiagnosis(
    normalizedProfile,
    matchedDirections,
    recommendationPool,
    applicationPlan,
    generatedData
  );
  const localSummary = buildLocalSummary(
    normalizedProfile,
    matchedDirections,
    recommendationPool,
    applicationPlan
  );
  const aiSummary = await generateStructuredPlanningSummary({
    preferredProvider: normalizedProfile.aiProvider,
    input: {
      profile: normalizedProfile,
      profileDiagnosis,
      matchedDirections: matchedDirections.slice(0, 5),
      topRecommendations: recommendationPool.slice(0, 8)
    }
  });

  return {
    profile: {
      province: normalizedProfile.province,
      examMode: normalizedProfile.examMode,
      track: normalizedProfile.track,
      selectedSubjects: normalizedProfile.selectedSubjects,
      score: normalizedProfile.score,
      rank: normalizedProfile.rank,
      riskLabel: riskConfig[normalizedProfile.risk].label,
      candidateType: normalizedProfile.candidateType,
      willingAdjustment: normalizedProfile.willingAdjustment,
      englishScore: normalizedProfile.englishScore
    },
    summary: {
      overview: aiSummary?.overview || localSummary.overview,
      strategy: aiSummary?.strategy || localSummary.strategy,
      careerAdvice: aiSummary?.careerAdvice || localSummary.careerAdvice
    },
    diagnosis: profileDiagnosis,
    majorDirections: matchedDirections.slice(0, 6),
    applicationPlan,
    backupOptions,
    riskAlerts: aiSummary?.riskAlerts || localSummary.riskAlerts,
    meta: {
      analysisMode: aiSummary ? "llm" : "local",
      dataSource: generatedData.universityMajorLines.length > 0 ? "imported+demo" : "demo",
      latestProvinceYear: getLatestProvinceYear(
        generatedData,
        normalizedProfile.province,
        normalizedProfile.track
      ),
      latestUniversityYear: getLatestUniversityYear(
        generatedData,
        normalizedProfile.province,
        normalizedProfile.track
      )
    }
  };
}

function normalizeProfile(profile) {
  const latest = loadGeneratedGaokaoData();
  const derivedRank =
    profile.rank ||
    findNearbyScoreRank(latest, profile.province, profile.track, profile.score)?.rank ||
    0;

  return {
    ...profile,
    score: Number(profile.score || 0),
    rank: Number(derivedRank || 0),
    maxTuition: Number(profile.maxTuition || 0),
    englishScore: Number(profile.englishScore || 0),
    selectedSubjects: Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : [],
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    personalityTags: Array.isArray(profile.personalityTags) ? profile.personalityTags : [],
    schoolTags: Array.isArray(profile.schoolTags) ? profile.schoolTags : [],
    majorNeeds: Array.isArray(profile.majorNeeds) ? profile.majorNeeds : [],
    subjectConstraints: Array.isArray(profile.subjectConstraints) ? profile.subjectConstraints : [],
    specialPlans: Array.isArray(profile.specialPlans) ? profile.specialPlans : []
  };
}

function buildKeywordPool(profile, selectedInterests) {
  const tokens = new Set();

  selectedInterests.forEach((interest) => {
    interest.tags.forEach((tag) => tokens.add(tag));
    tokens.add(interest.label);
  });

  splitText(profile.careerPlan).forEach((item) => tokens.add(item));
  splitText(profile.notes).forEach((item) => tokens.add(item));
  splitText(profile.preferredCities).forEach((item) => tokens.add(item));
  splitText(profile.healthNotes).forEach((item) => tokens.add(item));
  profile.majorNeeds.forEach((item) => tokens.add(item));
  profile.schoolTags.forEach((item) => tokens.add(item));
  profile.selectedSubjects.forEach((item) => tokens.add(item));
  profile.personalityTags.forEach((item) => tokens.add(item));
  profile.specialPlans.forEach((item) => tokens.add(item));
  tokens.add(profile.candidateType);

  return Array.from(tokens);
}

function splitText(text) {
  return String(text || "")
    .split(/[\s,，。；、/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreDirections(keywordPool) {
  return majorDirections
    .map((direction) => {
      const keywordMatches = direction.keywords.filter((keyword) =>
        keywordPool.some((token) => token.includes(keyword) || keyword.includes(token))
      ).length;
      const careerMatches = direction.careers.filter((career) =>
        keywordPool.some((token) => career.includes(token) || token.includes(career))
      ).length;

      return {
        ...direction,
        score: Math.max(14, keywordMatches * 18 + careerMatches * 24)
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildDataDrivenRecommendations(profile, directions, selectedInterests, generatedData) {
  if (!generatedData.universityMajorLines.length) {
    return [];
  }

  const latestYear = getLatestUniversityYear(generatedData, profile.province, profile.track);
  if (!latestYear) {
    return [];
  }

  const config = riskConfig[profile.risk];
  const selectedDirectionNames = directions.slice(0, 6).map((item) => item.name);
  const cityPreferences = splitText(profile.preferredCities);
  const interestSet = new Set(selectedInterests.map((item) => item.id));

  const sourceRows = generatedData.universityMajorLines.filter(
    (item) =>
      item.province === profile.province &&
      Number(item.year) === Number(latestYear) &&
      (!profile.track || !item.track || item.track === profile.track) &&
      normalizeBatch(item.batch).includes("本科")
  );

  const preferredRows = [];
  const relaxedRows = [];

  sourceRows.forEach((row) => {
    const normalizedRow = enrichImportedRow(row, directions);
    if (isRestrictedSpecialProgram(normalizedRow, profile)) {
      return;
    }
    const schoolMeta = matchStaticSchoolMeta(normalizedRow.university);
    const effectiveTuition = normalizedRow.tuition || schoolMeta?.tuition || 0;

    if (!passesImportedConstraints(profile, normalizedRow, schoolMeta, effectiveTuition)) {
      return;
    }

    const ratio = profile.rank / Math.max(1, Number(normalizedRow.minRank || 0));
    const tier = resolveTier(ratio, config);
    const proximityTier = resolveExtendedTier(ratio, config);

    if (!proximityTier) {
      return;
    }

    const directionMatched = selectedDirectionNames.includes(normalizedRow.direction);
    const cityMatched = normalizedRow.city
      ? cityPreferences.includes(normalizedRow.city) || cityPreferences.includes(profile.province)
      : false;
    const schoolTagBonus = schoolMeta
      ? profile.schoolTags.reduce(
          (sum, tag) => sum + (schoolMeta.levelTags.includes(tag) ? 8 : 0),
          0
        )
      : 0;
    const interestBonus = schoolMeta
      ? schoolMeta.tags.reduce((sum, tag) => sum + (interestSet.has(tag) ? 8 : 0), 0)
      : 0;
    const directionBonus = directionMatched ? 36 : 0;
    const cityBonus = cityMatched ? 18 : 0;
    const employmentBonus = schoolMeta
      ? profile.majorNeeds.includes("stableEmployment")
        ? schoolMeta.employmentStability / 8
        : 0
      : 0;
    const graduateBonus = schoolMeta
      ? profile.majorNeeds.includes("graduateFriendly")
        ? schoolMeta.graduateRate / 9
        : 0
      : 0;
    const majorPriorityBonus = profile.subjectConstraints.includes("majorPriority") ? 8 : 0;
    const cityPriorityBonus =
      profile.subjectConstraints.includes("cityPriority") && cityMatched ? 10 : 0;
    const lowScoreRescueBonus = profile.rank > 120000 ? 12 : 0;
    const scoreGapPenalty = Math.min(
      62,
      (Math.abs(profile.rank - normalizedRow.minRank) / Math.max(800, normalizedRow.minRank)) * 100
    );

    const resolvedTier = tier || (ratio <= config.rush * 1.12 ? "冲" : "保");
    const item = {
      source: "imported",
      tier: resolvedTier,
      tierClass: resolvedTier === "保" ? "safe" : resolvedTier === "稳" ? "steady" : "rush",
      university: normalizedRow.university,
      city: normalizedRow.city || schoolMeta?.city || "待核验城市",
      nature: schoolMeta?.nature || "本科批院校",
      major: normalizedRow.major,
      tuition: effectiveTuition,
      threshold: normalizedRow.minRank,
      year: normalizedRow.year,
      minScore: normalizedRow.minScore || null,
      subjectRequirement: normalizedRow.subjectRequirement || "",
      confidence: buildConfidence(profile.rank, normalizedRow.minRank, resolvedTier),
      score:
        124 -
        scoreGapPenalty +
        directionBonus +
        cityBonus +
        schoolTagBonus +
        interestBonus +
        employmentBonus +
        graduateBonus +
        majorPriorityBonus +
        cityPriorityBonus +
        lowScoreRescueBonus +
        (normalizedRow.admissionCount > 0 ? Math.min(12, normalizedRow.admissionCount / 2) : 0),
      reason: buildImportedReason(profile, normalizedRow, resolvedTier, schoolMeta),
      admissionCount: normalizedRow.admissionCount,
      batch: normalizedRow.batch,
      notes: normalizedRow.notes,
      code: parseSchoolCode(normalizedRow.notes),
      groupName: parseGroupName(normalizedRow.notes),
      direction: normalizedRow.direction
    };

    if (directionMatched || cityMatched || schoolTagBonus > 0 || interestBonus > 0) {
      preferredRows.push(item);
    } else {
      relaxedRows.push(item);
    }
  });

  return [...preferredRows, ...relaxedRows]
    .sort((a, b) => b.score - a.score)
    .slice(0, 240);
}

function scoreSchools(profile, directions, selectedInterests, generatedData) {
  const provinceFactor = provinceDifficultyFactor[profile.province] || 1;
  const config = riskConfig[profile.risk];
  const topDirectionNames = directions.slice(0, 5).map((item) => item.name);
  const interestSet = new Set(selectedInterests.map((item) => item.id));
  const cityPreferences = splitText(profile.preferredCities);

  return universityCatalog
    .flatMap((school) =>
      school.majors.map((major) => {
        const historical = findHistoricalMajorLine(
          generatedData,
          profile.province,
          profile.track,
          school.name,
          major.name
        );
        const threshold = historical?.minRank
          ? Number(historical.minRank)
          : Math.round((school.baseRank + major.offset) * provinceFactor);
        const ratio = profile.rank / Math.max(1, threshold);
        const tier = resolveTier(ratio, config);
        const proximityTier = resolveExtendedTier(ratio, config);

        if (!proximityTier || !passesConstraints(profile, school, major)) {
          return null;
        }

        const directionBonus = topDirectionNames.includes(major.direction) ? 34 : 0;
        const tagBonus = school.tags.reduce((sum, tag) => sum + (interestSet.has(tag) ? 10 : 0), 0);
        const cityBonus = cityPreferences.includes(school.city) ? 12 : 0;
        const schoolTagBonus = profile.schoolTags.reduce(
          (sum, tag) => sum + (school.levelTags.includes(tag) ? 9 : 0),
          0
        );
        const employmentBonus = profile.majorNeeds.includes("stableEmployment")
          ? school.employmentStability / 8
          : 0;
        const graduateBonus = profile.majorNeeds.includes("graduateFriendly")
          ? school.graduateRate / 9
          : 0;
        const majorPriorityBonus = profile.subjectConstraints.includes("majorPriority") ? 8 : 0;
        const cityPriorityBonus =
          profile.subjectConstraints.includes("cityPriority") && cityPreferences.includes(school.city)
            ? 8
            : 0;
        const popularityAdjustment =
          profile.majorNeeds.includes("hotMajors") && major.popularity === "hot"
            ? 6
            : profile.majorNeeds.includes("coldMajors") && major.popularity !== "hot"
              ? 5
              : 0;
        const lowScoreRescueBonus = profile.rank > 120000 ? 8 : 0;
        const resolvedTier = tier || (ratio <= config.rush * 1.12 ? "冲" : "保");

        return {
          source: "demo",
          tier: resolvedTier,
          tierClass: resolvedTier === "保" ? "safe" : resolvedTier === "稳" ? "steady" : "rush",
          university: school.name,
          city: school.city,
          nature: school.nature,
          major: major.name,
          tuition: historical?.tuition || school.tuition,
          threshold,
          year: historical?.year || null,
          minScore: historical?.minScore || null,
          subjectRequirement: historical?.subjectRequirement || "",
          confidence: buildConfidence(profile.rank, threshold, resolvedTier),
          score:
            100 -
            Math.min(60, (Math.abs(profile.rank - threshold) / Math.max(500, threshold)) * 100) +
            directionBonus +
            tagBonus +
            cityBonus +
            schoolTagBonus +
            employmentBonus +
            graduateBonus +
            majorPriorityBonus +
            cityPriorityBonus +
            popularityAdjustment +
            lowScoreRescueBonus,
          reason: buildReason(profile, school, major, threshold, resolvedTier, historical)
        };
      })
    )
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 180);
}

function mergeRecommendationPools(...pools) {
  const merged = [];
  const seen = new Set();

  pools.flat().forEach((item) => {
    const key = `${item.university}-${item.major}`;
    if (seen.has(key)) {
      return;
    }

    merged.push(item);
    seen.add(key);
  });

  return merged.sort((a, b) => b.score - a.score);
}

function buildRescueRecommendations(profile, directions, generatedData) {
  const latestYear = getLatestUniversityYear(generatedData, profile.province, profile.track);
  if (!latestYear) {
    return [];
  }

  const sourceRows = generatedData.universityMajorLines.filter(
    (item) =>
      item.province === profile.province &&
      Number(item.year) === Number(latestYear) &&
      (!profile.track || !item.track || item.track === profile.track) &&
      normalizeBatch(item.batch).includes("本科")
  );

  if (!sourceRows.length) {
    return [];
  }

  const rescueNote = " 当前候选用于补足低分段或偏好过严时的可报范围，系统已主动放宽城市和院校标签限制，优先保证本科线内有学校可填。";

  return sourceRows
    .map((row) => {
      const normalizedRow = enrichImportedRow(row, directions);
      if (isRestrictedSpecialProgram(normalizedRow, profile)) {
        return null;
      }
      const schoolMeta = matchStaticSchoolMeta(normalizedRow.university);
      const effectiveTuition = normalizedRow.tuition || schoolMeta?.tuition || 0;
      const threshold = Number(normalizedRow.minRank || 0);

      if (!threshold) {
        return null;
      }

      if (profile.maxTuition > 0 && effectiveTuition > profile.maxTuition) {
        return null;
      }

      if (
        profile.subjectConstraints.includes("publicOnly") &&
        schoolMeta &&
        !schoolMeta.levelTags.includes("publicOnly")
      ) {
        return null;
      }

      const tierMetrics = resolvePlanTierMetrics(profile, threshold);
      const candidateTier =
        tierMetrics.tier ||
        (tierMetrics.rankGap >= Math.max(1200, Math.round((tierMetrics.bands?.safeFallbackGap || 0) * 0.8))
          ? PLAN_TIER_SAFE
          : tierMetrics.rankGap >= -Math.round((tierMetrics.bands?.steadyNegativeGap || 0) * 0.9)
            ? PLAN_TIER_STEADY
            : null);

      if (!candidateTier) {
        return null;
      }

      const confidence = buildPlanConfidence(profile, threshold, candidateTier, tierMetrics);
      const rankSafetyBonus = tierMetrics.rankGap >= 0 ? 24 : 8;
      const admissionCountBonus = normalizedRow.admissionCount
        ? Math.min(14, Number(normalizedRow.admissionCount) / 2)
        : 0;

      return {
        source: "rescue",
        tier: candidateTier,
        tierClass: getPlanTierClass(candidateTier),
        university: normalizedRow.university,
        city: normalizedRow.city || schoolMeta?.city || "待核验",
        nature: schoolMeta?.nature || "本科院校",
        major: normalizedRow.major,
        tuition: effectiveTuition,
        threshold,
        year: normalizedRow.year,
        minScore: normalizedRow.minScore || null,
        subjectRequirement: normalizedRow.subjectRequirement || "",
        confidence,
        score:
          54 +
          rankSafetyBonus +
          admissionCountBonus +
          Math.min(24, Math.max(-18, tierMetrics.rankGap / 1800)) +
          (candidateTier === PLAN_TIER_SAFE ? 18 : candidateTier === PLAN_TIER_STEADY ? 10 : 2),
        reason: `${buildImportedReason(profile, normalizedRow, candidateTier, schoolMeta)}${rescueNote}`,
        admissionCount: normalizedRow.admissionCount,
        batch: normalizedRow.batch,
        notes: normalizedRow.notes,
        code: parseSchoolCode(normalizedRow.notes),
        groupName: parseGroupName(normalizedRow.notes),
        direction: normalizedRow.direction
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.admissionCount || 0) - (a.admissionCount || 0);
    })
    .slice(0, 160);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTierClassName(tier) {
  return tier === "淇?" ? "safe" : tier === "绋?" ? "steady" : "rush";
}

function createRankMargin(rank, ratio, min, max) {
  return Math.round(clampNumber(rank * ratio, min, max));
}

function getTierBands(profile, config) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const lowScoreBand = rank >= 180000;
  const safeRatio = config.safe >= 0.86 ? 0.045 : config.safe >= 0.78 ? 0.058 : 0.072;
  const rushRatio = config.rush >= 1.24 ? 0.1 : config.rush >= 1.16 ? 0.082 : 0.065;

  return {
    lowScoreBand,
    safePrimaryGap: createRankMargin(rank, safeRatio, lowScoreBand ? 3200 : 1800, lowScoreBand ? 16000 : 26000),
    safeFallbackGap: createRankMargin(rank, lowScoreBand ? 0.02 : 0.03, 1200, lowScoreBand ? 9000 : 12000),
    steadyPositiveGap: createRankMargin(rank, 0.028, 900, 10000),
    steadyNegativeGap: createRankMargin(rank, 0.038, 1200, lowScoreBand ? 14000 : 18000),
    rushNegativeGap: createRankMargin(rank, rushRatio, 2200, lowScoreBand ? 26000 : 22000)
  };
}

function resolveTierMetrics(profile, threshold, config) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const targetRank = Math.max(1, Number(threshold || 1));
  const rankGap = targetRank - rank;
  const gapRate = rankGap / rank;
  const bands = getTierBands(profile, config);
  let tier = null;
  let tierSource = "strict";

  if (rankGap >= bands.safePrimaryGap) {
    tier = "淇?";
  } else if (rankGap >= -bands.steadyNegativeGap && rankGap <= bands.steadyPositiveGap) {
    tier = "绋?";
  } else if (rankGap < 0 && rankGap >= -bands.rushNegativeGap) {
    tier = "鍐?";
  } else if (rankGap >= bands.safeFallbackGap) {
    tier = "淇?";
    tierSource = "fallback";
  } else if (
    rankGap >= -Math.round(bands.steadyNegativeGap * 1.18) &&
    rankGap <= Math.round(bands.steadyPositiveGap * 1.2)
  ) {
    tier = "绋?";
    tierSource = "fallback";
  }

  return {
    tier,
    tierSource,
    rankGap,
    gapRate,
    bands,
    isSafeEdge: rankGap >= bands.safeFallbackGap,
    isHighSafety: rankGap >= bands.safePrimaryGap
  };
}

function appendTierReason(reason, extra) {
  if (!extra || reason.includes(extra)) {
    return reason;
  }

  return `${reason}${extra}`;
}

function withTierPlacement(item, tier, extraReason = "") {
  return {
    ...item,
    tier,
    tierClass: getTierClassName(tier),
    reason: appendTierReason(item.reason, extraReason)
  };
}

function sortRushCandidates(items) {
  return [...items].sort((a, b) => {
    if (a.rankGap !== b.rankGap) {
      return a.rankGap - b.rankGap;
    }

    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }

    return b.score - a.score;
  });
}

function sortSteadyCandidates(items) {
  return [...items].sort((a, b) => {
    const aDistance = Math.abs(a.rankGap);
    const bDistance = Math.abs(b.rankGap);
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }

    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    return b.score - a.score;
  });
}

function sortSafeCandidates(items) {
  return [...items].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    if (b.rankGap !== a.rankGap) {
      return b.rankGap - a.rankGap;
    }

    return b.score - a.score;
  });
}

/*
function buildApplicationPlanV2(recommendations, profile, generatedData) {
  const grouped = pickTierSchoolsV2(recommendations, profile);
  const latestScoreRank = findNearbyScoreRank(
    generatedData,
    profile.province,
    profile.track,
    profile.score
  );
  const latestRankText = latestScoreRank?.rank
    ? `缁撳悎 ${latestScoreRank.year} 骞?${profile.province}${profile.track}绫讳綅娆¤〃锛屽綋鍓嶅垎鏁板搴斾綅娆＄害 ${latestScoreRank.rank}銆俙
    : "褰撳墠浣嶆涓昏渚濇嵁浣犲～鍐欑殑淇℃伅鍜屽凡瀵煎叆闄㈡牎绾挎暟鎹患鍚堝垽鏂€?;
  const lowScoreProfile = profile.rank > 120000;

  return [
    {
      tier: "鍐?",
      tierLabel: "鍐插埡蹇楁効",
      tierClass: "rush",
      explanation: `${latestRankText} 鍐插埡灞傚彧鏀鹃偅浜涘巻骞寸嚎姣斾綘褰撳墠浣嶆鏇撮珮銆佺浉瀵瑰綍鍙栨鐜囨洿浣庣殑鍘婚€夛紝鍔熻兘鏄€滃線涓婂啿鈥濓紝涓嶆槸鍏ㄩ儴鍘嬬${lowScoreProfile ? "锛涗綆鍒嗘鍏堜繚鏈锛屽啀璋堝钩鍙般€?" : "銆?"}`,
      schools: grouped.rush
    },
    {
      tier: "绋?",
      tierLabel: "涓诲姏蹇楁効",
      tierClass: "steady",
      explanation: `涓诲姏灞傛槸鏁翠唤琛ㄧ殑鏍稿績锛屼富瑕佹斁鍘嗗勾绾夸綅娆′笌浣犵浉瀵圭粏鍖归厤鐨勫鏍″拰涓撲笟缁勶紝鍗虫槸鈥滆兘鎶ャ€佽兘璇汇€佽兘鎺ュ彈鈥濈殑涓诲姏鍖恒€?`,
      schools: grouped.steady
    },
    {
      tier: "淇?",
      tierLabel: "淇濆簳蹇楁効",
      tierClass: "safe",
      explanation: `淇濆簳灞傚彧鏀鹃偅浜涘巻骞寸嚎鏄庢樉浣庝簬浣犲綋鍓嶄綅娆°€佹妸鎻¤緝楂樼殑鍘婚€夛紝鐩爣鏄妸婊戞。椋庨櫓鍘嬪埌鏈€浣庯紝涓嶆槸涓轰簡濂界湅锛岃€屾槸涓轰簡鐪熸鍏滃簳${lowScoreProfile ? "锛涗綆鍒嗘宸蹭紭鍏堟墿鍏呮洿瀹夊叏鐨勫彲鎶ラ€夐」锛屽厛纭繚鏈夊鍙笂銆?" : "銆?"}`,
      schools: grouped.safe
    }
  ];
}

function pickTierSchoolsV2(recommendations, profile) {
  const grouped = {
    rush: [],
    steady: [],
    safe: []
  };
  const targets = profile.rank > 120000
    ? { rush: 3, steady: 4, safe: 6 }
    : { rush: 3, steady: 4, safe: 5 };
  const used = new Set();
  const rushBucket = sortRushCandidates(recommendations.filter((item) => item.tier === "鍐?"));
  const steadyBucket = sortSteadyCandidates(recommendations.filter((item) => item.tier === "绋?"));
  const safeBucket = sortSafeCandidates(recommendations.filter((item) => item.tier === "淇?"));

  fillTierV2(grouped.rush, rushBucket, targets.rush, used);
  fillTierV2(grouped.steady, steadyBucket, targets.steady, used);
  fillTierV2(grouped.safe, safeBucket, targets.safe, used);

  if (grouped.safe.length < targets.safe) {
    const safeBackfill = sortSafeCandidates(
      recommendations
        .filter((item) => !used.has(`${item.university}-${item.major}`))
        .filter((item) => item.rankGap >= 0 && item.confidence >= 88)
        .map((item) =>
          item.tier === "淇?"
            ? item
            : withTierPlacement(item, "淇?", " 杩欎釜琚斁鍒颁繚搴曞眰锛屾槸涓轰簡琛ュ帤闃叉粦妗ｇ殑瀹夊叏鍨€?")
        )
    );
    fillTierV2(grouped.safe, safeBackfill, targets.safe, used);
  }

  if (grouped.steady.length < targets.steady) {
    const steadyBackfill = sortSteadyCandidates(
      recommendations
        .filter((item) => !used.has(`${item.university}-${item.major}`))
        .filter((item) => item.tier !== "鍐?" && item.rankGap >= -Math.round((item.bands?.steadyNegativeGap || 0) * 1.1))
        .map((item) =>
          item.tier === "绋?"
            ? item
            : withTierPlacement(item, "绋?", " 杩欎釜琚敤鏉ュ仛涓诲姏灞傝ˉ浣嶏紝椋庨櫓姣斿啿灞備綆锛屼絾姝ｅ紡濉姤鍓嶄粛瑕佸啀鏍稿涓€閬嶃€?")
        )
    );
    fillTierV2(grouped.steady, steadyBackfill, targets.steady, used);
  }

  if (grouped.rush.length < targets.rush) {
    const rushBackfill = sortRushCandidates(
      recommendations
        .filter((item) => !used.has(`${item.university}-${item.major}`))
        .filter((item) => item.rankGap < 0)
        .map((item) =>
          item.tier === "鍐?"
            ? item
            : withTierPlacement(item, "鍐?", " 杩欎釜灞炰簬鍐插埡琛ュ厖浣嶏紝闇€瑕佹壙鎷呬竴瀹氱殑褰曞彇椋庨櫓銆?")
        )
    );
    fillTierV2(grouped.rush, rushBackfill, targets.rush, used);
  }

  return grouped;
}

function fillTierV2(targetList, candidates, maxCount, used = new Set()) {
  for (const item of candidates) {
    if (targetList.length >= maxCount) {
      break;
    }

    const key = `${item.university}-${item.major}`;
    if (used.has(key)) {
      continue;
    }

    targetList.push(item);
    used.add(key);
  }
}

*/
function buildApplicationPlan(recommendations, profile, generatedData) {
  const grouped = pickTierSchools(recommendations, profile);
  const latestScoreRank = findNearbyScoreRank(
    generatedData,
    profile.province,
    profile.track,
    profile.score
  );
  const latestRankText = latestScoreRank?.rank
    ? `结合 ${latestScoreRank.year} 年 ${profile.province}${profile.track}类位次表，当前分数对应位次约 ${latestScoreRank.rank}。`
    : "当前位次主要依据你填写的信息和已导入院校线数据综合判断。";
  const lowScoreProfile = profile.rank > 120000;

  return [
    {
      tier: "冲",
      tierLabel: "冲刺志愿",
      tierClass: "rush",
      explanation: `${latestRankText} 冲刺层保留向上争取空间，但不会全部压高${lowScoreProfile ? "；低分段先保本科，再谈平台上探。" : "。"} `,
      schools: grouped.rush
    },
    {
      tier: "稳",
      tierLabel: "主力志愿",
      tierClass: "steady",
      explanation: `主力层优先保证可报、可读、可解释，是这张表真正的核心区${recommendations.some((item) => item.source === "imported") ? "，并优先参考广东真实导入数据。" : "。"} `,
      schools: grouped.steady
    },
    {
      tier: "保",
      tierLabel: "保底志愿",
      tierClass: "safe",
      explanation: `保底层必须留足，不是好看，而是为了防止滑档和专业组判断失误${lowScoreProfile ? "；系统已自动放宽部分城市和院校标签限制，先确保本科线内任何分数段都有学校可报。" : "。"} `,
      schools: grouped.safe
    }
  ];
}

function pickTierSchools(recommendations, profile) {
  const grouped = {
    rush: [],
    steady: [],
    safe: []
  };

  const targets = profile.rank > 120000
    ? { rush: 3, steady: 5, safe: 6 }
    : { rush: 3, steady: 4, safe: 4 };

  const buckets = {
    rush: recommendations.filter((item) => item.tier === "冲"),
    steady: recommendations.filter((item) => item.tier === "稳"),
    safe: recommendations.filter((item) => item.tier === "保")
  };

  Object.entries(targets).forEach(([key, target]) => {
    fillTier(grouped[key], buckets[key], target);
  });

  if (grouped.safe.length < targets.safe) {
    fillTier(
      grouped.safe,
      recommendations.filter((item) => item.tier !== "冲"),
      targets.safe
    );
  }

  if (grouped.steady.length < targets.steady) {
    fillTier(grouped.steady, recommendations, targets.steady);
  }

  if (grouped.rush.length < targets.rush) {
    fillTier(grouped.rush, recommendations, targets.rush);
  }

  return grouped;
}

function fillTier(targetList, candidates, maxCount) {
  const seen = new Set(targetList.map((item) => `${item.university}-${item.major}`));

  for (const item of candidates) {
    if (targetList.length >= maxCount) {
      break;
    }

    const key = `${item.university}-${item.major}`;
    if (seen.has(key)) {
      continue;
    }

    targetList.push(item);
    seen.add(key);
  }
}

function buildProfileDiagnosis(profile, directions, recommendations, applicationPlan, generatedData) {
  const missingCoreFields = [];

  if (!profile.province) missingCoreFields.push("省份");
  if (!profile.examMode) missingCoreFields.push("高考模式");
  if (!profile.score) missingCoreFields.push("高考分数");
  if (!profile.rank) missingCoreFields.push("全省位次");
  if (!profile.track) missingCoreFields.push("科类");
  if (!profile.selectedSubjects?.length) missingCoreFields.push("选考科目");

  const topDirections = directions.slice(0, 3).map((item) => item.name);
  const coverageRate = estimateCoverageRate(profile);
  const specialPlanHints = buildSpecialPlanHints(profile);
  const riskProfile = buildRiskProfile(profile, applicationPlan);
  const adjustmentAdvice = profile.willingAdjustment
    ? "普通批建议在可接受范围内服从调剂，避免因为专业排序过满导致退档。"
    : "你明确倾向不服从调剂，务必确保每个专业组内所有专业都能接受。";
  const latestRankRow = findNearbyScoreRank(generatedData, profile.province, profile.track, profile.score);
  const lowScoreRescueActive = profile.rank > 120000 || applicationPlan[2]?.schools.length >= 5;

  return {
    completenessOk: missingCoreFields.length === 0,
    missingCoreFields,
    coverageRate,
    topDirections,
    specialPlanHints,
    riskProfile,
    adjustmentAdvice,
    scoreRankReference: latestRankRow
      ? `${latestRankRow.year} 年 ${profile.province}${profile.track}类 ${profile.score} 分约对应位次 ${latestRankRow.rank}`
      : "暂未匹配到同省同科类分数位次对照",
    fallbackNotice:
      recommendations.length >= 12
        ? "当前已扩展到足够的本科批候选范围。"
        : "当前真实数据候选仍偏少，已启用扩圈与演示级兜底推荐。",
    lowScoreRescueActive,
    rescueSummary: lowScoreRescueActive
      ? "系统已自动放宽部分城市、层次和热门标签限制，先确保本科线内任何分数段都有学校可报。"
      : "当前推荐主要按你的原始偏好筛选，放宽策略介入较少。",
    checklist: [
      "确认院校代码与专业代码",
      "逐条核对选科要求",
      "核对学费、城市与办学性质",
      "检查调剂接受范围是否真实可接受",
      "保底志愿至少预留 3 个以上"
    ]
  };
}

function buildLocalSummary(profile, directions, recommendations, applicationPlan) {
  const topDirections = directions.slice(0, 3).map((item) => item.name).join("、");
  const risk = riskConfig[profile.risk];
  const rushCount = applicationPlan[0]?.schools.length || 0;
  const safeCount = applicationPlan[2]?.schools.length || 0;
  const latestSource = recommendations.some((item) => item.source === "imported")
    ? "已优先采用你当前省份的真实导入本科批数据"
    : "当前主要依据内置院校模型与演示线数据";

  return {
    overview: `从当前画像看，你更适合优先围绕 ${topDirections} 这几个方向做志愿布局。${latestSource}，所以不只看分数，还会看位次、专业组、城市偏好和现实约束。`,
    strategy: `${risk.strategy} 当前正式表里“冲”层约 ${rushCount} 个，“保”层约 ${safeCount} 个。分数靠近本科线时，策略重点不是盲冲，而是先保证能报、能录、能接受。`,
    careerAdvice:
      "先想清楚未来 5 到 10 年更想靠什么吃饭，再倒推学校和专业。对广东考生来说，专业组里能不能接受、毕业出口稳不稳，比一味盯学校名字更重要。",
    riskAlerts: [
      "正式填报前，仍需核对广东省教育考试院和高校招生章程，聊天建议不能替代最终投档规则。",
      "如果你对城市、学费、调剂限制非常敏感，建议最后一轮把这些条件再做一次人工筛查。",
      "专业组最低位次不等于你想读专业的实际位次，尤其要防止“组线稳、专业不稳”的错觉。"
    ]
  };
}

function enrichImportedRow(row, directions) {
  const matchedDirection = inferDirectionFromMajor(row.major, directions);
  const schoolMeta = matchStaticSchoolMeta(row.university);

  return {
    ...row,
    city: schoolMeta?.city || parseCityFromNotes(row.notes) || "",
    direction: matchedDirection
  };
}

function inferDirectionFromMajor(major, directions) {
  const topDirections = directions.slice(0, 8).map((item) => item.name);
  const normalizedMajor = String(major || "");

  for (const alias of MAJOR_DIRECTION_ALIAS) {
    if (alias.keywords.some((keyword) => normalizedMajor.includes(keyword))) {
      return alias.direction;
    }
  }

  return topDirections[0] || "综合本科";
}

function matchStaticSchoolMeta(university) {
  return universityCatalog.find((item) => item.name === university) || null;
}

const PHYSICS_TRACK_REQUIRED_KEYWORDS = [
  "计算机",
  "软件",
  "人工智能",
  "智能",
  "数据科学",
  "大数据",
  "网络工程",
  "信息安全",
  "电子信息",
  "通信工程",
  "电气",
  "自动化",
  "机械",
  "机器人工程",
  "智能制造",
  "土木",
  "建筑学",
  "数学",
  "物理",
  "统计",
  "临床医学",
  "口腔医学",
  "药学",
  "化学",
  "应用化学",
  "化工",
  "材料",
  "能源",
  "航空",
  "航天",
  "生物工程",
  "食品科学",
  "环境工程",
  "医学检验",
  "医学影像",
  "预防医学",
  "微电子",
  "集成电路"
];

const CHEMISTRY_REQUIRED_KEYWORDS = [
  "临床医学",
  "口腔医学",
  "药学",
  "应用化学",
  "化学",
  "化工",
  "材料",
  "制药",
  "生物工程",
  "食品科学",
  "环境工程",
  "医学检验",
  "医学影像",
  "预防医学"
];

function buildCandidateSubjectSet(profile) {
  return new Set([
    ...(Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : []),
    profile.track
  ].filter(Boolean));
}

function requirementMentions(requirementText, keyword) {
  return String(requirementText || "").includes(keyword);
}

function matchesImportedSubjectRequirement(profile, subjectRequirement) {
  const requirementText = String(subjectRequirement || "").trim();
  if (!requirementText || requirementText.includes("不限")) {
    return true;
  }

  const candidateSubjects = buildCandidateSubjectSet(profile);
  const requiredSubjects = ["物理", "历史", "化学", "生物", "政治", "地理"].filter((subject) =>
    requirementMentions(requirementText, subject)
  );

  if (!requiredSubjects.length) {
    return true;
  }

  return requiredSubjects.every((subject) => candidateSubjects.has(subject));
}

function matchesStructuredSubjectRule(profile, subjectRule) {
  if (!subjectRule || typeof subjectRule !== "object") {
    return true;
  }

  const candidateSubjects = buildCandidateSubjectSet(profile);
  const allowedTracks = Array.isArray(subjectRule.allowedTracks) ? subjectRule.allowedTracks : [];
  const requiredSubjects = Array.isArray(subjectRule.requiredSubjects) ? subjectRule.requiredSubjects : [];
  const oneOfSubjects = Array.isArray(subjectRule.oneOfSubjects) ? subjectRule.oneOfSubjects : [];
  const forbiddenSubjects = Array.isArray(subjectRule.forbiddenSubjects) ? subjectRule.forbiddenSubjects : [];

  if (allowedTracks.length && !allowedTracks.includes(profile.track)) {
    return false;
  }

  if (requiredSubjects.length && !requiredSubjects.every((subject) => candidateSubjects.has(subject))) {
    return false;
  }

  if (oneOfSubjects.length && !oneOfSubjects.some((subject) => candidateSubjects.has(subject))) {
    return false;
  }

  if (forbiddenSubjects.length && forbiddenSubjects.some((subject) => candidateSubjects.has(subject))) {
    return false;
  }

  return true;
}

function inferHeuristicMajorRequirement(majorName, direction = "") {
  const text = `${majorName || ""} ${direction || ""}`;
  const needsPhysicsTrack = PHYSICS_TRACK_REQUIRED_KEYWORDS.some((keyword) => text.includes(keyword));
  const needsChemistry = CHEMISTRY_REQUIRED_KEYWORDS.some((keyword) => text.includes(keyword));

  return {
    needsPhysicsTrack,
    needsChemistry
  };
}

function passesMajorSubjectEligibility(profile, majorName, direction = "", subjectRequirement = "", subjectRule = null) {
  if (!matchesStructuredSubjectRule(profile, subjectRule)) {
    return false;
  }

  if (!matchesImportedSubjectRequirement(profile, subjectRequirement)) {
    return false;
  }

  const heuristicRequirement = inferHeuristicMajorRequirement(majorName, direction);
  const candidateSubjects = buildCandidateSubjectSet(profile);

  if (heuristicRequirement.needsPhysicsTrack && profile.track !== "物理") {
    return false;
  }

  if (heuristicRequirement.needsChemistry && !candidateSubjects.has("化学")) {
    return false;
  }

  return true;
}

function passesImportedConstraints(profile, row, schoolMeta, tuition) {
  if (profile.maxTuition > 0 && tuition > profile.maxTuition) {
    return false;
  }

  if (!passesMajorSubjectEligibility(profile, row.major, row.direction, row.subjectRequirement, row.subjectRule)) {
    return false;
  }

  if (profile.subjectConstraints.includes("publicOnly") && schoolMeta && !schoolMeta.levelTags.includes("publicOnly")) {
    return false;
  }

  if (
    profile.schoolTags.includes("provincialCapital") &&
    schoolMeta &&
    !schoolMeta.levelTags.includes("provincialCapital")
  ) {
    return false;
  }

  if (profile.schoolTags.includes("tier1") && schoolMeta && !schoolMeta.levelTags.includes("tier1")) {
    return false;
  }

  if (profile.schoolTags.includes("985") && schoolMeta && !schoolMeta.levelTags.includes("985")) {
    return false;
  }

  if (profile.schoolTags.includes("211") && schoolMeta && !schoolMeta.levelTags.includes("211")) {
    return false;
  }

  if (
    profile.schoolTags.includes("doubleFirstClass") &&
    schoolMeta &&
    !schoolMeta.levelTags.includes("doubleFirstClass")
  ) {
    return false;
  }

  if (
    !profile.subjectConstraints.includes("outOfProvinceOk") &&
    profile.preferredCities &&
    !splitText(profile.preferredCities).includes("广东") &&
    schoolMeta &&
    schoolMeta.city &&
    !splitText(profile.preferredCities).includes(schoolMeta.city)
  ) {
    return false;
  }

  return true;
}

function passesConstraints(profile, school, major) {
  if (profile.maxTuition > 0 && school.tuition > profile.maxTuition) {
    return false;
  }

  if (!passesMajorSubjectEligibility(profile, major?.name, major?.direction, "", major?.subjectRule || null)) {
    return false;
  }

  if (profile.subjectConstraints.includes("publicOnly") && !school.levelTags.includes("publicOnly")) {
    return false;
  }

  if (profile.schoolTags.includes("provincialCapital") && !school.levelTags.includes("provincialCapital")) {
    return false;
  }

  if (profile.schoolTags.includes("tier1") && !school.levelTags.includes("tier1")) {
    return false;
  }

  if (profile.schoolTags.includes("985") && !school.levelTags.includes("985")) {
    return false;
  }

  if (profile.schoolTags.includes("211") && !school.levelTags.includes("211")) {
    return false;
  }

  if (
    profile.schoolTags.includes("doubleFirstClass") &&
    !school.levelTags.includes("doubleFirstClass")
  ) {
    return false;
  }

  return true;
}

function resolveTier(ratio, config) {
  if (ratio <= config.safe) {
    return "保";
  }

  if (ratio <= config.steady) {
    return "稳";
  }

  if (ratio <= config.rush) {
    return "冲";
  }

  return null;
}

function resolveExtendedTier(ratio, config) {
  if (ratio <= Math.max(config.safe * 1.32, 1.3)) {
    return "保";
  }

  if (ratio <= Math.max(config.steady * 1.2, 1.16)) {
    return "稳";
  }

  if (ratio <= Math.max(config.rush * 1.24, 1.26)) {
    return "冲";
  }

  return null;
}

function buildReason(profile, school, major, threshold, tier, historical) {
  const parts = [
    `${school.name}位于${school.city}，定位为${school.nature}。`,
    historical?.year
      ? `已匹配到 ${historical.year} 年导入数据，该专业最低位次参考约为 ${threshold} 名。`
      : `根据当前演示版位次模型估算，该专业目标位次约在 ${threshold} 名左右。`
  ];

  if (profile.careerPlan) {
    parts.push(`你的职业规划提到“${shorten(profile.careerPlan, 18)}”，与该方向具备一定匹配度。`);
  }

  if (tier === "冲") {
    parts.push("适合放在冲刺层，用来争取更高平台。");
  } else if (tier === "稳") {
    parts.push("适合作为主力志愿，录取把握和匹配度更平衡。");
  } else {
    parts.push("适合作为保底志愿，优先保证录取结果。");
  }

  return parts.join("");
}

function buildImportedReason(profile, row, tier, schoolMeta) {
  const parts = [
    `${row.university} 在 ${row.year} 年 ${profile.province}${profile.track}类 ${normalizeBatch(row.batch)} 中，${row.major} 的最低位次约为 ${row.minRank}。`
  ];

  if (row.admissionCount) {
    parts.push(`该组计划数约 ${row.admissionCount}。`);
  }

  if (row.subjectRequirement) {
    parts.push(`选科要求为“${row.subjectRequirement}”。`);
  }

  if (profile.careerPlan) {
    parts.push(`结合你提到的“${shorten(profile.careerPlan, 16)}”，这条线更适合拿来做 ${tier} 层判断。`);
  }

  if (schoolMeta?.city) {
    parts.push(`院校所在城市为 ${schoolMeta.city}。`);
  }

  if (tier === "冲") {
    parts.push("这类更像“够一够”的位置，可以冲，但别全部压在这里。");
  } else if (tier === "稳") {
    parts.push("这类更适合做主力区，既有希望也更可控。");
  } else {
    parts.push("这类更适合拿来托底，关键是保住本科和可接受专业组。");
  }

  return parts.join("");
}

function buildConfidence(rank, threshold, tier) {
  const confidenceBase = tier === "保" ? 88 : tier === "稳" ? 78 : 64;
  const confidence =
    confidenceBase -
    Math.min(22, (Math.abs(rank - threshold) / Math.max(threshold, 1)) * 100);

  return Math.max(55, Math.round(confidence));
}

function normalizeBatch(batch) {
  return String(batch || "").replace(/[\s]/g, "") || "本科批";
}

function parseSchoolCode(notes) {
  const matched = String(notes || "").match(/院校代码[:：]([0-9]+)/);
  return matched?.[1] || "";
}

function parseGroupName(notes) {
  const matched = String(notes || "").match(/专业组[:：]([^;；]+)/);
  return matched?.[1] || "";
}

function parseCityFromNotes(notes) {
  const text = String(notes || "");
  const cityTokens = ["广州", "深圳", "北京", "上海", "杭州", "南京", "苏州", "武汉", "西安", "成都", "长沙", "宁波", "温州"];
  return cityTokens.find((city) => text.includes(city)) || "";
}

function isRestrictedSpecialProgram(row, profile) {
  const text = `${row.university || ""} ${row.major || ""} ${row.notes || ""}`;
  const specialProgramKeywords = [
    "少数民族",
    "民族班",
    "国家专项",
    "地方专项",
    "高校专项",
    "公费师范",
    "优师计划",
    "定向",
    "乡村振兴"
  ];

  if (!specialProgramKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }

  if (text.includes("少数民族") || text.includes("民族班")) {
    return profile.candidateType !== "special";
  }

  if (text.includes("公费师范") || text.includes("优师计划") || text.includes("定向")) {
    return !profile.specialPlans.includes("teacherProgram");
  }

  return !(
    profile.specialPlans.includes("nationalSpecial") ||
    profile.specialPlans.includes("localSpecial") ||
    profile.specialPlans.includes("collegeSpecial") ||
    profile.candidateType === "special" ||
    profile.candidateType === "rural"
  );
}

function shorten(text, length) {
  return text.length <= length ? text : `${text.slice(0, length)}...`;
}

function estimateCoverageRate(profile) {
  if (profile.track === "历史") {
    return profile.selectedSubjects.includes("政治") ? 64 : 56;
  }

  if (profile.selectedSubjects.includes("化学") && profile.selectedSubjects.includes("生物")) {
    return 96;
  }

  if (profile.selectedSubjects.includes("化学")) {
    return 88;
  }

  return 76;
}

function buildSpecialPlanHints(profile) {
  const hints = [];

  if (profile.candidateType === "rural" || profile.specialPlans.includes("localSpecial")) {
    hints.push("可重点核查地方专项计划资格，广东考生常见于县域和农村户籍场景。");
  }

  if (profile.specialPlans.includes("nationalSpecial")) {
    hints.push("如涉及国家专项，请优先核对户籍、学籍连续年限和实施区域资格。");
  }

  if (profile.specialPlans.includes("collegeSpecial")) {
    hints.push("高校专项更适合成绩较强、农村背景明确的考生，需关注报名时间节点。");
  }

  if (!hints.length) {
    hints.push("当前未发现强专项信号，如有农村户籍、贫困地区或定向培养资格，建议补充。");
  }

  return hints;
}

function buildRiskProfile(profile, applicationPlan) {
  const rushCount = applicationPlan[0]?.schools.length || 0;
  const steadyCount = applicationPlan[1]?.schools.length || 0;
  const safeCount = applicationPlan[2]?.schools.length || 0;
  const safeSchools = applicationPlan[2]?.schools || [];
  const safeHighConfidenceCount = safeSchools.filter((item) => Number(item.confidence || 0) >= 90).length;
  const safeNearlyCertainCount = safeSchools.filter((item) => Number(item.confidence || 0) >= 93).length;
  const preferenceAxis = profile.subjectConstraints.includes("majorPriority")
    ? "major"
    : profile.subjectConstraints.includes("cityPriority")
      ? "city"
      : "school";
  const recommendation = preferenceAxis === "major"
    ? "你当前更像专业优先，适合先锁定能接受的专业组，再倒推学校层次。"
    : preferenceAxis === "city"
      ? "你当前更像城市优先，后面要接受学校层次或专业热度的让步。"
      : "你当前更像学校平台优先，后面要重点防专业组内冷热差和调剂。";

  return {
    rushCount,
    steadyCount,
    safeCount,
    safeHighConfidenceCount,
    safeNearlyCertainCount,
    hasEnoughSafeOptions: safeCount >= 3 && safeHighConfidenceCount >= Math.min(3, safeCount),
    noAdjustmentSensitive: profile.majorNeeds.includes("noAdjustment") || !profile.willingAdjustment,
    cityPriorityStrong: profile.subjectConstraints.includes("cityPriority"),
    majorPriorityStrong: profile.subjectConstraints.includes("majorPriority"),
    preferenceAxis,
    recommendation:
      safeHighConfidenceCount > 0
        ? `${recommendation} 当前保底层里有 ${safeHighConfidenceCount} 个高把握选项，其中 ${safeNearlyCertainCount} 个接近兜底。`
        : `${recommendation} 当前保底层还不够厚，正式填报前建议继续补强更安全的去向。`
  };
}

const PLAN_TIER_RUSH = "\u51b2";
const PLAN_TIER_STEADY = "\u7a33";
const PLAN_TIER_SAFE = "\u4fdd";
const PLAN_TIER_LABELS = {
  [PLAN_TIER_RUSH]: "\u51b2\u523a\u5fd7\u613f",
  [PLAN_TIER_STEADY]: "\u4e3b\u529b\u5fd7\u613f",
  [PLAN_TIER_SAFE]: "\u4fdd\u5e95\u5fd7\u613f"
};

function clampPlanNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPlanTierClass(tier) {
  return tier === PLAN_TIER_SAFE ? "safe" : tier === PLAN_TIER_STEADY ? "steady" : "rush";
}

function createPlanRankMargin(rank, ratio, min, max) {
  return Math.round(clampPlanNumber(rank * ratio, min, max));
}

function getPlanTierBands(profile) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const lowScoreBand = rank >= 180000;

  return {
    lowScoreBand,
    safePrimaryGap: createPlanRankMargin(rank, lowScoreBand ? 0.12 : 0.09, lowScoreBand ? 4200 : 2600, lowScoreBand ? 24000 : 32000),
    safeFallbackGap: createPlanRankMargin(rank, lowScoreBand ? 0.065 : 0.055, 2200, lowScoreBand ? 15000 : 18000),
    safeMaxGap: createPlanRankMargin(rank, 0.3, 5000, lowScoreBand ? 60000 : 40000),
    steadyPositiveGap: createPlanRankMargin(rank, 0.012, 500, 4200),
    steadyNegativeGap: createPlanRankMargin(rank, lowScoreBand ? 0.02 : 0.018, 800, lowScoreBand ? 7600 : 9000),
    rushNegativeGap: createPlanRankMargin(rank, lowScoreBand ? 0.045 : 0.035, 1200, lowScoreBand ? 9500 : 8000),
    rushMaxNegativeGap: createPlanRankMargin(rank, lowScoreBand ? 0.07 : 0.055, 1800, lowScoreBand ? 14500 : 12000)
  };
}

function resolvePlanTierMetrics(profile, threshold) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const targetRank = Math.max(1, Number(threshold || 1));
  const rankGap = targetRank - rank;
  const gapRate = rankGap / rank;
  const bands = getPlanTierBands(profile);
  let tier = null;
  let tierSource = "strict";

  if (rankGap >= bands.safePrimaryGap && rankGap <= bands.safeMaxGap) {
    tier = PLAN_TIER_SAFE;
  } else if (rankGap >= -bands.steadyNegativeGap && rankGap <= bands.steadyPositiveGap) {
    tier = PLAN_TIER_STEADY;
  } else if (rankGap < 0 && rankGap >= -bands.rushNegativeGap && rankGap >= -bands.rushMaxNegativeGap) {
    tier = PLAN_TIER_RUSH;
  } else if (rankGap >= bands.safeFallbackGap && rankGap <= bands.safeMaxGap) {
    tier = PLAN_TIER_SAFE;
    tierSource = "fallback";
  } else if (
    rankGap >= -Math.round(bands.steadyNegativeGap * 1.18) &&
    rankGap <= Math.round(bands.steadyPositiveGap * 1.2)
  ) {
    tier = PLAN_TIER_STEADY;
    tierSource = "fallback";
  }

  return {
    tier,
    tierSource,
    rankGap,
    gapRate,
    bands
  };
}

function buildPlanConfidence(profile, threshold, tier, tierMetrics) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const rankGap = Number.isFinite(tierMetrics?.rankGap)
    ? Number(tierMetrics.rankGap)
    : Math.max(1, Number(threshold || 1)) - rank;
  const gapRate = rankGap / rank;
  const tierFloor = tier === PLAN_TIER_SAFE ? 88 : tier === PLAN_TIER_STEADY ? 72 : 58;
  const tierBase = tier === PLAN_TIER_SAFE ? 91 : tier === PLAN_TIER_STEADY ? 80 : 66;
  let adjustment = 0;

  if (tier === PLAN_TIER_SAFE) {
    adjustment = Math.min(7, Math.max(-2, gapRate * 48));
  } else if (tier === PLAN_TIER_STEADY) {
    adjustment = Math.max(-7, 4 - Math.abs(gapRate) * 82);
  } else {
    adjustment = Math.max(-9, Math.min(4, (-gapRate) * 34));
  }

  return Math.round(clampPlanNumber(tierBase + adjustment, tierFloor, 97));
}

function normalizeRecommendationPoolForPlanV3(recommendations, profile) {
  return recommendations
    .map((item) => {
      const threshold = Number(item.threshold || 0);
      const tierMetrics = resolvePlanTierMetrics(profile, threshold);
      const tier = tierMetrics.tier || (tierMetrics.rankGap >= 0 ? PLAN_TIER_SAFE : PLAN_TIER_RUSH);

      return {
        ...item,
        tier,
        tierClass: getPlanTierClass(tier),
        confidence: buildPlanConfidence(profile, threshold, tier, tierMetrics),
        rankGap: tierMetrics.rankGap,
        gapRate: tierMetrics.gapRate,
        bands: tierMetrics.bands,
        tierSource: tierMetrics.tierSource
      };
    })
    .filter((item) => {
      if (!item?.bands) {
        return false;
      }

      if (item.tier === PLAN_TIER_SAFE) {
        return item.rankGap >= item.bands.safeFallbackGap && item.rankGap <= item.bands.safeMaxGap;
      }

      if (item.tier === PLAN_TIER_STEADY) {
        return item.rankGap >= -item.bands.steadyNegativeGap && item.rankGap <= item.bands.steadyPositiveGap;
      }

      if (item.tier === PLAN_TIER_RUSH) {
        return item.rankGap < 0 && Math.abs(item.rankGap) <= item.bands.rushMaxNegativeGap;
      }

      return false;
    });
}

function sortPlanRushCandidates(items) {
  return [...items].sort((a, b) => {
    const aDistance = Math.abs(a.rankGap);
    const bDistance = Math.abs(b.rankGap);
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }
    return b.score - a.score;
  });
}

function sortPlanSteadyCandidates(items) {
  return [...items].sort((a, b) => {
    const aDistance = Math.abs(a.rankGap);
    const bDistance = Math.abs(b.rankGap);
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.score - a.score;
  });
}

function sortPlanSafeCandidates(items) {
  return [...items].sort((a, b) => {
    const aCertain = Number(a.confidence || 0) >= 92 ? 1 : 0;
    const bCertain = Number(b.confidence || 0) >= 92 ? 1 : 0;
    if (bCertain !== aCertain) {
      return bCertain - aCertain;
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    if (b.rankGap !== a.rankGap) {
      return b.rankGap - a.rankGap;
    }
    return b.score - a.score;
  });
}

function enrichTierExplanation(tier, school) {
  if (!school) {
    return "";
  }

  const confidenceText = school.confidence ? `当前置信度约 ${school.confidence}` : "当前置信度待核验";

  if (tier === PLAN_TIER_RUSH) {
    return ` 例如 ${school.university} 的 ${school.major}，它的历年线高于你当前位次，所以只能放在冲刺层，属于“可以争取，但不能拿来当主力”的位置。${confidenceText}。`;
  }

  if (tier === PLAN_TIER_STEADY) {
    return ` 例如 ${school.university} 的 ${school.major}，它和你当前位次更接近，适合放在主力层承担“稳住结果”的作用。${confidenceText}。`;
  }

  return ` 例如 ${school.university} 的 ${school.major}，它的历年线明显低于你当前位次，所以才能进入保底层，目标就是尽量不给滑档留口子。${confidenceText}。`;
}

function appendPlanReason(reason, extra) {
  if (!extra || reason.includes(extra)) {
    return reason;
  }
  return `${reason}${extra}`;
}

function withPlanTierPlacement(item, tier, extraReason = "") {
  return {
    ...item,
    tier,
    tierClass: getPlanTierClass(tier),
    reason: appendPlanReason(item.reason, extraReason)
  };
}

function fillPlanTier(targetList, candidates, maxCount, used = new Set()) {
  for (const item of candidates) {
    if (targetList.length >= maxCount) {
      break;
    }

    const key = `${item.university}-${item.major}`;
    if (used.has(key)) {
      continue;
    }

    targetList.push(item);
    used.add(key);
  }
}

function pickTierSchoolsV3(recommendations, profile) {
  const grouped = {
    rush: [],
    steady: [],
    safe: []
  };
  const targets = profile.rank > 120000
    ? { rush: 3, steady: 5, safe: 6 }
    : { rush: 3, steady: 4, safe: 4 };
  const used = new Set();

  fillPlanTier(
    grouped.rush,
    sortPlanRushCandidates(
      recommendations.filter(
        (item) =>
          item.tier === PLAN_TIER_RUSH &&
          item.rankGap < 0 &&
          Math.abs(item.rankGap) <= (item.bands?.rushMaxNegativeGap || 0)
      )
    ),
    targets.rush,
    used
  );
  fillPlanTier(
    grouped.steady,
    sortPlanSteadyCandidates(
      recommendations.filter(
        (item) =>
          item.tier === PLAN_TIER_STEADY &&
          item.rankGap >= -(item.bands?.steadyNegativeGap || 0) &&
          item.rankGap <= (item.bands?.steadyPositiveGap || 0)
      )
    ),
    targets.steady,
    used
  );
  fillPlanTier(
    grouped.safe,
    sortPlanSafeCandidates(
      recommendations.filter(
        (item) =>
          item.tier === PLAN_TIER_SAFE &&
          item.rankGap >= (item.bands?.safeFallbackGap || 0) &&
          item.rankGap <= (item.bands?.safeMaxGap || 0)
      )
    ),
    targets.safe,
    used
  );

  if (grouped.safe.length < targets.safe) {
    fillPlanTier(
      grouped.safe,
      sortPlanSafeCandidates(
        recommendations
          .filter((item) => !used.has(`${item.university}-${item.major}`))
          .filter(
            (item) =>
              item.rankGap >= (item.bands?.safeFallbackGap || 0) &&
              item.rankGap <= (item.bands?.safeMaxGap || 0) &&
              item.confidence >= 88
          )
          .map((item) =>
            item.tier === PLAN_TIER_SAFE
              ? item
              : withPlanTierPlacement(item, PLAN_TIER_SAFE, " 这条被上调到保底层，用来补强防滑档的安全垫。")
          )
      ),
      targets.safe,
      used
    );
  }

  if (grouped.safe.length < targets.safe) {
    fillPlanTier(
      grouped.safe,
      sortPlanSafeCandidates(
        recommendations
          .filter((item) => !used.has(`${item.university}-${item.major}`))
          .filter(
            (item) =>
              item.rankGap >= (item.bands?.safePrimaryGap || 0) &&
              item.rankGap <= (item.bands?.safeMaxGap || 0) &&
              item.confidence >= 92
          )
          .map((item) =>
            withPlanTierPlacement(
              item,
              PLAN_TIER_SAFE,
              " 这条作为高把握保底补位，优先用于压低滑档和调剂失控风险。"
            )
          )
      ),
      targets.safe,
      used
    );
  }

  if (grouped.steady.length < targets.steady) {
    fillPlanTier(
      grouped.steady,
      sortPlanSteadyCandidates(
        recommendations
          .filter((item) => !used.has(`${item.university}-${item.major}`))
          .filter(
            (item) =>
              item.tier !== PLAN_TIER_RUSH &&
              item.rankGap >= -(item.bands?.steadyNegativeGap || 0) &&
              item.rankGap <= (item.bands?.steadyPositiveGap || 0)
          )
          .map((item) =>
            item.tier === PLAN_TIER_STEADY
              ? item
              : withPlanTierPlacement(item, PLAN_TIER_STEADY, " 这条作为主力层补位，风险低于冲层，但正式填报前仍建议再核一遍。")
          )
      ),
      targets.steady,
      used
    );
  }

  if (grouped.rush.length < targets.rush) {
    fillPlanTier(
      grouped.rush,
      sortPlanRushCandidates(
        recommendations
          .filter((item) => !used.has(`${item.university}-${item.major}`))
          .filter(
            (item) =>
              item.rankGap < 0 &&
              Math.abs(item.rankGap) <= (item.bands?.rushMaxNegativeGap || 0)
          )
          .map((item) =>
            item.tier === PLAN_TIER_RUSH
              ? item
              : withPlanTierPlacement(item, PLAN_TIER_RUSH, " 这条作为冲刺补位，属于需要承担一定录取风险的选项。")
          )
      ),
      targets.rush,
      used
    );
  }

  return grouped;
}

function buildApplicationPlanV3(recommendations, profile, generatedData) {
  const grouped = pickTierSchoolsV3(recommendations, profile);
  const latestScoreRank = findNearbyScoreRank(
    generatedData,
    profile.province,
    profile.track,
    profile.score
  );
  const latestRankText = latestScoreRank?.rank
    ? `结合 ${latestScoreRank.year} 年 ${profile.province}${profile.track} 位次参考，当前分数对应位次约 ${latestScoreRank.rank}。`
    : "当前位次主要依据你填写的信息和已导入院校线数据综合判断。";
  const lowScoreProfile = profile.rank > 120000;

  return [
    {
      tier: PLAN_TIER_RUSH,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_RUSH],
      tierClass: "rush",
      explanation: `${latestRankText}冲刺层只放那些历年线比你当前位次更高、相对录取概率更低的去向，功能是“往上冲”，不是全部压在这里${lowScoreProfile ? "；低分段要先保本科，再谈平台。" : "。"}${enrichTierExplanation(PLAN_TIER_RUSH, grouped.rush[0])}`,
      schools: grouped.rush
    },
    {
      tier: PLAN_TIER_STEADY,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_STEADY],
      tierClass: "steady",
      explanation: `主力层是整份表的核心，主要放历年线与你相对细匹配的学校和专业组，也就是“能报、能读、能接受”的主力区。${enrichTierExplanation(PLAN_TIER_STEADY, grouped.steady[0])}`,
      schools: grouped.steady
    },
    {
      tier: PLAN_TIER_SAFE,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_SAFE],
      tierClass: "safe",
      explanation: `保底层只放那些历年线明显低于你当前位次、把握较高的去向，目标是把滑档风险压到最低，不是为了好看，而是为了真正兜底${lowScoreProfile ? "；低分段已优先扩充更安全的可报选项，先确保有学可上。" : "。"}${enrichTierExplanation(PLAN_TIER_SAFE, grouped.safe[0])}`,
      schools: grouped.safe
    }
  ];
}
