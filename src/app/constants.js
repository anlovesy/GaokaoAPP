export const TRIAL_STORAGE_KEY = "gaokao_trial_token";
export const CHAT_SESSION_STORAGE_KEY = "gaokao_chat_session_id";
export const AUTH_TOKEN_STORAGE_KEY = "gaokao_auth_token";
export const UNIVERSITY_DETAIL_STORAGE_KEY = "gaokao_selected_university_detail";

export const SCREEN_LANDING = "landing";
export const SCREEN_AUTH = "auth";
export const SCREEN_WORKSPACE = "workspace";
export const SCREEN_ADVISOR = "advisor";
export const SCREEN_UNIVERSITY = "university";

export const SCREEN_PATH_MAP = {
  [SCREEN_LANDING]: "/",
  [SCREEN_AUTH]: "/login",
  [SCREEN_WORKSPACE]: "/workspace",
  [SCREEN_ADVISOR]: "/advisor",
  [SCREEN_UNIVERSITY]: "/university"
};

export const WORKSPACE_TABS = [
  { value: "plan", label: "志愿方案", description: "看冲稳保结果与学校专业分层" },
  { value: "insights", label: "画像洞察", description: "看风险、偏好与填报提醒" },
  { value: "account", label: "账户中心", description: "看账号、历史记录与管理员功能" }
];

export const RISK_OPTIONS = [
  { value: "aggressive", label: "冲刺型", description: "多给上冲空间，接受更高波动" },
  { value: "balanced", label: "均衡型", description: "兼顾学校层次与录取把握" },
  { value: "conservative", label: "保守型", description: "优先保住本科与稳妥录取" }
];

export const DEFAULT_ADVISOR_MODE = "xuefeng";

export const PLATFORM_HIGHLIGHTS = [
  "广东考生优先的数据和策略框架",
  "按冲稳保分层生成大学与专业建议",
  "兼顾分数、位次、城市、兴趣和职业规划",
  "聊天式 AI 顾问持续解释“为什么这么填”"
];

export const WORKSPACE_FEATURES = [
  "先保证可报，再按偏好做排序，不让低分段学生被系统“放弃”",
  "保底层优先挑录取把握更高、调剂风险更低的志愿",
  "对广东新高考专业组、调剂、滑档风险做重点提醒",
  "登录用户可持续追问，聊天会记住当前志愿方案上下文"
];
