import {
  interestCatalog,
  majorDirections,
  provinceDifficultyFactor,
  riskConfig,
  universityCatalog
} from "../data/plannerData.js";
import { loadGeneratedGaokaoData, findHistoricalMajorLine } from "./dataService.js";
import { generateStructuredPlanningSummary } from "./llmService.js";

export async function generateVolunteerPlan(profile) {
  const selectedInterests = interestCatalog.filter((item) => profile.interests.includes(item.id));
  const keywordPool = buildKeywordPool(profile, selectedInterests);
  const matchedDirections = scoreDirections(keywordPool);
  const generatedData = loadGeneratedGaokaoData();
  const recommendationPool = scoreSchools(profile, matchedDirections, selectedInterests, generatedData);
  const applicationPlan = buildApplicationPlan(recommendationPool);
  const backupOptions = recommendationPool.slice(12, 18);
  const localSummary = buildLocalSummary(profile, matchedDirections, recommendationPool);
  const aiSummary = await generateStructuredPlanningSummary({
    preferredProvider: profile.aiProvider,
    input: {
      profile,
      matchedDirections: matchedDirections.slice(0, 5),
      topRecommendations: recommendationPool.slice(0, 8)
    }
  });

  return {
    profile: {
      province: profile.province,
      track: profile.track,
      score: profile.score,
      rank: profile.rank,
      riskLabel: riskConfig[profile.risk].label
    },
    summary: {
      overview: aiSummary?.overview || localSummary.overview,
      strategy: aiSummary?.strategy || localSummary.strategy,
      careerAdvice: aiSummary?.careerAdvice || localSummary.careerAdvice
    },
    majorDirections: matchedDirections.slice(0, 6),
    applicationPlan,
    backupOptions,
    riskAlerts: aiSummary?.riskAlerts || localSummary.riskAlerts,
    meta: {
      analysisMode: aiSummary ? "llm" : "local",
      dataSource: generatedData.universityMajorLines.length > 0 ? "imported+demo" : "demo"
    }
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
  profile.majorNeeds.forEach((item) => tokens.add(item));
  profile.schoolTags.forEach((item) => tokens.add(item));

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
        const ratio = profile.rank / threshold;
        const tier = resolveTier(ratio, config);

        if (!tier || !passesConstraints(profile, school, major)) {
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

        const confidenceBase = tier === "保" ? 88 : tier === "稳" ? 78 : 64;
        const confidence =
          confidenceBase -
          Math.min(20, Math.abs(profile.rank - threshold) / Math.max(threshold, 1) * 100);

        return {
          tier,
          tierClass: tier === "冲" ? "rush" : tier === "稳" ? "steady" : "safe",
          university: school.name,
          city: school.city,
          nature: school.nature,
          major: major.name,
          tuition: historical?.tuition || school.tuition,
          threshold,
          year: historical?.year || null,
          minScore: historical?.minScore || null,
          subjectRequirement: historical?.subjectRequirement || "",
          confidence: Math.max(55, Math.round(confidence)),
          score:
            100 -
            Math.min(60, Math.abs(profile.rank - threshold) / Math.max(500, threshold) * 100) +
            directionBonus +
            tagBonus +
            cityBonus +
            schoolTagBonus +
            employmentBonus +
            graduateBonus +
            majorPriorityBonus +
            cityPriorityBonus +
            popularityAdjustment,
          reason: buildReason(profile, school, major, threshold, tier, historical)
        };
      })
    )
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function passesConstraints(profile, school, major) {
  if (profile.maxTuition > 0 && school.tuition > profile.maxTuition) {
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

  if (profile.majorNeeds.includes("noAdjustment") && major.popularity === "hot") {
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
    parts.push("适合放在冲刺层，争取更高学校层次或更热门专业。");
  } else if (tier === "稳") {
    parts.push("适合作为主力志愿，匹配度和录取把握更平衡。");
  } else {
    parts.push("适合作为保底志愿，优先保障录取结果。");
  }

  return parts.join("");
}

function buildApplicationPlan(recommendations) {
  const tierMeta = {
    冲: "冲刺层：有难度，但适合争取学校层次或更强平台。",
    稳: "主力层：建议作为正式志愿表的核心部分。",
    保: "保底层：用于兜底，避免全部志愿失手。"
  };

  return ["冲", "稳", "保"].map((tier) => {
    const picked = [];
    const seen = new Set();

    recommendations
      .filter((item) => item.tier === tier)
      .forEach((item) => {
        const key = `${item.university}-${item.major}`;
        if (picked.length >= 4 || seen.has(key)) {
          return;
        }

        picked.push(item);
        seen.add(key);
      });

    return {
      tier,
      tierLabel: tier === "冲" ? "冲刺志愿" : tier === "稳" ? "主力志愿" : "保底志愿",
      tierClass: tier === "冲" ? "rush" : tier === "稳" ? "steady" : "safe",
      explanation: tierMeta[tier],
      schools: picked
    };
  });
}

function buildLocalSummary(profile, directions, recommendations) {
  const topDirections = directions.slice(0, 3).map((item) => item.name).join("、");
  const risk = riskConfig[profile.risk];
  const rushCount = recommendations.filter((item) => item.tier === "冲").length;
  const safeCount = recommendations.filter((item) => item.tier === "保").length;

  return {
    overview: `从当前画像看，你更适合优先围绕 ${topDirections} 这几个方向做志愿布局。系统判断位次是主要参考指标，职业规划和兴趣用于进一步缩小专业范围。`,
    strategy: `${risk.strategy} 当前推荐里“冲”类候选约 ${rushCount} 个，“保”类候选约 ${safeCount} 个，建议在正式填报时继续补齐保底和备选组合。`,
    careerAdvice: "先确定未来 5 到 10 年想进入的职业赛道，再倒推专业和学校平台，通常比单纯追求学校名气更稳妥。",
    riskAlerts: [
      "当前版本仍是演示型数据模型，不能替代最新官方招生计划和录取位次。",
      "如果你对城市、学费或调剂限制非常敏感，建议正式填报前再做一轮人工筛选。",
      "如果目标专业是热门方向，真实录取波动可能大于学校最低位次的表面差距。"
    ]
  };
}

function shorten(text, length) {
  return text.length <= length ? text : `${text.slice(0, length)}...`;
}
