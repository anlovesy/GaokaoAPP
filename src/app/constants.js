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
  { value: "plan", label: "志愿方案", description: "查看冲稳保结果" },
  { value: "insights", label: "画像洞察", description: "查看风险与提醒" },
  { value: "account", label: "账户中心", description: "查看历史与管理" }
];

export const RISK_OPTIONS = [
  { value: "aggressive", label: "冲刺型", description: "优先向上突破" },
  { value: "balanced", label: "均衡型", description: "兼顾层次与把握" },
  { value: "conservative", label: "保守型", description: "优先稳妥录取" }
];

export const DEFAULT_ADVISOR_MODE = "xuefeng";

export const PLATFORM_HIGHLIGHTS = ["按位次同步推演", "围绕真实志愿表", "让判断先于选择"];

export const WORKSPACE_FEATURES = ["先看把握", "再排顺序", "最后填表"];
