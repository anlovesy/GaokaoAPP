import { advisorModeOptions } from "../config.js";
import { getUniversityProfile } from "../universityProfiles.js";
import {
  CHAT_SESSION_STORAGE_KEY,
  DEFAULT_ADVISOR_MODE,
  SCREEN_ADVISOR,
  SCREEN_AUTH,
  SCREEN_LANDING,
  SCREEN_PATH_MAP,
  SCREEN_UNIVERSITY,
  SCREEN_WORKSPACE,
  TRIAL_STORAGE_KEY,
  UNIVERSITY_DETAIL_STORAGE_KEY
} from "./constants.js";

export function getAdvisorModeConfig(mode) {
  return (
    advisorModeOptions.find((item) => item.value === mode) ||
    advisorModeOptions.find((item) => item.value === DEFAULT_ADVISOR_MODE) ||
    advisorModeOptions[0]
  );
}

export function createChatMessage(role, content, extra = {}) {
  return {
    id:
      extra.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    role,
    content,
    timestamp: extra.timestamp || new Date().toISOString(),
    ...extra
  };
}

export function createStarterChat(mode = DEFAULT_ADVISOR_MODE) {
  const config = getAdvisorModeConfig(mode);
  const introByMode = {
    xuefeng:
      "你把我当成一个懂广东志愿规则、愿意讲透利弊的老师来聊就行。我不会只安慰你，我会先帮你看分数、位次、专业组、城市和就业出口，再直接告诉你哪些能冲、哪些别硬冲。",
    gentle:
      "你可以把我当成一个陪你把志愿一步步梳理清楚的顾问。我们先把信息补完整，再一起把学校、专业、城市和风险拆开讲明白。"
  };

  return [
    createChatMessage("assistant", `${config.opening}\n\n${introByMode[mode] || introByMode.gentle}`)
  ];
}

export function createPlanReadyMessage(mode = DEFAULT_ADVISOR_MODE, chatEnabled = true) {
  if (!chatEnabled) {
    return "正式志愿方案已经生成。游客模式到这里可以完整体验一次填报能力；如果你想继续连续追问、记住上下文并重排方案，登录后就能继续往下聊。";
  }

  if (mode === "xuefeng") {
    return "方案已经出来了。接下来别急着高兴，先把最关键的几件事聊透：为什么这么排、哪些专业组是看着稳其实最坑、如果只留广东要不要降层次、哪些位置最容易因为调剂和组内冷热差被坑。";
  }

  return "正式方案已经生成。接下来我们可以继续把原因讲透，比如为什么这样排序、哪些专业组风险更高、如果只想留在广东该怎么调，以及怎样把滑档和调剂风险继续压下去。";
}

