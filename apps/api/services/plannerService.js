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
import { getDataEngine } from "./dbService.js";
import { generateStructuredPlanningSummary } from "./llmService.js";
import {
  denormalizeProvinceName,
  normalizeProvinceCode
} from "../modules/data-engine/provinceCatalog.js";

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
  const aiSummaryData = aiSummary?.summary || null;

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
      overview: aiSummaryData?.overview || localSummary.overview,
      strategy: aiSummaryData?.strategy || localSummary.strategy,
      careerAdvice: aiSummaryData?.careerAdvice || localSummary.careerAdvice
    },
    diagnosis: profileDiagnosis,
    majorDirections: matchedDirections.slice(0, 6),
    applicationPlan,
    backupOptions,
    riskAlerts: aiSummaryData?.riskAlerts || localSummary.riskAlerts,
    meta: {
      analysisMode: aiSummaryData ? "llm" : "local",
      providerStatus: aiSummary?.providerStatus || {
        status: "local",
        provider: "local-fallback",
        code: "LOCAL_MODE"
      },
      dataSource: resolvePlannerDataSource(normalizedProfile, generatedData),
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
    .split(/[\s,锛屻€傦紱銆?]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreDirections(keywordPool) {
  return majorDirections
    .map((direction) => {
      const keywordMatches = direction.keywords.filter((keyword) =>
        keyword &&
        keywordPool.some(
          (token) =>
            token &&
            (token.includes(keyword) || keyword.includes(token))
        )
      ).length;
      const careerMatches = direction.careers.filter((career) =>
        career &&
        keywordPool.some(
          (token) =>
            token &&
            (career.includes(token) || token.includes(career))
        )
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

  const sourceRows = getImportedUniversityMajorLines(profile, generatedData, latestYear);

  const preferredRows = [];
  const relaxedRows = [];
  const relaxedPreferenceRows = [];

  sourceRows.forEach((row) => {
    const normalizedRow = enrichImportedRow(row, directions);
    if (isRestrictedSpecialProgram(normalizedRow, profile)) {
      return;
    }
    const schoolMeta = matchStaticSchoolMeta(normalizedRow.university);
    const effectiveTuition = normalizedRow.tuition || schoolMeta?.tuition || 0;

    const strictConstraintPass = passesImportedConstraintsWithOptions(
      profile,
      normalizedRow,
      schoolMeta,
      effectiveTuition
    );
    const relaxedPreferencePass =
      !strictConstraintPass &&
      passesImportedConstraintsWithOptions(profile, normalizedRow, schoolMeta, effectiveTuition, {
        relaxPreferences: true
      });

    if (!strictConstraintPass && !relaxedPreferencePass) {
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
    const softPreferenceRelaxed = relaxedPreferencePass && !strictConstraintPass;
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
    const metadataCompletenessBonus =
      (normalizedRow.city ? 6 : 0) +
      (effectiveTuition > 0 ? 8 : 0) +
      (normalizedRow.recommendedMajors?.length ? 8 : 0);
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
      city: normalizedRow.city || schoolMeta?.city || "校区待补录",
      nature: schoolMeta?.nature || "本科批院校",
      major: normalizedRow.displayMajor || normalizedRow.major,
      majorGroup: normalizedRow.isMajorGroup ? normalizedRow.major : "",
      recommendedMajors: normalizedRow.recommendedMajors || [],
      majorDetails: normalizedRow.recommendedMajorDetails || [],
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
        metadataCompletenessBonus +
        (softPreferenceRelaxed ? -20 : 0) +
        (normalizedRow.admissionCount > 0 ? Math.min(12, normalizedRow.admissionCount / 2) : 0),
      reason: appendSoftPreferenceRelaxNote(
        buildImportedReason(profile, normalizedRow, resolvedTier, schoolMeta),
        profile,
        softPreferenceRelaxed
      ),
      admissionCount: normalizedRow.admissionCount,
      batch: normalizedRow.batch,
      notes: normalizedRow.notes,
      code: normalizedRow.schoolCode || parseSchoolCode(normalizedRow.notes),
      groupName: parseGroupName(normalizedRow.notes),
      direction: normalizedRow.direction,
      softPreferenceRelaxed
    };

    if (softPreferenceRelaxed) {
      relaxedPreferenceRows.push(item);
    } else if (directionMatched || cityMatched || schoolTagBonus > 0 || interestBonus > 0) {
      preferredRows.push(item);
    } else {
      relaxedRows.push(item);
    }
  });

  const strictPool = [...preferredRows, ...relaxedRows].sort((a, b) => b.score - a.score);
  const relaxedPool = relaxedPreferenceRows.sort((a, b) => b.score - a.score);

  if (!shouldBackfillRelaxedPreferenceItems(profile, strictPool.length, sourceRows.length)) {
    return strictPool.slice(0, 240);
  }

  return [...strictPool, ...relaxedPool].slice(0, 240);
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

        const strictConstraintPass = passesConstraintsWithOptions(profile, school, major);
        const relaxedPreferencePass =
          !strictConstraintPass &&
          passesConstraintsWithOptions(profile, school, major, { relaxPreferences: true });

        if (!proximityTier || (!strictConstraintPass && !relaxedPreferencePass)) {
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
          profile.subjectConstraints.includes("cityPriority") &&
          cityPreferences.includes(school.city)
            ? 8
            : 0;
        const popularityAdjustment =
          profile.majorNeeds.includes("hotMajors") && major.popularity === "hot"
            ? 6
            : profile.majorNeeds.includes("coldMajors") && major.popularity !== "hot"
              ? 5
              : 0;
        const lowScoreRescueBonus = profile.rank > 120000 ? 8 : 0;
        const softPreferenceRelaxed = relaxedPreferencePass && !strictConstraintPass;
        const resolvedTier = tier || (ratio <= config.rush * 1.12 ? "冲" : "保");

        return {
          source: "demo",
          tier: resolvedTier,
          tierClass: resolvedTier === "保" ? "safe" : resolvedTier === "稳" ? "steady" : "rush",
          university: school.name,
          city: school.city,
          nature: school.nature,
          major: major.name,
          recommendedMajors: [major.name],
          majorDetails: buildSingleMajorDetail(school, major, historical?.subjectRequirement || ""),
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
            lowScoreRescueBonus +
            (softPreferenceRelaxed ? -16 : 0),
          reason: appendSoftPreferenceRelaxNote(
            buildReason(profile, school, major, threshold, resolvedTier, historical),
            profile,
            softPreferenceRelaxed
          ),
          softPreferenceRelaxed
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

  const sourceRows = getImportedUniversityMajorLines(profile, generatedData, latestYear);

  if (!sourceRows.length) {
    return [];
  }

  const rescueNote =
    " 当前候选用于补足低分段或偏好过严时的可报范围，系统已主动放宽城市和院校标签限制，优先保证本科线内有学校可填。";

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
        (tierMetrics.rankGap >=
        Math.max(1200, Math.round((tierMetrics.bands?.safeFallbackGap || 0) * 0.8))
          ? PLAN_TIER_SAFE
          : tierMetrics.rankGap >= -Math.round((tierMetrics.bands?.steadyNegativeGap || 0) * 0.9)
            ? PLAN_TIER_STEADY
            : null);

      if (!candidateTier) {
        return null;
      }

      const confidence = buildPlanConfidence(profile, threshold, candidateTier, tierMetrics);
      const idealGap =
        candidateTier === PLAN_TIER_SAFE
          ? Math.min(
              Math.round((tierMetrics.bands?.safePrimaryGap || 0) * 1.08),
              Math.round((tierMetrics.bands?.safeMaxGap || 0) * 0.68)
            )
          : candidateTier === PLAN_TIER_STEADY
            ? 0
            : -Math.round((tierMetrics.bands?.rushNegativeGap || 0) * 0.62);
      const distancePenalty = Math.min(
        28,
        Math.abs(tierMetrics.rankGap - idealGap) / (candidateTier === PLAN_TIER_SAFE ? 1700 : 1200)
      );
      const tierBaseScore =
        candidateTier === PLAN_TIER_SAFE ? 88 : candidateTier === PLAN_TIER_STEADY ? 90 : 84;
      const admissionCountBonus = normalizedRow.admissionCount
        ? Math.min(14, Number(normalizedRow.admissionCount) / 2)
        : 0;
      const sourceBonus =
        schoolMeta && schoolMeta.city && schoolMeta.city.includes("广州")
          ? 4
          : schoolMeta && schoolMeta.city && schoolMeta.city.includes("深圳")
            ? 3
            : 0;
      const metadataCompletenessBonus =
        (normalizedRow.city ? 4 : 0) +
        (effectiveTuition > 0 ? 6 : 0) +
        (normalizedRow.recommendedMajors?.length ? 6 : 0);

      return {
        source: "rescue",
        tier: candidateTier,
        tierClass: getPlanTierClass(candidateTier),
        university: normalizedRow.university,
        city: normalizedRow.city || schoolMeta?.city || "校区待补录",
        nature: schoolMeta?.nature || "本科院校",
        major: normalizedRow.displayMajor || normalizedRow.major,
        majorGroup: normalizedRow.isMajorGroup ? normalizedRow.major : "",
        recommendedMajors: normalizedRow.recommendedMajors || [],
        majorDetails: normalizedRow.recommendedMajorDetails || [],
        tuition: effectiveTuition,
        threshold,
        year: normalizedRow.year,
        minScore: normalizedRow.minScore || null,
        subjectRequirement: normalizedRow.subjectRequirement || "",
        confidence,
        score:
          tierBaseScore -
          distancePenalty +
          admissionCountBonus +
          sourceBonus +
          metadataCompletenessBonus +
          (candidateTier === PLAN_TIER_SAFE
            ? Math.min(6, confidence - 90)
            : Math.min(8, confidence - 72)),
        reason: `${buildImportedReason(profile, normalizedRow, candidateTier, schoolMeta)}${rescueNote}`,
        admissionCount: normalizedRow.admissionCount,
        batch: normalizedRow.batch,
        notes: normalizedRow.notes,
        code: normalizedRow.schoolCode || parseSchoolCode(normalizedRow.notes),
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
    .slice(0, 320);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTierClassName(tier) {
  return tier === "保" ? "safe" : tier === "稳" ? "steady" : "rush";
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
    safePrimaryGap: createRankMargin(
      rank,
      safeRatio,
      lowScoreBand ? 3200 : 1800,
      lowScoreBand ? 16000 : 26000
    ),
    safeFallbackGap: createRankMargin(
      rank,
      lowScoreBand ? 0.02 : 0.03,
      1200,
      lowScoreBand ? 9000 : 12000
    ),
    steadyPositiveGap: createRankMargin(rank, 0.028, 900, 10000),
    steadyNegativeGap: createRankMargin(rank, 0.038, 1200, lowScoreBand ? 14000 : 18000),
    rushNegativeGap: createRankMargin(rank, rushRatio, 2200, lowScoreBand ? 26000 : 22000)
  };
}

function _resolveTierMetrics(profile, threshold, config) {
  const rank = Math.max(1, Number(profile.rank || 1));
  const targetRank = Math.max(1, Number(threshold || 1));
  const rankGap = targetRank - rank;
  const gapRate = rankGap / rank;
  const bands = getTierBands(profile, config);
  let tier = null;
  let tierSource = "strict";

  if (rankGap >= bands.safePrimaryGap) {
    tier = "保";
  } else if (rankGap >= -bands.steadyNegativeGap && rankGap <= bands.steadyPositiveGap) {
    tier = "稳";
  } else if (rankGap < 0 && rankGap >= -bands.rushNegativeGap) {
    tier = "冲";
  } else if (rankGap >= bands.safeFallbackGap) {
    tier = "保";
    tierSource = "fallback";
  } else if (
    rankGap >= -Math.round(bands.steadyNegativeGap * 1.18) &&
    rankGap <= Math.round(bands.steadyPositiveGap * 1.2)
  ) {
    tier = "稳";
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

function _withTierPlacement(item, tier, extraReason = "") {
  return {
    ...item,
    tier,
    tierClass: getTierClassName(tier),
    reason: appendTierReason(item.reason, extraReason)
  };
}

function _sortRushCandidates(items) {
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

function _sortSteadyCandidates(items) {
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

function _sortSafeCandidates(items) {
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
    ? `缂佹挸鎮?${latestScoreRank.year} 楠?${profile.province}${profile.track}缁缍呭▎陇銆冮敍灞界秼閸撳秴鍨庨弫鏉款嚠鎼存柧缍呭▎锛勫 ${latestScoreRank.rank}閵嗕繖
    : "瑜版挸澧犳担宥嗩偧娑撴槒顩︽笟婵囧祦娴ｇ姴锝為崘娆戞畱娣団剝浼呴崪灞藉嚒鐎电厧鍙嗛梽銏＄墡缁炬寧鏆熼幑顔炬偅閸氬牆鍨介弬顓溾偓?;
  const lowScoreProfile = profile.rank > 120000;

  return [
    {
      tier: "閸?",
      tierLabel: "閸愭彃鍩¤箛妤佸姽",
      tierClass: "rush",
      explanation: `${latestRankText} 閸愭彃鍩＄仦鍌氬涧閺€楣冨亝娴滄稑宸婚獮瀵稿殠濮ｆ柧缍樿ぐ鎾冲娴ｅ秵顐奸弴鎾彯閵嗕胶娴夌€电懓缍嶉崣鏍洤閻滃洦娲挎担搴ｆ畱閸樺鈧绱濋崝鐔诲厴閺勵垪鈧粌绶氭稉濠傚暱閳ユ繐绱濇稉宥嗘Ц閸忋劑鍎撮崢瀣劮${lowScoreProfile ? "閿涙稐缍嗛崚鍡橆唽閸忓牅绻氶張顒傤潠閿涘苯鍟€鐠嬪牆閽╅崣鑸偓?" : "閵?"}`,
      schools: grouped.rush
    },
    {
      tier: "缁?",
      tierLabel: "娑撹濮忚箛妤佸姽",
      tierClass: "steady",
      explanation: `娑撹濮忕仦鍌涙Ц閺佺繝鍞ょ悰銊ф畱閺嶇绺鹃敍灞煎瘜鐟曚焦鏂侀崢鍡楀嬀缁惧じ缍呭▎鈥茬瑢娴ｇ姷娴夌€靛湱绮忛崠褰掑帳閻ㄥ嫬顒熼弽鈥虫嫲娑撴挷绗熺紒鍕剁礉閸楄櫕妲搁垾婊嗗厴閹躲儯鈧浇鍏樼拠姹団偓浣藉厴閹恒儱褰堥垾婵堟畱娑撹濮忛崠鎭掆偓?`,
      schools: grouped.steady
    },
    {
      tier: "娣?",
      tierLabel: "娣囨繂绨宠箛妤佸姽",
      tierClass: "safe",
      explanation: `娣囨繂绨崇仦鍌氬涧閺€楣冨亝娴滄稑宸婚獮瀵稿殠閺勫孩妯夋担搴濈艾娴ｇ姴缍嬮崜宥勭秴濞喡扳偓浣瑰Ω閹宦ょ窛妤傛娈戦崢濠氣偓澶涚礉閻╊喗鐖ｉ弰顖涘Ω濠婃垶銆傛搴ㄦ珦閸樺鍩岄張鈧担搴礉娑撳秵妲告稉杞扮啊婵傜晫婀呴敍宀冣偓灞炬Ц娑撹桨绨￠惇鐔割劀閸忔粌绨?{lowScoreProfile ? "閿涙稐缍嗛崚鍡橆唽瀹歌弓绱崗鍫熷⒖閸忓懏娲跨€瑰鍙忛惃鍕讲閹躲儵鈧銆嶉敍灞藉帥绾喕绻氶張澶婎劅閸欘垯绗傞妴?" : "閵?"}`,
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
  const rushBucket = sortRushCandidates(recommendations.filter((item) => item.tier === "閸?"));
  const steadyBucket = sortSteadyCandidates(recommendations.filter((item) => item.tier === "缁?"));
  const safeBucket = sortSafeCandidates(recommendations.filter((item) => item.tier === "娣?"));

  fillTierV2(grouped.rush, rushBucket, targets.rush, used);
  fillTierV2(grouped.steady, steadyBucket, targets.steady, used);
  fillTierV2(grouped.safe, safeBucket, targets.safe, used);

  if (grouped.safe.length < targets.safe) {
    const safeBackfill = sortSafeCandidates(
      recommendations
        .filter((item) => !used.has(`${item.university}-${item.major}`))
        .filter((item) => item.rankGap >= 0 && item.confidence >= 88)
        .map((item) =>
          item.tier === "娣?"
            ? item
            : withTierPlacement(item, "娣?", " 鏉╂瑤閲滅悮顐ｆ杹閸掗绻氭惔鏇炵湴閿涘本妲告稉杞扮啊鐞涖儱甯ら梼鍙夌拨濡楋絿娈戠€瑰鍙忛崹顐犫偓?")
        )
    );
    fillTierV2(grouped.safe, safeBackfill, targets.safe, used);
  }

  if (grouped.steady.length < targets.steady) {
    const steadyBackfill = sortSteadyCandidates(
      recommendations
        .filter((item) => !used.has(`${item.university}-${item.major}`))
        .filter((item) => item.tier !== "閸?" && item.rankGap >= -Math.round((item.bands?.steadyNegativeGap || 0) * 1.1))
        .map((item) =>
          item.tier === "缁?"
            ? item
            : withTierPlacement(item, "缁?", " 鏉╂瑤閲滅悮顐ゆ暏閺夈儱浠涙稉璇插鐏炲倽藟娴ｅ稄绱濇搴ㄦ珦濮ｆ柨鍟跨仦鍌欑秵閿涘奔绲惧锝呯础婵夘偅濮ら崜宥勭矝鐟曚礁鍟€閺嶇顕稉鈧柆宥冣偓?")
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
          item.tier === "閸?"
            ? item
            : withTierPlacement(item, "閸?", " 鏉╂瑤閲滅仦鐐扮艾閸愭彃鍩＄悰銉ュ帠娴ｅ稄绱濋棁鈧憰浣瑰閹峰懍绔寸€规氨娈戣ぐ鏇炲絿妞嬪酣娅撻妴?")
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
function _buildApplicationPlan(recommendations, profile, generatedData) {
  const grouped = pickTierSchools(recommendations, profile);
  const latestScoreRank = findNearbyScoreRank(
    generatedData,
    profile.province,
    profile.track,
    profile.score
  );
  const latestRankText = latestScoreRank?.rank
    ? `结合 ${latestScoreRank.year} 年 ${profile.province}${profile.track} 位次表，当前分数对应位次约 ${latestScoreRank.rank}。`
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

  const targets =
    profile.rank > 120000 ? { rush: 3, steady: 5, safe: 6 } : { rush: 3, steady: 4, safe: 4 };

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

function buildProfileDiagnosis(
  profile,
  directions,
  recommendations,
  applicationPlan,
  generatedData
) {
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
  const latestRankRow = findNearbyScoreRank(
    generatedData,
    profile.province,
    profile.track,
    profile.score
  );
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
  const topDirections = directions
    .slice(0, 3)
    .map((item) => item.name)
    .join("、");
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
  const schoolMeta = matchStaticSchoolMeta(row.university);
  const schoolCode = parseSchoolCode(row.notes);
  const recommendedMajors = inferRecommendedMajorsFromSchoolMeta(row, schoolMeta, directions);
  const recommendedMajorDetails = buildRecommendedMajorDetails(
    row,
    schoolMeta,
    directions,
    recommendedMajors
  );
  const displayMajor = buildImportedMajorDisplay(row.major, recommendedMajors);
  const matchedDirection = inferDirectionFromMajor(
    recommendedMajors[0] || row.major,
    directions
  );
  const inferredCity = resolveImportedCity(row, schoolMeta, schoolCode);
  const resolvedTuition = resolveImportedTuition(
    row,
    schoolMeta,
    recommendedMajors,
    recommendedMajorDetails
  );

  return {
    ...row,
    city: inferredCity,
    direction: matchedDirection,
    displayMajor,
    recommendedMajors,
    recommendedMajorDetails,
    isMajorGroup: isGroupStyleMajor(row.major),
    schoolCode,
    cityVerified: Boolean(inferredCity),
    tuition: resolvedTuition
  };
}

function resolveImportedCity(row, schoolMeta, schoolCode = parseSchoolCode(row?.notes)) {
  return (
    extractCampusCityFromUniversity(row?.university) ||
    SCHOOL_CODE_CITY_OVERRIDES[String(schoolCode || "")] ||
    schoolMeta?.city ||
    inferCityFromUniversityName(row?.university) ||
    parseCityFromNotes(row?.notes) ||
    ""
  );
}

function resolveImportedTuition(
  row,
  schoolMeta,
  recommendedMajors = [],
  recommendedMajorDetails = []
) {
  const rowTuition = Number(row?.tuition || 0);
  if (rowTuition > 0) {
    return rowTuition;
  }

  const detailTuition =
    Number(recommendedMajorDetails?.find((item) => Number(item?.tuition || 0) > 0)?.tuition || 0) || 0;
  if (detailTuition > 0) {
    return detailTuition;
  }

  const majorTuition = resolveSchoolMetaMajorTuition(schoolMeta, recommendedMajors);
  if (majorTuition > 0) {
    return majorTuition;
  }

  return Number(schoolMeta?.tuition || 0) || 0;
}

function resolveSchoolMetaMajorTuition(schoolMeta, recommendedMajors = []) {
  if (!schoolMeta?.majors?.length || !recommendedMajors.length) {
    return 0;
  }

  for (const recommendedMajor of recommendedMajors) {
    const matchedMajor = schoolMeta.majors.find((major) => major?.name === recommendedMajor);
    const tuition = Number(matchedMajor?.tuition || 0);
    if (tuition > 0) {
      return tuition;
    }
  }

  return 0;
}

function buildRecommendedMajorDetails(row, schoolMeta, directions, recommendedMajors = []) {
  const preferredDirections = directions.slice(0, 4).map((item) => item.name);

  if (recommendedMajors.length && schoolMeta?.majors?.length) {
    const matchedDetails = recommendedMajors
      .map((majorName, index) => {
        const matchedMajor = schoolMeta.majors.find((major) => major?.name === majorName);
        if (!matchedMajor) {
          return null;
        }

        const directionName = matchedMajor.direction || inferDirectionFromMajor(majorName, directions);
        const tuition = Number(matchedMajor.tuition || schoolMeta.tuition || 0) || 0;

        return {
          name: majorName,
          direction: directionName,
          popularity: matchedMajor.popularity || "stable",
          tuition,
          recommendationReason: buildRecommendedMajorReason({
            majorName,
            directionName,
            popularity: matchedMajor.popularity,
            preferredDirections,
            rankIndex: index,
            subjectRequirement: row?.subjectRequirement,
            schoolName: row?.university
          })
        };
      })
      .filter(Boolean);

    if (matchedDetails.length) {
      return matchedDetails;
    }
  }

  const fallbackMajors = recommendedMajors.length
    ? recommendedMajors
    : buildHeuristicRecommendedMajors(row, directions);

  return buildFallbackMajorDetails(row, directions, fallbackMajors);
}

function buildRecommendedMajorReason({
  majorName,
  directionName,
  popularity,
  preferredDirections = [],
  rankIndex = 0,
  subjectRequirement = "",
  schoolName = ""
}) {
  const reasons = [];

  if (rankIndex === 0) {
    reasons.push("这是当前组内最值得优先核查的专业");
  }

  if (preferredDirections.includes(directionName)) {
    reasons.push(`和你当前偏好的“${directionName}”方向更贴近`);
  }

  if (popularity === "hot") {
    reasons.push("在这所学校里通常属于热度更高的培养方向");
  } else if (popularity === "stable") {
    reasons.push("培养口径更稳，适合先看就业和调剂边界");
  }

  if (subjectRequirement) {
    reasons.push(`当前口径下选科要求为“${subjectRequirement}”`);
  }

  if (!reasons.length) {
    reasons.push(`${majorName}更适合作为你在${schoolName || "当前学校"}里优先核查的具体专业`);
  }

  return reasons.slice(0, 2).join("，");
}

function buildSingleMajorDetail(school, major, subjectRequirement = "") {
  if (!major?.name) {
    return [];
  }

  return [
    {
      name: major.name,
      direction: major.direction || "",
      popularity: major.popularity || "stable",
      tuition: Number(major.tuition || school?.tuition || 0) || 0,
      recommendationReason: buildRecommendedMajorReason({
        majorName: major.name,
        directionName: major.direction || "",
        popularity: major.popularity,
        preferredDirections: [major.direction].filter(Boolean),
        rankIndex: 0,
        subjectRequirement,
        schoolName: school?.name
      })
    }
  ];
}

function inferDirectionFromMajor(major, directions) {
  const topDirections = directions.slice(0, 8).map((item) => item.name);
  const normalizedMajor = String(major || "");

  for (const alias of MAJOR_DIRECTION_ALIAS) {
    if (alias.keywords.some((keyword) => normalizedMajor.includes(keyword))) {
      return alias.direction;
    }
  }

  return topDirections[0] || "缁煎悎鏈";
}

function matchStaticSchoolMeta(university) {
  const normalizedTarget = normalizeUniversityNameForMatch(university);
  const exactMatch =
    universityCatalog.find((item) => item.name === university) ||
    universityCatalog.find((item) => normalizeUniversityNameForMatch(item.name) === normalizedTarget);
  const override = SCHOOL_METADATA_OVERRIDES[normalizedTarget] || null;

  if (exactMatch) {
    return mergeSchoolMeta(exactMatch, override, university);
  }

  const fuzzyMatch =
    universityCatalog.find((item) => {
      const candidate = normalizeUniversityNameForMatch(item.name);
      return (
        candidate.includes(normalizedTarget) ||
        normalizedTarget.includes(candidate)
      );
    }) || null;

  if (fuzzyMatch) {
    return mergeSchoolMeta(fuzzyMatch, override, university);
  }

  return override ? mergeSchoolMeta(null, override, university) : null;
}

function normalizeUniversityNameForMatch(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/校区|分校|中外合作办学/g, "")
    .trim();
}

function mergeSchoolMeta(baseMeta, overrideMeta, university) {
  if (!baseMeta && !overrideMeta) {
    return null;
  }

  const baseMajors = Array.isArray(baseMeta?.majors) ? baseMeta.majors : [];
  const overrideMajors = Array.isArray(overrideMeta?.majors) ? overrideMeta.majors : [];
  const mergedMajorMap = new Map();

  [...overrideMajors, ...baseMajors].forEach((major) => {
    if (major?.name && !mergedMajorMap.has(major.name)) {
      mergedMajorMap.set(major.name, major);
    }
  });

  return {
    name: baseMeta?.name || university,
    city: overrideMeta?.city || baseMeta?.city || "",
    nature: overrideMeta?.nature || baseMeta?.nature || "本科院校",
    tuition: Number(overrideMeta?.tuition || 0) || Number(baseMeta?.tuition || 0) || 0,
    tags: Array.isArray(baseMeta?.tags) ? baseMeta.tags : [],
    levelTags: Array.isArray(baseMeta?.levelTags) ? baseMeta.levelTags : [],
    employmentStability: Number(baseMeta?.employmentStability || 72),
    graduateRate: Number(baseMeta?.graduateRate || 54),
    majors: Array.from(mergedMajorMap.values())
  };
}

function isGroupStyleMajor(value) {
  return /专业组|专业类|第?\s*\d{2,4}\s*组/.test(String(value || ""));
}

function inferRecommendedMajorsFromSchoolMeta(row, schoolMeta, directions) {
  if (!schoolMeta?.majors?.length) {
    return buildHeuristicRecommendedMajors(row, directions);
  }

  const preferredDirections = directions.slice(0, 6).map((item) => item.name);
  const sourceMajor = String(row.major || "");

  const majors = schoolMeta.majors
    .map((major) => {
      let score = 0;

      if (preferredDirections.includes(major.direction)) {
        score += 44 - preferredDirections.indexOf(major.direction) * 4;
      }

      if (sourceMajor && !isGroupStyleMajor(sourceMajor) && sourceMajor.includes(major.name)) {
        score += 60;
      }

      for (const alias of MAJOR_DIRECTION_ALIAS) {
        if (alias.direction === major.direction) {
          score += alias.keywords.some((keyword) => major.name.includes(keyword)) ? 12 : 0;
        }
      }

      score += major.popularity === "hot" ? 8 : major.popularity === "stable" ? 4 : 0;

      return {
        name: major.name,
        score
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((item) => item.name);

  return majors.length ? majors : buildHeuristicRecommendedMajors(row, directions);
}

function buildHeuristicRecommendedMajors(row, directions = []) {
  const schoolName = String(row?.university || "");
  const sourceMajor = String(row?.major || "").trim();
  const suggestedMajor = extractSuggestedMajorFromText(sourceMajor);

  if (suggestedMajor) {
    return [suggestedMajor];
  }

  if (sourceMajor && !isGroupStyleMajor(sourceMajor)) {
    return [sourceMajor];
  }

  const majors = [];
  const pushMajor = (majorName) => {
    if (majorName && !majors.includes(majorName)) {
      majors.push(majorName);
    }
  };

  const track = String(row?.track || row?.subjectRequirement || "");
  const topDirections = directions.slice(0, 4).map((item) => item.name);
  const directionToMajor = new Map([
    ["计算机科学与技术", "计算机科学与技术"],
    ["人工智能", "人工智能"],
    ["软件工程", "软件工程"],
    ["数据科学与大数据技术", "数据科学与大数据技术"],
    ["临床医学", "临床医学"],
    ["口腔医学", "口腔医学"],
    ["药学", "药学"],
    ["金融学", "金融学"],
    ["会计学", "会计学"],
    ["法学", "法学"],
    ["行政管理", "行政管理"],
    ["机械工程", "机械设计制造及其自动化"],
    ["电气工程及其自动化", "电气工程及其自动化"],
    ["自动化", "自动化"],
    ["建筑学", "建筑学"],
    ["新闻传播学", "新闻学"],
    ["教育学", "教育学"],
    ["心理学", "心理学"],
    ["英语", "英语"],
    ["食品科学与工程", "食品科学与工程"],
    ["环境工程", "环境工程"]
  ]);

  for (const directionName of topDirections) {
    pushMajor(directionToMajor.get(directionName) || directionName);
  }

  if (schoolName.includes("海洋")) {
    pushMajor("海洋科学");
    pushMajor("海洋技术");
    pushMajor("食品科学与工程");
  }
  if (schoolName.includes("林业")) {
    pushMajor(track.includes("历史") ? "风景园林" : "计算机科学与技术");
    pushMajor("风景园林");
    pushMajor("林学");
  }
  if (schoolName.includes("师范")) {
    if (track.includes("历史")) {
      pushMajor("汉语言文学");
      pushMajor("英语");
      pushMajor("思想政治教育");
    } else {
      pushMajor("数学与应用数学");
      pushMajor("计算机科学与技术");
      pushMajor("物理学");
    }
  }
  if (schoolName.includes("外国语")) {
    pushMajor("英语");
    pushMajor("翻译");
    pushMajor("国际新闻与传播");
  }
  if (schoolName.includes("财经")) {
    pushMajor("金融学");
    pushMajor("会计学");
    pushMajor("财政学");
  }
  if (schoolName.includes("海关")) {
    pushMajor("海关管理");
    pushMajor("税收学");
    pushMajor("国际商务");
  }
  if (schoolName.includes("中医")) {
    pushMajor("中医学");
    pushMajor("中药学");
    pushMajor("针灸推拿学");
  } else if (schoolName.includes("医")) {
    pushMajor("临床医学");
    pushMajor("护理学");
    pushMajor("药学");
  }
  if (schoolName.includes("农")) {
    pushMajor("农学");
    pushMajor("食品科学与工程");
    pushMajor("园艺");
  }
  if (schoolName.includes("石油")) {
    pushMajor("石油工程");
    pushMajor("资源勘查工程");
    pushMajor("机械设计制造及其自动化");
  }
  if (schoolName.includes("地质")) {
    pushMajor("地质学");
    pushMajor("资源勘查工程");
    pushMajor("地理信息科学");
  }
  if (schoolName.includes("化工")) {
    pushMajor("化学工程与工艺");
    pushMajor("高分子材料与工程");
    pushMajor("自动化");
  }
  if (schoolName.includes("交通")) {
    pushMajor("交通运输");
    pushMajor("土木工程");
    pushMajor("电气工程及其自动化");
  }
  if (schoolName.includes("航空") || schoolName.includes("航天")) {
    pushMajor("飞行器制造工程");
    pushMajor("电子信息工程");
    pushMajor("自动化");
  }
  if (schoolName.includes("电影")) {
    pushMajor("戏剧影视文学");
    pushMajor("广播电视编导");
    pushMajor("数字媒体艺术");
  }
  if (
    schoolName.includes("工业") ||
    schoolName.includes("工程") ||
    schoolName.includes("理工") ||
    schoolName.includes("科技")
  ) {
    pushMajor("计算机科学与技术");
    pushMajor("电子信息工程");
    pushMajor("自动化");
  }

  return majors.slice(0, 3);
}

function extractSuggestedMajorFromText(majorText) {
  const text = String(majorText || "").trim();
  if (!text) {
    return "";
  }

  const suggestedMatch = text.match(/建议关注\s*([^、，,；;]+)/);
  if (suggestedMatch?.[1]) {
    return suggestedMatch[1].trim();
  }

  const strippedText = text.replace(/^[^·]*·\s*/, "").trim();
  if (strippedText && !isGroupStyleMajor(strippedText)) {
    return strippedText;
  }

  return "";
}

function buildFallbackMajorDetails(row, directions = [], recommendedMajors = []) {
  const preferredDirections = directions.slice(0, 4).map((item) => item.name);

  return recommendedMajors
    .slice(0, 3)
    .map((majorName, index) => {
      const directionName = inferDirectionFromMajor(majorName, directions);
      return {
        name: majorName,
        direction: directionName,
        popularity: index === 0 ? "hot" : "stable",
        tuition: Number(row?.tuition || 0) || 0,
        recommendationReason: buildRecommendedMajorReason({
          majorName,
          directionName,
          popularity: index === 0 ? "hot" : "stable",
          preferredDirections,
          rankIndex: index,
          subjectRequirement: row?.subjectRequirement,
          schoolName: row?.university
        })
      };
    })
    .filter(Boolean);
}

function buildImportedMajorDisplay(rawMajor, recommendedMajors) {
  const majorText = String(rawMajor || "").trim();
  if (!majorText) {
    return "";
  }

  if (!isGroupStyleMajor(majorText) || !recommendedMajors.length) {
    return majorText;
  }

  return `${majorText} · 建议关注 ${recommendedMajors[0]}`;
}

const SCHOOL_CODE_CITY_OVERRIDES = {
  "10004": "北京",
  "10007": "北京",
  "10010": "北京",
  "10022": "北京",
  "10050": "北京",
  "10068": "天津",
  "10001": "北京",
  "10002": "北京",
  "10003": "北京",
  "10008": "北京",
  "10013": "北京",
  "10142": "沈阳",
  "10145": "沈阳",
  "10152": "大连",
  "10173": "大连",
  "10183": "长春",
  "10213": "哈尔滨",
  "10228": "哈尔滨",
  "10247": "上海",
  "10248": "上海",
  "10232": "齐齐哈尔",
  "10240": "哈尔滨",
  "10251": "上海",
  "10274": "上海",
  "10286": "南京",
  "10299": "镇江",
  "10319": "南京",
  "10335": "杭州",
  "10384": "厦门",
  "10418": "赣州",
  "10423": "青岛",
  "10425": "青岛",
  "10422": "济南",
  "10475": "开封",
  "10491": "武汉",
  "10520": "武汉",
  "10532": "长沙",
  "10533": "长沙",
  "10542": "长沙",
  "10564": "广州",
  "10574": "广州",
  "10576": "韶关",
  "10579": "湛江",
  "10582": "梅州",
  "10588": "广州",
  "10599": "百色",
  "10615": "成都",
  "10638": "南充",
  "10650": "重庆",
  "10673": "昆明",
  "10697": "西安",
  "10730": "兰州",
  "10718": "西安",
  "10732": "兰州",
  "10746": "西宁",
  "10764": "伊宁",
  "11048": "南京",
  "11053": "徐州",
  "11106": "广州",
  "11079": "成都",
  "11845": "广州",
  "11847": "佛山",
  "11964": "邢台",
  "12121": "广州",
  "13238": "武汉",
  "13307": "哈尔滨",
  "13431": "南昌",
  "13433": "南昌",
  "13469": "厦门",
  "13497": "郑州",
  "13511": "兰州",
  "13558": "阿克苏",
  "13609": "沈阳",
  "13643": "南宁",
  "14325": "深圳",
  "16301": "宁波",
  "16401": "珠海",
  "18213": "深圳",
  "19004": "威海",
  "19145": "秦皇岛",
  "19213": "威海"
};

const SCHOOL_METADATA_OVERRIDES = {
  [normalizeUniversityNameForMatch("中南大学")]: {
    city: "长沙",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "自动化", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("东北大学")]: {
    city: "沈阳",
    tuition: 6240,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "自动化", direction: "自动化", popularity: "hot" },
      { name: "软件工程", direction: "软件工程", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("湖南大学")]: {
    city: "长沙",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "金融学", direction: "金融学", popularity: "hot" },
      { name: "建筑学", direction: "建筑学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("吉林大学")]: {
    city: "长春",
    majors: [
      { name: "车辆工程", direction: "机械工程", popularity: "hot" },
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "法学", direction: "法学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("华东理工大学")]: {
    city: "上海",
    majors: [
      { name: "化学工程与工艺", direction: "化学工程与工艺", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "自动化", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("南方科技大学")]: {
    city: "深圳",
    tuition: 6000,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "人工智能", direction: "人工智能", popularity: "hot" },
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("北京科技大学")]: {
    city: "北京",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "自动化", direction: "自动化", popularity: "stable" },
      { name: "材料科学与工程", direction: "材料科学与工程", popularity: "hot" }
    ]
  },
  [normalizeUniversityNameForMatch("山东大学")]: {
    city: "济南",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot", tuition: 6500 },
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广州医科大学")]: {
    city: "广州",
    tuition: 7656,
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "口腔医学", direction: "口腔医学", popularity: "stable" },
      { name: "医学影像学", direction: "临床医学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("北京外国语大学")]: {
    city: "北京",
    tuition: 6000,
    majors: [
      { name: "英语", direction: "英语", popularity: "hot" },
      { name: "翻译", direction: "英语", popularity: "stable" },
      { name: "国际新闻与传播", direction: "新闻传播学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("北京交通大学")]: {
    city: "北京",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "软件工程", direction: "软件工程", popularity: "hot" },
      { name: "交通运输", direction: "行政管理", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("北京邮电大学")]: {
    city: "北京",
    tuition: 5500,
    majors: [
      { name: "通信工程", direction: "计算机科学与技术", popularity: "hot" },
      { name: "信息安全", direction: "计算机科学与技术", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" }
    ]
  },
  [normalizeUniversityNameForMatch("东北大学秦皇岛分校")]: {
    city: "秦皇岛",
    tuition: 6240,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "自动化", direction: "自动化", popularity: "stable" },
      { name: "数据科学与大数据技术", direction: "数据科学与大数据技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("兰州大学")]: {
    city: "兰州",
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "stable" },
      { name: "化学", direction: "应用化学", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("辽宁中医药大学杏林学院")]: {
    city: "沈阳",
    tuition: 29000,
    majors: [
      { name: "中医学", direction: "临床医学", popularity: "hot" },
      { name: "针灸推拿学", direction: "临床医学", popularity: "stable" },
      { name: "中药学", direction: "药学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("韶关学院")]: {
    city: "韶关",
    tuition: 5190,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "电气工程及其自动化", direction: "电气工程及其自动化", popularity: "stable" },
      { name: "护理学", direction: "临床医学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("岭南师范学院")]: {
    city: "湛江",
    tuition: 5190,
    majors: [
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "汉语言文学", direction: "新闻传播学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("青海师范大学")]: {
    city: "西宁",
    tuition: 5200,
    majors: [
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "地理科学", direction: "环境工程", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("齐齐哈尔大学")]: {
    city: "齐齐哈尔",
    majors: [
      { name: "机械设计制造及其自动化", direction: "机械工程", popularity: "stable", tuition: 3500 },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable", tuition: 5500 },
      { name: "食品科学与工程", direction: "食品科学与工程", popularity: "stable", tuition: 3500 }
    ]
  },
  [normalizeUniversityNameForMatch("嘉应学院")]: {
    city: "梅州",
    tuition: 5190,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" },
      { name: "护理学", direction: "临床医学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广西中医药大学赛恩斯新医药学院")]: {
    city: "南宁",
    tuition: 15000,
    majors: [
      { name: "中医学", direction: "临床医学", popularity: "hot" },
      { name: "针灸推拿学", direction: "临床医学", popularity: "stable" },
      { name: "药学", direction: "药学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("邢台医学院")]: {
    city: "邢台",
    tuition: 5000,
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "护理学", direction: "临床医学", popularity: "stable" },
      { name: "医学影像技术", direction: "临床医学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("香港城市大学(东莞)(内地香港合作办学)")]: {
    city: "东莞",
    tuition: 115000,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "智能制造工程", direction: "自动化", popularity: "stable" },
      { name: "数据科学与大数据技术", direction: "数据科学与大数据技术", popularity: "hot" }
    ]
  },
  [normalizeUniversityNameForMatch("河海大学")]: {
    city: "南京",
    tuition: 5800,
    majors: [
      { name: "水利水电工程", direction: "环境工程", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "电气工程及其自动化", direction: "电气工程及其自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("暨南大学")]: {
    city: "广州",
    majors: [
      { name: "新闻传播学", direction: "新闻传播学", popularity: "hot" },
      { name: "经济学", direction: "金融学", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("东北电力大学")]: {
    city: "吉林",
    majors: [
      { name: "电气工程及其自动化", direction: "电气工程及其自动化", popularity: "hot" },
      { name: "能源与动力工程", direction: "电气工程及其自动化", popularity: "stable" },
      { name: "自动化", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("深圳技术大学")]: {
    city: "深圳",
    tuition: 5190,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot" },
      { name: "人工智能", direction: "人工智能", popularity: "hot" },
      { name: "智能制造工程", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("西南大学")]: {
    city: "重庆",
    tuition: 5500,
    majors: [
      { name: "教育学", direction: "教育学", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "心理学", direction: "心理学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("贵州大学")]: {
    city: "贵阳",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "电气工程及其自动化", direction: "电气工程及其自动化", popularity: "stable" },
      { name: "法学", direction: "法学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("河北工业大学")]: {
    city: "天津",
    tuition: 5800,
    majors: [
      { name: "电气工程及其自动化", direction: "电气工程及其自动化", popularity: "hot" },
      { name: "机械设计制造及其自动化", direction: "机械工程", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("大连海事大学")]: {
    city: "大连",
    tuition: 5980,
    majors: [
      { name: "交通运输", direction: "行政管理", popularity: "hot" },
      { name: "航海技术", direction: "自动化", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("云南大学")]: {
    city: "昆明",
    majors: [
      { name: "民族学", direction: "法学", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "法学", direction: "法学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广州中医药大学")]: {
    city: "广州",
    tuition: 7660,
    majors: [
      { name: "中医学", direction: "临床医学", popularity: "hot" },
      { name: "针灸推拿学", direction: "临床医学", popularity: "stable" },
      { name: "中药学", direction: "药学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广东技术师范大学")]: {
    city: "广州",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "自动化", direction: "自动化", popularity: "stable" },
      { name: "电子信息工程", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广东财经大学")]: {
    city: "广州",
    tuition: 5510,
    majors: [
      { name: "金融学", direction: "金融学", popularity: "hot" },
      { name: "会计学", direction: "会计学", popularity: "hot" },
      { name: "法学", direction: "法学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广东工业大学")]: {
    city: "广州",
    tuition: 6850,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot", tuition: 6850 },
      { name: "自动化", direction: "自动化", popularity: "stable", tuition: 6850 },
      { name: "电子信息工程", direction: "计算机科学与技术", popularity: "stable", tuition: 6850 }
    ]
  },
  [normalizeUniversityNameForMatch("华南师范大学")]: {
    city: "广州",
    tuition: 6060,
    majors: [
      { name: "汉语言文学", direction: "新闻传播学", popularity: "hot", tuition: 6060 },
      { name: "英语", direction: "英语", popularity: "hot", tuition: 6060 },
      { name: "思想政治教育", direction: "法学", popularity: "stable", tuition: 6060 },
      { name: "数学与应用数学", direction: "教育学", popularity: "hot", tuition: 6850 },
      { name: "物理学", direction: "电气工程及其自动化", popularity: "stable", tuition: 6850 },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot", tuition: 6850 }
    ]
  },
  [normalizeUniversityNameForMatch("北京化工大学")]: {
    city: "北京",
    tuition: 5000,
    majors: [
      { name: "化学工程与工艺", direction: "环境工程", popularity: "hot", tuition: 5000 },
      { name: "高分子材料与工程", direction: "机械工程", popularity: "stable", tuition: 5000 },
      { name: "自动化", direction: "自动化", popularity: "stable", tuition: 5000 }
    ]
  },
  [normalizeUniversityNameForMatch("北京林业大学")]: {
    city: "北京",
    tuition: 5000,
    majors: [
      { name: "风景园林", direction: "建筑学", popularity: "hot", tuition: 5000 },
      { name: "林学", direction: "环境工程", popularity: "stable", tuition: 5000 },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable", tuition: 5000 }
    ]
  },
  [normalizeUniversityNameForMatch("北京交通大学")]: {
    city: "北京",
    tuition: 5500,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "hot", tuition: 5500 },
      { name: "软件工程", direction: "软件工程", popularity: "stable", tuition: 5500 },
      { name: "交通运输", direction: "机械工程", popularity: "stable", tuition: 5500 }
    ]
  },
  [normalizeUniversityNameForMatch("北京理工大学")]: {
    city: "北京",
    tuition: 5000
  },
  [normalizeUniversityNameForMatch("东北财经大学")]: {
    city: "大连",
    tuition: 5200,
    majors: [
      { name: "金融学", direction: "金融学", popularity: "hot", tuition: 5720 },
      { name: "会计学", direction: "会计学", popularity: "hot", tuition: 5720 },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable", tuition: 5200 }
    ]
  },
  [normalizeUniversityNameForMatch("南方医科大学")]: {
    city: "广州",
    tuition: 6850,
    majors: [
      { name: "生物医学工程", direction: "自动化", popularity: "hot", tuition: 6850 },
      { name: "生物信息学", direction: "数据科学与大数据技术", popularity: "stable", tuition: 6850 },
      { name: "临床医学", direction: "临床医学", popularity: "hot", tuition: 7660 }
    ]
  },
  [normalizeUniversityNameForMatch("天津外国语大学")]: {
    city: "天津",
    tuition: 5400,
    majors: [
      { name: "英语", direction: "英语", popularity: "hot", tuition: 5400 },
      { name: "翻译", direction: "英语", popularity: "stable", tuition: 5400 },
      { name: "国际新闻与传播", direction: "新闻传播学", popularity: "stable", tuition: 5400 }
    ]
  },
  [normalizeUniversityNameForMatch("广州体育学院")]: {
    city: "广州",
    tuition: 5710,
    majors: [
      { name: "体育教育", direction: "教育学", popularity: "hot", tuition: 5710 },
      { name: "运动康复", direction: "临床医学", popularity: "hot", tuition: 5710 },
      { name: "康复治疗学", direction: "临床医学", popularity: "stable", tuition: 6380 }
    ]
  },
  [normalizeUniversityNameForMatch("广东医科大学")]: {
    city: "湛江 / 东莞",
    tuition: 7656,
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "hot", tuition: 7656 },
      { name: "麻醉学", direction: "临床医学", popularity: "stable", tuition: 7656 },
      { name: "医学影像学", direction: "临床医学", popularity: "stable", tuition: 7656 }
    ]
  },
  [normalizeUniversityNameForMatch("兰州理工大学")]: {
    city: "兰州",
    tuition: 4700,
    majors: [
      {
        name: "计算机科学与技术",
        direction: "计算机科学与技术",
        popularity: "hot",
        tuition: 4700
      },
      { name: "自动化", direction: "自动化", popularity: "stable", tuition: 4700 },
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        popularity: "stable",
        tuition: 4700
      }
    ]
  },
  [normalizeUniversityNameForMatch("防灾科技学院")]: {
    city: "三河(燕郊)",
    tuition: 4900,
    majors: [
      {
        name: "计算机科学与技术",
        direction: "计算机科学与技术",
        popularity: "hot",
        tuition: 4900
      },
      { name: "通信工程", direction: "计算机科学与技术", popularity: "stable", tuition: 4900 },
      {
        name: "防灾减灾科学与工程",
        direction: "环境工程",
        popularity: "stable",
        tuition: 4900
      }
    ]
  },
  [normalizeUniversityNameForMatch("仲恺农业工程学院")]: {
    city: "广州",
    tuition: 5710,
    majors: [
      {
        name: "计算机科学与技术",
        direction: "计算机科学与技术",
        popularity: "hot",
        tuition: 5710
      },
      { name: "电子信息工程", direction: "计算机科学与技术", popularity: "stable", tuition: 5710 },
      { name: "机器人工程", direction: "自动化", popularity: "stable", tuition: 5710 }
    ]
  },
  [normalizeUniversityNameForMatch("广东第二师范学院")]: {
    city: "广州",
    tuition: 5190,
    majors: [
      {
        name: "计算机科学与技术",
        direction: "计算机科学与技术",
        popularity: "hot",
        tuition: 5190
      },
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable", tuition: 5190 },
      { name: "物理学", direction: "电气工程及其自动化", popularity: "stable", tuition: 5190 }
    ]
  },
  [normalizeUniversityNameForMatch("肇庆学院")]: {
    city: "肇庆",
    tuition: 5710,
    majors: [
      {
        name: "计算机科学与技术",
        direction: "计算机科学与技术",
        popularity: "hot",
        tuition: 5710
      },
      { name: "人工智能", direction: "人工智能", popularity: "hot", tuition: 5710 },
      { name: "软件工程", direction: "软件工程", popularity: "stable", tuition: 8000 }
    ]
  },
  [normalizeUniversityNameForMatch("浙江中医药大学")]: {
    city: "杭州",
    majors: [
      { name: "中医学", direction: "临床医学", popularity: "hot", tuition: 6900 },
      { name: "针灸推拿学", direction: "临床医学", popularity: "stable" },
      { name: "药学", direction: "药学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("西安航空学院")]: {
    city: "西安",
    majors: [
      { name: "飞行器制造工程", direction: "机械工程", popularity: "hot" },
      { name: "电子信息工程", direction: "计算机科学与技术", popularity: "stable" },
      { name: "自动化", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("湖南理工学院")]: {
    city: "岳阳",
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "电子信息工程", direction: "计算机科学与技术", popularity: "stable" },
      { name: "机械设计制造及其自动化", direction: "机械工程", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("山西中医药大学")]: {
    city: "晋中",
    majors: [
      { name: "中医学", direction: "临床医学", popularity: "hot", tuition: 5635 },
      { name: "针灸推拿学", direction: "临床医学", popularity: "stable" },
      { name: "中药学", direction: "药学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("沈阳大学(中外合作办学)")]: {
    city: "沈阳",
    majors: [
      { name: "机械设计制造及其自动化", direction: "机械工程", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" },
      { name: "会计学", direction: "会计学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("沈阳航空航天大学")]: {
    city: "沈阳",
    majors: [
      { name: "飞行器制造工程", direction: "机械工程", popularity: "hot" },
      { name: "自动化", direction: "自动化", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable", tuition: 5200 }
    ]
  },
  [normalizeUniversityNameForMatch("南昌医学院")]: {
    city: "南昌",
    tuition: 4350,
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "护理学", direction: "临床医学", popularity: "stable" },
      { name: "医学影像技术", direction: "临床医学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("沈阳化工大学")]: {
    city: "沈阳",
    tuition: 5200,
    majors: [
      { name: "化学工程与工艺", direction: "应用化学", popularity: "hot" },
      { name: "高分子材料与工程", direction: "材料科学与工程", popularity: "stable" },
      { name: "过程装备与控制工程", direction: "自动化", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广州航海学院")]: {
    city: "广州",
    tuition: 5190,
    majors: [
      { name: "航海技术", direction: "自动化", popularity: "hot" },
      { name: "轮机工程", direction: "机械工程", popularity: "stable" },
      { name: "交通运输", direction: "行政管理", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("广东海洋大学")]: {
    city: "湛江",
    majors: [
      { name: "食品科学与工程", direction: "食品科学与工程", popularity: "stable" },
      { name: "水产养殖学", direction: "环境工程", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable", tuition: 6850 }
    ]
  },
  [normalizeUniversityNameForMatch("佛山大学")]: {
    city: "佛山",
    majors: [
      { name: "机械设计制造及其自动化", direction: "机械工程", popularity: "stable" },
      { name: "口腔医学", direction: "临床医学", popularity: "hot" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("上海立信会计金融学院")]: {
    city: "上海",
    majors: [
      { name: "会计学", direction: "会计学", popularity: "hot" },
      { name: "金融学", direction: "金融学", popularity: "hot" },
      { name: "审计学", direction: "会计学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("上海师范大学(中外合作办学)")]: {
    city: "上海",
    majors: [
      { name: "英语", direction: "英语", popularity: "stable" },
      { name: "广告学", direction: "新闻传播学", popularity: "stable", tuition: 19500 },
      { name: "国际经济与贸易", direction: "金融学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("汕头大学")]: {
    city: "汕头",
    majors: [
      { name: "临床医学", direction: "临床医学", popularity: "hot" },
      { name: "法学", direction: "法学", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("南宁师范大学")]: {
    city: "南宁",
    majors: [
      { name: "汉语言文学", direction: "新闻传播学", popularity: "stable" },
      { name: "思想政治教育", direction: "法学", popularity: "stable" },
      { name: "数学与应用数学", direction: "数学与应用数学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("南京特殊教育师范学院")]: {
    city: "南京",
    majors: [
      { name: "特殊教育", direction: "教育学", popularity: "hot" },
      { name: "康复治疗学", direction: "临床医学", popularity: "stable" },
      { name: "学前教育", direction: "教育学", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("天津外国语大学")]: {
    city: "天津",
    tuition: 5400,
    majors: [
      { name: "英语", direction: "英语", popularity: "hot", tuition: 5400 },
      { name: "翻译", direction: "英语", popularity: "stable", tuition: 5400 },
      { name: "国际新闻与传播", direction: "新闻传播学", popularity: "stable", tuition: 5400 }
    ]
  },
  [normalizeUniversityNameForMatch("长春工业大学")]: {
    city: "长春",
    majors: [
      { name: "机械工程", direction: "机械工程", popularity: "stable" },
      { name: "材料科学与工程", direction: "材料科学与工程", popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", popularity: "stable" }
    ]
  },
  [normalizeUniversityNameForMatch("贵阳康养职业大学")]: {
    city: "贵阳",
    majors: [
      { name: "护理", direction: "临床医学", popularity: "hot" },
      { name: "康复治疗", direction: "临床医学", popularity: "stable" },
      { name: "健康服务与管理", direction: "行政管理", popularity: "stable" }
    ]
  }
};

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
  return new Set(
    [
      ...(Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : []),
      profile.track
    ].filter(Boolean)
  );
}

function requirementMentions(requirementText, keyword) {
  return String(requirementText || "").includes(keyword);
}

function matchesImportedSubjectRequirement(profile, subjectRequirement) {
  const requirementText = String(subjectRequirement || "").trim();
  if (!requirementText || requirementText.includes("涓嶉檺")) {
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
  const requiredSubjects = Array.isArray(subjectRule.requiredSubjects)
    ? subjectRule.requiredSubjects
    : [];
  const oneOfSubjects = Array.isArray(subjectRule.oneOfSubjects) ? subjectRule.oneOfSubjects : [];
  const forbiddenSubjects = Array.isArray(subjectRule.forbiddenSubjects)
    ? subjectRule.forbiddenSubjects
    : [];

  if (allowedTracks.length && !allowedTracks.includes(profile.track)) {
    return false;
  }

  if (
    requiredSubjects.length &&
    !requiredSubjects.every((subject) => candidateSubjects.has(subject))
  ) {
    return false;
  }

  if (oneOfSubjects.length && !oneOfSubjects.some((subject) => candidateSubjects.has(subject))) {
    return false;
  }

  if (
    forbiddenSubjects.length &&
    forbiddenSubjects.some((subject) => candidateSubjects.has(subject))
  ) {
    return false;
  }

  return true;
}

function inferHeuristicMajorRequirement(majorName, direction = "") {
  const text = `${majorName || ""} ${direction || ""}`;
  const needsPhysicsTrack = PHYSICS_TRACK_REQUIRED_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
  const needsChemistry = CHEMISTRY_REQUIRED_KEYWORDS.some((keyword) => text.includes(keyword));

  return {
    needsPhysicsTrack,
    needsChemistry
  };
}

function passesMajorSubjectEligibility(
  profile,
  majorName,
  direction = "",
  subjectRequirement = "",
  subjectRule = null
) {
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

  if (
    !passesMajorSubjectEligibility(
      profile,
      row.major,
      row.direction,
      row.subjectRequirement,
      row.subjectRule
    )
  ) {
    return false;
  }

  if (
    profile.subjectConstraints.includes("publicOnly") &&
    schoolMeta &&
    !schoolMeta.levelTags.includes("publicOnly")
  ) {
    return false;
  }

  if (
    profile.schoolTags.includes("provincialCapital") &&
    schoolMeta &&
    !schoolMeta.levelTags.includes("provincialCapital")
  ) {
    return false;
  }

  if (
    profile.schoolTags.includes("tier1") &&
    schoolMeta &&
    !schoolMeta.levelTags.includes("tier1")
  ) {
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

  if (
    !passesMajorSubjectEligibility(
      profile,
      major?.name,
      major?.direction,
      "",
      major?.subjectRule || null
    )
  ) {
    return false;
  }

  if (
    profile.subjectConstraints.includes("publicOnly") &&
    !school.levelTags.includes("publicOnly")
  ) {
    return false;
  }

  if (
    profile.schoolTags.includes("provincialCapital") &&
    !school.levelTags.includes("provincialCapital")
  ) {
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

function passesImportedConstraintsWithOptions(profile, row, schoolMeta, tuition, options = {}) {
  if (!passesImportedConstraints(profile, row, schoolMeta, tuition)) {
    if (!options.relaxPreferences) {
      return false;
    }

    if (profile.maxTuition > 0 && tuition > profile.maxTuition) {
      return false;
    }

    if (
      !passesMajorSubjectEligibility(
        profile,
        row.major,
        row.direction,
        row.subjectRequirement,
        row.subjectRule
      )
    ) {
      return false;
    }

    if (
      profile.subjectConstraints.includes("publicOnly") &&
      schoolMeta &&
      !schoolMeta.levelTags.includes("publicOnly")
    ) {
      return false;
    }

    return true;
  }

  return true;
}

function passesConstraintsWithOptions(profile, school, major, options = {}) {
  if (!passesConstraints(profile, school, major)) {
    if (!options.relaxPreferences) {
      return false;
    }

    if (profile.maxTuition > 0 && school.tuition > profile.maxTuition) {
      return false;
    }

    if (
      !passesMajorSubjectEligibility(
        profile,
        major?.name,
        major?.direction,
        "",
        major?.subjectRule || null
      )
    ) {
      return false;
    }

    if (
      profile.subjectConstraints.includes("publicOnly") &&
      !school.levelTags.includes("publicOnly")
    ) {
      return false;
    }

    return true;
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
    `${school.name} 位于 ${school.city}，学校性质为 ${school.nature}。`,
    historical?.year
      ? `已匹配到 ${historical.year} 年数据，这个专业的参考最低位次约为 ${threshold}。`
      : `按当前演示模型估算，这个专业的目标位次约为 ${threshold}。`
  ];

  if (profile.careerPlan) {
    parts.push(`你的职业规划提到“${shorten(profile.careerPlan, 18)}”，和这个方向有一定匹配。`);
  }

  if (tier === "冲") {
    parts.push("更适合放在冲刺层，用来争取更高平台。");
  } else if (tier === "稳") {
    parts.push("更适合作为主力志愿，录取把握和匹配度更平衡。");
  } else {
    parts.push("更适合作为保底志愿，优先保证录取结果。");
  }

  return parts.join("");
}

function buildImportedReason(profile, row, tier, schoolMeta) {
  const displayMajor = row.displayMajor || row.major;
  const parts = [
    `${row.university} 在 ${row.year} 年 ${profile.province}${profile.track} 类 ${normalizeBatch(row.batch)} 中，${displayMajor} 的参考最低位次约为 ${row.minRank}。`
  ];

  if (row.admissionCount) {
    parts.push(`该志愿条目的计划数约 ${row.admissionCount}。`);
  }

  if (row.subjectRequirement) {
    parts.push(`选科要求为“${row.subjectRequirement}”。`);
  }

  if (row.recommendedMajors?.length) {
    parts.push(`当前导入数据先到专业组层，建议优先关注组内的 ${row.recommendedMajors.join("、")}。`);
  }

  if (row.tuition > 0) {
    parts.push(`参考学费约 ${row.tuition} 元/年。`);
  }

  if (profile.careerPlan) {
    parts.push(
      `结合你提到的“${shorten(profile.careerPlan, 16)}”，这条线更适合用来做${tier}层判断。`
    );
  }

  if (row.city || schoolMeta?.city) {
    parts.push(`院校所在城市为 ${row.city || schoolMeta?.city}。`);
  }

  if (tier === "冲") {
    parts.push("这类更像“够一够”的位置，可以冲，但不能全部压在这里。");
  } else if (tier === "稳") {
    parts.push("这类更适合做主力区，既有希望也更可控。");
  } else {
    parts.push("这类更适合拿来托底，关键是保住本科和可接受专业组。");
  }

  return parts.join("");
}

function appendSoftPreferenceRelaxNote(reason, profile, softPreferenceRelaxed) {
  if (!softPreferenceRelaxed) {
    return reason;
  }

  const relaxTargets = [];
  if (profile.preferredCities && !profile.subjectConstraints.includes("outOfProvinceOk")) {
    relaxTargets.push("城市");
  }
  if (Array.isArray(profile.schoolTags) && profile.schoolTags.length) {
    relaxTargets.push("院校层次");
  }

  const relaxText = relaxTargets.length ? relaxTargets.join("和") : "软偏好";
  return `${reason} 为避免低分段或偏好过严时出现无校可报，这条结果已适度放宽${relaxText}做兜底筛选，但选科、学费和专业硬限制仍保持严格。`;
}
function buildConfidence(rank, threshold, tier) {
  const confidenceBase = tier === "保" ? 88 : tier === "稳" ? 78 : 64;
  const confidence =
    confidenceBase - Math.min(22, (Math.abs(rank - threshold) / Math.max(threshold, 1)) * 100);

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

const CITY_TOKENS = [
  "广州",
  "深圳",
  "北京",
  "上海",
  "济南",
  "兰州",
  "杭州",
  "南京",
  "南宁",
  "梅州",
  "苏州",
  "武汉",
  "西宁",
  "西安",
  "成都",
  "长沙",
  "秦皇岛",
  "齐齐哈尔",
  "邢台",
  "宁波",
  "温州",
  "珠海",
  "厦门",
  "青岛",
  "大连",
  "天津",
  "重庆",
  "长春",
  "沈阳",
  "哈尔滨",
  "韶关",
  "湛江",
  "威海",
  "佛山",
  "东莞",
  "汕头",
  "湛江",
  "中山"
];

function extractCampusCityFromUniversity(university) {
  const matched = String(university || "").match(/[（(]([^）)]+)[）)]/);
  const token = matched?.[1]?.trim() || "";
  if (!token) {
    return "";
  }
  return CITY_TOKENS.find((city) => token.includes(city) || city.includes(token)) || "";
}

function inferCityFromUniversityName(university) {
  const text = String(university || "");
  return CITY_TOKENS.find((city) => text.includes(city)) || "";
}

function parseCityFromNotes(notes) {
  const text = String(notes || "");
  return CITY_TOKENS.find((city) => text.includes(city)) || "";
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

  if (text.includes("鍏垂甯堣寖") || text.includes("浼樺笀璁″垝") || text.includes("瀹氬悜")) {
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
  const safeHighConfidenceCount = safeSchools.filter(
    (item) => Number(item.confidence || 0) >= 90
  ).length;
  const safeNearlyCertainCount = safeSchools.filter(
    (item) => Number(item.confidence || 0) >= 93
  ).length;
  const preferenceAxis = profile.subjectConstraints.includes("majorPriority")
    ? "major"
    : profile.subjectConstraints.includes("cityPriority")
      ? "city"
      : "school";
  const recommendation =
    preferenceAxis === "major"
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
    noAdjustmentSensitive:
      profile.majorNeeds.includes("noAdjustment") || !profile.willingAdjustment,
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
  const sparseHistoryBand = profile.track === "历史" && rank >= 60000;

  return {
    lowScoreBand,
    sparseHistoryBand,
    safePrimaryGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.15 : sparseHistoryBand ? 0.1 : 0.09,
      lowScoreBand ? 5200 : 3200,
      lowScoreBand ? 32000 : 36000
    ),
    safeFallbackGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.09 : sparseHistoryBand ? 0.06 : 0.055,
      2600,
      lowScoreBand ? 22000 : 20000
    ),
    safeMaxGap: createPlanRankMargin(rank, 0.3, 5000, lowScoreBand ? 60000 : 42000),
    steadyPositiveGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.03 : sparseHistoryBand ? 0.022 : 0.02,
      1000,
      lowScoreBand ? 9000 : 6500
    ),
    steadyNegativeGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.05 : sparseHistoryBand ? 0.045 : 0.04,
      1800,
      lowScoreBand ? 14000 : 11000
    ),
    rushNegativeGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.085 : sparseHistoryBand ? 0.075 : 0.065,
      3200,
      lowScoreBand ? 22000 : 15000
    ),
    rushMaxNegativeGap: createPlanRankMargin(
      rank,
      lowScoreBand ? 0.12 : sparseHistoryBand ? 0.11 : 0.095,
      4800,
      lowScoreBand ? 30000 : 22000
    )
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
  } else if (rankGap < -bands.steadyNegativeGap && rankGap >= -bands.rushNegativeGap) {
    tier = PLAN_TIER_RUSH;
  } else if (rankGap >= bands.safeFallbackGap && rankGap <= bands.safeMaxGap) {
    tier = PLAN_TIER_SAFE;
    tierSource = "fallback";
  } else if (rankGap < -bands.rushNegativeGap && rankGap >= -bands.rushMaxNegativeGap) {
    tier = PLAN_TIER_RUSH;
    tierSource = "fallback";
  } else if (
    rankGap >= -Math.round(bands.steadyNegativeGap * 1.15) &&
    rankGap <=
      Math.max(Math.round(bands.steadyPositiveGap * 1.25), Math.round(bands.safeFallbackGap * 0.6))
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
  const adjustment =
    tier === PLAN_TIER_SAFE
      ? Math.min(7, Math.max(-2, gapRate * 48))
      : tier === PLAN_TIER_STEADY
        ? Math.max(-7, 4 - Math.abs(gapRate) * 82)
        : Math.max(-9, Math.min(4, -gapRate * 34));

  return Math.round(clampPlanNumber(tierBase + adjustment, tierFloor, 97));
}

function normalizeRecommendationPoolForPlanV3(recommendations, profile) {
  return recommendations
    .map((item) => {
      const threshold = Number(item.threshold || 0);
      const tierMetrics = resolvePlanTierMetrics(profile, threshold);
      const tier = tierMetrics.tier || (tierMetrics.rankGap >= 0 ? PLAN_TIER_SAFE : PLAN_TIER_RUSH);
      const confidence = buildPlanConfidence(profile, threshold, tier, tierMetrics);
      const strictEligible =
        (tier === PLAN_TIER_SAFE &&
          tierMetrics.rankGap >= tierMetrics.bands.safePrimaryGap &&
          tierMetrics.rankGap <= tierMetrics.bands.safeMaxGap) ||
        (tier === PLAN_TIER_STEADY &&
          tierMetrics.rankGap >= -tierMetrics.bands.steadyNegativeGap &&
          tierMetrics.rankGap <= tierMetrics.bands.steadyPositiveGap) ||
        (tier === PLAN_TIER_RUSH &&
          tierMetrics.rankGap < -tierMetrics.bands.steadyNegativeGap &&
          Math.abs(tierMetrics.rankGap) <= tierMetrics.bands.rushNegativeGap);
      const rescueEligible =
        tierMetrics.rankGap >= 0 &&
        tierMetrics.rankGap <= tierMetrics.bands.safeMaxGap &&
        (tierMetrics.rankGap >= Math.round(tierMetrics.bands.safeFallbackGap * 0.72) ||
          confidence >= 90);

      return {
        ...item,
        tier,
        tierClass: getPlanTierClass(tier),
        confidence,
        rankGap: tierMetrics.rankGap,
        gapRate: tierMetrics.gapRate,
        bands: tierMetrics.bands,
        tierSource: tierMetrics.tierSource,
        strictEligible,
        rescueEligible,
        softPreferenceRelaxed: Boolean(item.softPreferenceRelaxed)
      };
    })
    .filter((item) => item?.bands && Number.isFinite(item.rankGap));
}

function shouldBackfillRelaxedPreferenceItems(profile, strictCount, sourceCount) {
  if (strictCount <= 0) {
    return true;
  }

  if (profile.rank > 120000 && strictCount < 30) {
    return true;
  }

  if (strictCount < 18) {
    return true;
  }

  if (sourceCount > 0 && strictCount / sourceCount < 0.08) {
    return true;
  }

  return false;
}

function sortPlanRushCandidates(items) {
  return [...items].sort((a, b) => {
    const aDistance = Math.abs(a.rankGap);
    const bDistance = Math.abs(b.rankGap);
    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    const qualityGap = getRecommendationDataQualityScore(b) - getRecommendationDataQualityScore(a);
    if (qualityGap !== 0) {
      return qualityGap;
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
    const qualityGap = getRecommendationDataQualityScore(b) - getRecommendationDataQualityScore(a);
    if (qualityGap !== 0) {
      return qualityGap;
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
    const qualityGap = getRecommendationDataQualityScore(b) - getRecommendationDataQualityScore(a);
    if (qualityGap !== 0) {
      return qualityGap;
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

function getRecommendationDataQualityScore(item) {
  let score = 0;
  const city = String(item?.city || "");
  const major = String(item?.major || "");

  if (city && city !== "校区待补录" && city !== "待核验城市" && city !== "待核验") {
    score += 3;
  }
  if (Number(item?.tuition || 0) > 0) {
    score += 3;
  }
  if (Array.isArray(item?.recommendedMajors) && item.recommendedMajors.length > 0) {
    score += 3;
  }
  if (major && !isGroupStyleMajor(major)) {
    score += 1;
  }

  return score;
}

function enrichTierExplanation(tier, school) {
  if (!school) {
    return "";
  }

  const confidenceText = school.confidence
    ? `当前置信度约 ${school.confidence}`
    : "当前置信度待核验";

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

function buildPlanRescueSafeCandidates(recommendations, used = new Set()) {
  return sortPlanSafeCandidates(
    recommendations
      .filter((item) => !used.has(`${item.university}-${item.major}`))
      .filter((item) => item.rescueEligible)
      .filter((item) => item.rankGap >= 0)
      .map((item) =>
        item.tier === PLAN_TIER_SAFE
          ? withPlanTierPlacement(
              item,
              PLAN_TIER_SAFE,
              item.strictEligible
                ? ""
                : " 当前院校位次明显在考生之后，系统将其补入保底层，用来加厚兜底安全垫。"
            )
          : withPlanTierPlacement(
              item,
              PLAN_TIER_SAFE,
              " 当前院校虽然原始层级更接近稳妥区，但因为对你更安全，所以被下调到保底层。"
            )
      )
  );
}

function buildTierMinimumFallbackCandidates(recommendations, used, tier) {
  const unusedItems = recommendations.filter((item) => !used.has(`${item.university}-${item.major}`));

  if (tier === PLAN_TIER_SAFE) {
    const preferredSafe = unusedItems
      .filter((item) => item.rankGap >= 0)
      .sort((a, b) => {
        if (b.rankGap !== a.rankGap) {
          return b.rankGap - a.rankGap;
        }
        return b.confidence - a.confidence;
      })
      .map((item) =>
        item.tier === PLAN_TIER_SAFE
          ? item
          : withPlanTierPlacement(
              item,
              PLAN_TIER_SAFE,
              " 当前候选被系统补入保底层，目的是保证这张表里始终有真正兜底的学校。"
            )
      );

    return preferredSafe.length ? preferredSafe : buildPlanRescueSafeCandidates(recommendations, used);
  }

  if (tier === PLAN_TIER_STEADY) {
    return unusedItems
      .slice()
      .sort((a, b) => {
        const distanceGap = Math.abs(a.rankGap) - Math.abs(b.rankGap);
        if (distanceGap !== 0) {
          return distanceGap;
        }
        return b.confidence - a.confidence;
      })
      .map((item) =>
        item.tier === PLAN_TIER_STEADY
          ? item
          : withPlanTierPlacement(
              item,
              PLAN_TIER_STEADY,
              " 当前候选与考生位次最接近，被系统补入稳妥层避免主力层空缺。"
            )
      );
  }

  const preferredRush = unusedItems
    .filter((item) => item.rankGap < 0)
    .sort((a, b) => {
      const distanceGap = Math.abs(a.rankGap) - Math.abs(b.rankGap);
      if (distanceGap !== 0) {
        return distanceGap;
      }
      return b.confidence - a.confidence;
    })
    .map((item) =>
      item.tier === PLAN_TIER_RUSH
        ? item
        : withPlanTierPlacement(
            item,
            PLAN_TIER_RUSH,
            " 当前候选录取线仍高于你的位次，被系统补入冲刺层保证冲刺位不断档。"
          )
    );

  if (preferredRush.length) {
    return preferredRush;
  }

  return unusedItems
    .slice()
    .sort((a, b) => {
      const distanceGap = Math.abs(a.rankGap) - Math.abs(b.rankGap);
      if (distanceGap !== 0) {
        return distanceGap;
      }
      return b.confidence - a.confidence;
    })
    .map((item) =>
      withPlanTierPlacement(
        item,
        PLAN_TIER_RUSH,
        " 当前分段可冲学校偏少，系统用最接近冲刺边界的候选补足冲刺层。"
      )
    );
}

function ensureTierMinimumCoverage(grouped, recommendations, used) {
  if (grouped.safe.length === 0) {
    fillPlanTier(
      grouped.safe,
      buildTierMinimumFallbackCandidates(recommendations, used, PLAN_TIER_SAFE),
      1,
      used
    );
  }

  if (grouped.steady.length === 0) {
    fillPlanTier(
      grouped.steady,
      buildTierMinimumFallbackCandidates(recommendations, used, PLAN_TIER_STEADY),
      1,
      used
    );
  }

  if (grouped.rush.length === 0) {
    fillPlanTier(
      grouped.rush,
      buildTierMinimumFallbackCandidates(recommendations, used, PLAN_TIER_RUSH),
      1,
      used
    );
  }
}

function pickTierSchoolsV3(recommendations, profile) {
  const grouped = {
    rush: [],
    steady: [],
    safe: []
  };
  const targets =
    profile.rank > 120000 ? { rush: 3, steady: 5, safe: 6 } : { rush: 3, steady: 4, safe: 4 };
  const used = new Set();

  fillPlanTier(
    grouped.rush,
    sortPlanRushCandidates(
      recommendations.filter(
        (item) =>
          item.tier === PLAN_TIER_RUSH &&
          item.strictEligible &&
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
          item.strictEligible &&
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
          item.strictEligible &&
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
              item.strictEligible &&
              item.rankGap >= (item.bands?.safeFallbackGap || 0) &&
              item.rankGap <= (item.bands?.safeMaxGap || 0) &&
              item.confidence >= 88
          )
          .map((item) =>
            item.tier === PLAN_TIER_SAFE
              ? item
              : withPlanTierPlacement(
                  item,
                  PLAN_TIER_SAFE,
                  " 当前候选与考生位次拉开了足够安全距离，被补入保底层。"
                )
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
              item.rescueEligible &&
              item.rankGap >= (item.bands?.safePrimaryGap || 0) &&
              item.rankGap <= (item.bands?.safeMaxGap || 0) &&
              item.confidence >= 92
          )
          .map((item) =>
            withPlanTierPlacement(
              item,
              PLAN_TIER_SAFE,
              " 当前候选在真实数据里更接近安全边界，用来补足不滑档的兜底层。"
            )
          )
      ),
      targets.safe,
      used
    );
  }

  if (grouped.safe.length < targets.safe) {
    fillPlanTier(
      grouped.safe,
      buildPlanRescueSafeCandidates(recommendations, used),
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
              item.rankGap >= -Math.round((item.bands?.steadyNegativeGap || 0) * 1.2) &&
              item.rankGap <=
                Math.max(
                  Math.round((item.bands?.steadyPositiveGap || 0) * 1.25),
                  Math.round((item.bands?.safeFallbackGap || 0) * 0.55)
                ) &&
              item.rankGap < (item.bands?.safePrimaryGap || Number.MAX_SAFE_INTEGER)
          )
          .map((item) =>
            item.tier === PLAN_TIER_STEADY
              ? item
              : withPlanTierPlacement(
                  item,
                  PLAN_TIER_STEADY,
                  " 当前候选和你的位次足够接近，被补入稳妥层承担主力志愿功能。"
                )
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
              item.rankGap <
                -Math.max(Math.round((item.bands?.steadyNegativeGap || 0) * 0.72), 1000) &&
              Math.abs(item.rankGap) <= Math.round((item.bands?.rushMaxNegativeGap || 0) * 1.05)
          )
          .map((item) =>
            item.tier === PLAN_TIER_RUSH
              ? item
              : withPlanTierPlacement(
                  item,
                  PLAN_TIER_RUSH,
                  " 当前候选录取线略高于你的位次，但仍在可尝试争取的范围内，所以放入冲刺层。"
                )
          )
      ),
      targets.rush,
      used
    );
  }

  ensureTierMinimumCoverage(grouped, recommendations, used);

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
    ? `结合 ${latestScoreRank.year} 年 ${profile.province}${profile.track} 位次表，当前分数对应位次约 ${latestScoreRank.rank}。`
    : "当前位次主要依据你填写的信息和已导入院校线数据综合判断。";
  const lowScoreProfile = profile.rank > 120000;

  return [
    {
      tier: PLAN_TIER_RUSH,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_RUSH],
      tierClass: "rush",
      explanation: `${latestRankText} 冲刺层只放录取线高于你当前位次、但仍在可争取范围内的学校${lowScoreProfile ? "；分数靠近本科线时，冲刺层会更克制，先保本科不滑档。" : "。"}${enrichTierExplanation(PLAN_TIER_RUSH, grouped.rush[0])}`,
      schools: grouped.rush
    },
    {
      tier: PLAN_TIER_STEADY,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_STEADY],
      tierClass: "steady",
      explanation: `稳妥层优先放和你当前位次最接近、录取把握和专业接受度都更均衡的学校，它们承担的是整张表里的主力功能。${enrichTierExplanation(PLAN_TIER_STEADY, grouped.steady[0])}`,
      schools: grouped.steady
    },
    {
      tier: PLAN_TIER_SAFE,
      tierLabel: PLAN_TIER_LABELS[PLAN_TIER_SAFE],
      tierClass: "safe",
      explanation: `保底层必须明显更安全，目标不是好看，而是尽量不给滑档留口子${lowScoreProfile ? "；对本科线附近考生，系统会主动把保底层做厚，优先保证有学校可报。" : "。"}${enrichTierExplanation(PLAN_TIER_SAFE, grouped.safe[0])}`,
      schools: grouped.safe
    }
  ];
}

function resolvePlannerDataSource(profile, generatedData) {
  const latestYear = getLatestUniversityYear(generatedData, profile.province, profile.track);
  const importedRows = latestYear
    ? getImportedUniversityMajorLines(profile, generatedData, latestYear)
    : [];

  return importedRows.length > 0 ? "structured+demo" : "demo";
}

function getImportedUniversityMajorLines(profile, generatedData, latestYear) {
  const relationalRows = getImportedUniversityMajorLinesFromFacade(profile, latestYear);
  if (relationalRows.length > 0) {
    return relationalRows;
  }

  return generatedData.universityMajorLines.filter(
    (item) =>
      item.province === profile.province &&
      Number(item.year) === Number(latestYear) &&
      (!profile.track || !item.track || item.track === profile.track) &&
      normalizeBatch(item.batch).includes("本科")
  );
}

function getImportedUniversityMajorLinesFromFacade(profile, latestYear) {
  const provinceCode = normalizePlannerProvinceCode(profile.province);
  const trackType = normalizePlannerTrackType(profile.track);

  if (!provinceCode || !trackType || !Number.isFinite(Number(latestYear))) {
    return [];
  }

  const rows = getDataEngine().facade.buildAdmissionEvidence({
    provinceCode,
    year: Number(latestYear),
    trackType,
    batchCode: "undergraduate_batch",
    limit: 6000
  });

  return rows.map(mapFacadeAdmissionRecordToPlannerRow).filter(Boolean);
}

function mapFacadeAdmissionRecordToPlannerRow(record) {
  if (!record?.university_name || !record?.major_name) {
    return null;
  }

  return {
    province: denormalizePlannerProvinceCode(record.province_code),
    year: Number(record.year),
    track: denormalizePlannerTrackType(record.track_type),
    university: record.university_name,
    major: record.major_name,
    minScore: Number(record.min_score || 0),
    minRank: Number(record.min_rank || 0),
    batch: denormalizePlannerBatchCode(record.batch_code),
    admissionCount: Number(record.actual_admit_count || record.plan_count || 0),
    subjectRequirement: record.subject_requirement || "",
    subjectRule: {
      raw: record.subject_requirement || "",
      ruleType: record.rule_type || "unknown",
      requiredSubjects: parsePlannerJsonArray(record.required_subjects_json),
      oneOfSubjects: parsePlannerJsonArray(record.optional_subjects_json),
      preferredSubjects: [],
      forbiddenSubjects: parsePlannerJsonArray(record.forbidden_subjects_json),
      allowedTracks: parsePlannerJsonArray(record.track_limit_json).map(denormalizePlannerTrackType)
    },
    requiredSubjects: parsePlannerJsonArray(record.required_subjects_json),
    oneOfSubjects: parsePlannerJsonArray(record.optional_subjects_json),
    preferredSubjects: [],
    forbiddenSubjects: parsePlannerJsonArray(record.forbidden_subjects_json),
    tuition: Number(record.tuition_fee || 0),
    notes: record.notes || ""
  };
}

function parsePlannerJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizePlannerProvinceCode(value) {
  return normalizeProvinceCode(value);
}

function _legacyNormalizePlannerProvinceCode(value) {
  const normalized = String(value || "").trim();

  if (normalized === "\u5e7f\u4e1c" || normalized === "骞夸笢") {
    return "GD";
  }

  return null;
}

function normalizePlannerTrackType(value) {
  const normalized = String(value || "").trim();

  if (normalized === "\u7269\u7406" || normalized === "鐗╃悊") {
    return "physics";
  }

  if (normalized === "\u5386\u53f2" || normalized === "鍘嗗彶") {
    return "history";
  }

  return null;
}

function denormalizePlannerProvinceCode(value) {
  return denormalizeProvinceName(value);
}

function _legacyDenormalizePlannerProvinceCode(value) {
  if (value === "GD") {
    return "广东";
  }

  return String(value || "");
}

function denormalizePlannerTrackType(value) {
  if (value === "physics") {
    return "物理";
  }

  if (value === "history") {
    return "历史";
  }

  return String(value || "");
}

function denormalizePlannerBatchCode(value) {
  if (value === "undergraduate_batch") {
    return "本科批";
  }

  return String(value || "");
}
