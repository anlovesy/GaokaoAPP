const profiles = [
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 640,
    rank: 5200,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 610,
    rank: 18200,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 580,
    rank: 37100,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 540,
    rank: 70000,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 500,
    rank: 138000,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    selectedSubjects: ["物理", "化学"],
    score: 470,
    rank: 191000,
    risk: "balanced",
    interests: ["technology", "engineering"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "历史",
    selectedSubjects: ["历史", "政治"],
    score: 610,
    rank: 1800,
    risk: "balanced",
    interests: ["law", "language"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "历史",
    selectedSubjects: ["历史", "政治"],
    score: 570,
    rank: 7600,
    risk: "balanced",
    interests: ["law", "language"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "历史",
    selectedSubjects: ["历史", "政治"],
    score: 540,
    rank: 17800,
    risk: "balanced",
    interests: ["law", "language"]
  },
  {
    province: "广东",
    examMode: "3+1+2",
    track: "历史",
    selectedSubjects: ["历史", "政治"],
    score: 510,
    rank: 34500,
    risk: "balanced",
    interests: ["law", "language"]
  }
].map((profile) => ({
  preferredCities: "",
  careerPlan: "",
  notes: "",
  maxTuition: 0,
  englishScore: 0,
  candidateType: "general",
  specialPlans: [],
  healthNotes: "",
  willingAdjustment: true,
  personalityTags: [],
  schoolTags: [],
  majorNeeds: [],
  subjectConstraints: [],
  ...profile
}));

const CITY_PLACEHOLDERS = new Set(["", "校区待补录", "待核验城市", "待核验", "未核验"]);

function flattenPlan(plan = []) {
  return plan.flatMap((tierBlock) =>
    (tierBlock.schools || []).map((school) => ({
      tierClass: tierBlock.tierClass,
      ...school
    }))
  );
}

function summarizeBySchool(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.university, (counts.get(item.university) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([school, count]) => ({ school, count }));
}

function isMissingCity(city) {
  const normalizedCity = String(city || "").trim();
  return CITY_PLACEHOLDERS.has(normalizedCity) || normalizedCity.includes("未核验");
}

const result = {
  checkedProfiles: profiles.length,
  tierCoverage: [],
  missingTuition: [],
  missingCity: [],
  missingMajorDetails: [],
  failures: []
};

for (let i = 0; i < profiles.length; i += 1) {
  const profile = profiles[i];
  const response = await fetch("http://127.0.0.1:3001/api/planner/recommend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `gaokao_trial_token=verify-${Date.now()}-${i}`
    },
    body: JSON.stringify(profile)
  });

  const payload = await response.json();
  if (!response.ok || !payload?.ok || !payload?.data) {
    result.failures.push({
      track: profile.track,
      score: profile.score,
      status: response.status,
      error: payload?.error || "unknown-error"
    });
    continue;
  }

  const rows = flattenPlan(payload.data.applicationPlan);
  result.tierCoverage.push({
    track: profile.track,
    score: profile.score,
    rank: profile.rank,
    counts: Object.fromEntries(
      (payload.data.applicationPlan || []).map((tierBlock) => [
        tierBlock.tierClass,
        (tierBlock.schools || []).length
      ])
    )
  });

  result.missingTuition.push(
    ...rows
      .filter((row) => !(Number(row.tuition) > 0))
      .map((row) => ({
        university: row.university,
        major: row.major,
        track: profile.track,
        score: profile.score
      }))
  );

  result.missingCity.push(
    ...rows
      .filter((row) => isMissingCity(row.city))
      .map((row) => ({
        university: row.university,
        major: row.major,
        city: row.city,
        track: profile.track,
        score: profile.score
      }))
  );

  result.missingMajorDetails.push(
    ...rows
      .filter((row) => !Array.isArray(row.majorDetails) || row.majorDetails.length === 0)
      .map((row) => ({
        university: row.university,
        major: row.major,
        track: profile.track,
        score: profile.score
      }))
  );
}

console.log(
  JSON.stringify(
    {
      checkedProfiles: result.checkedProfiles,
      failures: result.failures,
      tierCoverage: result.tierCoverage,
      missingTuitionCount: result.missingTuition.length,
      missingTuitionSchools: summarizeBySchool(result.missingTuition),
      missingCityCount: result.missingCity.length,
      missingCitySchools: summarizeBySchool(result.missingCity),
      missingMajorDetailsCount: result.missingMajorDetails.length,
      missingMajorDetailsSchools: summarizeBySchool(result.missingMajorDetails)
    },
    null,
    2
  )
);