export function buildHeaders(token, trialToken) {
  const headers = {
    "Content-Type": "application/json",
    "X-Trial-Token": trialToken
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function resolveInitialScreen(hasAuthToken) {
  if (typeof window === "undefined") {
    return hasAuthToken ? SCREEN_WORKSPACE : SCREEN_LANDING;
  }

  return resolveScreenFromPath(window.location.pathname, hasAuthToken);
}

export function resolveScreenFromPath(pathname, hasAuthToken) {
  if (pathname === SCREEN_PATH_MAP[SCREEN_AUTH]) {
    return SCREEN_AUTH;
  }

  if (pathname === SCREEN_PATH_MAP[SCREEN_ADVISOR]) {
    return hasAuthToken ? SCREEN_ADVISOR : SCREEN_LANDING;
  }

  if (pathname === SCREEN_PATH_MAP[SCREEN_UNIVERSITY]) {
    return hasAuthToken ? SCREEN_UNIVERSITY : SCREEN_LANDING;
  }

  if (pathname === SCREEN_PATH_MAP[SCREEN_WORKSPACE]) {
    return hasAuthToken ? SCREEN_WORKSPACE : SCREEN_LANDING;
  }

  return SCREEN_LANDING;
}

export function ensureTrialToken() {
  const existing = localStorage.getItem(TRIAL_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextToken =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `trial-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(TRIAL_STORAGE_KEY, nextToken);
  return nextToken;
}

export function ensureChatSessionId() {
  const existing = localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextSessionId = createChatSessionId();
  localStorage.setItem(CHAT_SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

export function createChatSessionId() {
  const nextSessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(CHAT_SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

export function scheduleChatInputFocus({ isAdvisorRouteActive, inlineInputRef, overlayInputRef }) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const nextTarget =
      (isAdvisorRouteActive ? overlayInputRef?.current : null) || inlineInputRef?.current;

    if (nextTarget && typeof nextTarget.focus === "function") {
      nextTarget.focus();
    }
  });
}

export function buildAdvisorContextHighlights({ formState, profileHighlights, planStats, result }) {
  const summary = [
    { label: "省份 / 科类", value: `${formState.province || "待补"} · ${formState.track || "待补"}` },
    { label: "分数 / 位次", value: `${formState.score || "--"} 分 · ${formState.rank || "--"} 位` },
    {
      label: "选科",
      value: formState.selectedSubjects?.length ? formState.selectedSubjects.join(" / ") : "待补选科"
    },
    {
      label: "方案状态",
      value: result?.applicationPlan?.length ? `已生成 ${planStats.length} 层冲稳保方案` : "尚未生成正式方案"
    }
  ];

  if (profileHighlights?.length) {
    summary.push({
      label: "画像摘要",
      value: profileHighlights.slice(0, 3).join(" · ")
    });
  }

  if (planStats?.length) {
    summary.push({
      label: "冲稳保分布",
      value: planStats.map((item) => `${item.label} ${item.count} 所`).join(" / ")
    });
  }

  return summary;
}

export function buildPlanContextPrompt(result, formState) {
  if (!result?.applicationPlan?.length) {
    return "";
  }

  const [rushTier, steadyTier, safeTier] = result.applicationPlan;
  const selections = formState.selectedSubjects?.length
    ? formState.selectedSubjects.join(" / ")
    : "待补选科";

  return [
    "请直接带着我当前这张志愿表继续分析，不要重新从零开始。",
    `我的基础信息是：${formState.province || "待补"}，${formState.track || "待补"}，${formState.score || "--"} 分，位次 ${formState.rank || "--"}，选科 ${selections}。`,
    `当前冲刺层代表是：${rushTier?.schools?.[0]?.university || "暂无"}。`,
    `当前稳妥层代表是：${steadyTier?.schools?.[0]?.university || "暂无"}。`,
    `当前保底层代表是：${safeTier?.schools?.[0]?.university || "暂无"}。`,
    "请你按冲稳保逻辑，直接告诉我这张表最该继续排查的风险、最值得保留的位置，以及下一步怎么改。"
  ].join("");
}

export function buildTradeoffPanel(riskProfile, formState) {
  if (riskProfile.majorPriorityStrong) {
    return {
      title: "你当前是“专业优先”路线",
      description:
        "这意味着你更在意未来能学到什么、将来能靠什么吃饭。学校名气和城市光环可以适当让一点，但专业组里一定要是你能接受的。",
      nextSteps: [
        "先删掉不能接受的专业组，再看学校层次",
        "如果只留大城市，先接受学校平台可能要下调",
        "继续追问：哪些学校是看着稳、其实调剂风险高"
      ]
    };
  }

  if (riskProfile.cityPriorityStrong) {
    return {
      title: "你当前是“城市优先”路线",
      description:
        "你更在意未来四年的城市资源、实习机会和生活环境。代价通常是学校层次、专业热度或者保底厚度要往下让。",
      nextSteps: [
        "优先核对广州、深圳院校的保底是否足够",
        "把省外同层次学校留作备份，不要完全堵死",
        "继续追问：只留广东到底要牺牲多少层次"
      ]
    };
  }

  return {
    title: "你当前更像“学校平台优先”路线",
    description:
      "这类取舍更重视学校品牌和平台资源，但要小心专业组里冷热差太大，或者进了学校却读不到自己真正想学的方向。",
    nextSteps: [
      "重点检查每个专业组里是否存在你完全不能接受的专业",
      "把保底组再做厚一点，防止平台执念导致滑档",
      "继续追问：哪些平台型学校值得冲，哪些只是看着体面"
    ]
  };
}

export function buildAuthWallRows(profiles) {
  if (!Array.isArray(profiles) || !profiles.length) {
    return [];
  }

  return [0, 3, 6].map((offset) => rotateItems(profiles, offset).slice(0, 6));
}

export function rotateItems(items, offset = 0) {
  const safeOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

export function buildUniversityGallery(result) {
  const grouped = new Map();

  collectPlanSchools(result).forEach((school) => {
    const key = school.university;
    const profile = getUniversityProfile(school.university);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        university: school.university,
        city: school.city,
        heroMajor: school.major,
        tierLabel: school.tierLabel,
        tierClass: school.tierClass,
        recommendationCount: 1,
        bestConfidence: Number(school.confidence || 0),
        schools: [school],
        profile
      });
      return;
    }

    existing.recommendationCount += 1;
    existing.schools.push(school);

    if (Number(school.confidence || 0) >= existing.bestConfidence) {
      existing.bestConfidence = Number(school.confidence || 0);
      existing.heroMajor = school.major;
      existing.tierLabel = school.tierLabel;
      existing.tierClass = school.tierClass;
      existing.city = school.city || existing.city;
    }
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      schools: item.schools.sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    }))
    .sort((a, b) => b.bestConfidence - a.bestConfidence);
}

export function collectPlanSchools(result) {
  if (!result) {
    return [];
  }

  const planSchools = (result.applicationPlan || []).flatMap((tier) =>
    (tier.schools || []).map((school) => ({
      ...school,
      tierLabel: tier.tierLabel,
      tierClass: tier.tierClass,
      tierKey: tier.tier
    }))
  );

  const backupSchools = (result.backupOptions || []).map((school) => ({
    ...school,
    tierLabel: school.tier ? `${school.tier}层候补` : "候补备选",
    tierClass: school.tierClass || "steady",
    tierKey: school.tier || "backup"
  }));

  return [...planSchools, ...backupSchools];
}

export function resolveSchoolRankValue(school) {
  return school?.minRank || school?.threshold || "--";
}

export function formatTuitionText(value) {
  if (!value) {
    return "待补充";
  }

  if (typeof value === "number") {
    return `${value} 元/年`;
  }

  return String(value);
}

export function readStoredUniversityDetail() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(UNIVERSITY_DETAIL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredUniversityDetail(university) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(UNIVERSITY_DETAIL_STORAGE_KEY, JSON.stringify(university));
  } catch {
    // ignore storage write issues
  }
}

export function clearStoredUniversityDetail() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(UNIVERSITY_DETAIL_STORAGE_KEY);
  } catch {
    // ignore storage cleanup issues
  }
}

export function formatUserRole(role) {
  if (role === "admin") {
    return "管理员";
  }

  if (role === "advisor") {
    return "普通顾问";
  }

  return "未识别";
}

export function formatDateTime(value) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatChatTimestamp(value) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
