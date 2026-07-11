import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  advisorQuickPrompts,
  defaultFormState,
  filterOptions,
  interestOptions,
  personalityTagOptions,
  provinceExamModeMap,
  quickQuestionTemplates
} from "./config.js";
import { buildPrintablePlan } from "./printPlan.js";
import {
  AUTH_TOKEN_STORAGE_KEY,
  ADVISOR_STATE_STORAGE_KEY,
  CHAT_SESSION_STORAGE_KEY,
  DEFAULT_ADVISOR_MODE,
  ENTRY_MODE_STORAGE_KEY,
  RISK_OPTIONS,
  SCREEN_ACCOUNT,
  SCREEN_ADVISOR,
  SCREEN_ADMIN_USERS,
  SCREEN_AUTH,
  SCREEN_HISTORY,
  SCREEN_LANDING,
  SCREEN_NAVIGATION,
  SCREEN_PATH_MAP,
  SCREEN_UNIVERSITY,
  SCREEN_WORKSPACE,
  WORKSPACE_RESULT_STORAGE_KEY
} from "./app/constants.js";
import {
  buildAdvisorContextHighlights,
  buildHeaders,
  buildPlanContextPrompt,
  buildTradeoffPanel,
  clearStoredUniversityDetail,
  createChatMessage,
  createChatSessionId,
  createPlanReadyMessage,
  createStarterChat,
  ensureChatSessionId,
  ensureTrialToken,
  getAdvisorModeConfig,
  readStoredUniversityDetail,
  resolveInitialScreen,
  resolveScreenFromPath,
  scheduleChatInputFocus,
  writeStoredUniversityDetail
} from "./app/utils.js";
import {
  ROLES,
  canAccessAdminWorkspace,
  canAccessScreen
} from "./app/rbac.js";
import { pageShellTransition } from "./motion/presets.js";
import { UserMenu } from "./components/system/UserMenu.jsx";

const LandingScreen = lazy(() =>
  import("./pages/landing/LandingScreen.jsx").then((module) => ({ default: module.LandingScreen }))
);
const AuthScreen = lazy(() =>
  import("./pages/auth/AuthScreen.jsx").then((module) => ({ default: module.AuthScreen }))
);
const NavigationScreen = lazy(() =>
  import("./pages/navigation/NavigationScreen.jsx").then((module) => ({
    default: module.NavigationScreen
  }))
);
const DecisionWorkspaceScreen = lazy(() =>
  import("./pages/workspace/DecisionWorkspaceScreen.jsx").then((module) => ({
    default: module.DecisionWorkspaceScreen
  }))
);
const HistoryScreen = lazy(() =>
  import("./pages/history/HistoryScreen.jsx").then((module) => ({ default: module.HistoryScreen }))
);
const UniversityScreen = lazy(() =>
  import("./pages/university/UniversityScreen.jsx").then((module) => ({
    default: module.UniversityScreen
  }))
);
const AdvisorScreen = lazy(() =>
  import("./pages/advisor/AdvisorScreen.jsx").then((module) => ({ default: module.AdvisorScreen }))
);
const AccountScreen = lazy(() =>
  import("./pages/account/AccountScreen.jsx").then((module) => ({ default: module.AccountScreen }))
);
const AdminUsersScreen = lazy(() =>
  import("./pages/admin/AdminUsersScreen.jsx").then((module) => ({
    default: module.AdminUsersScreen
  }))
);

function readStoredAdvisorState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(ADVISOR_STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredAdvisorState(state) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(ADVISOR_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage write issues
  }
}

function clearStoredAdvisorState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(ADVISOR_STATE_STORAGE_KEY);
  } catch {
    // ignore storage cleanup issues
  }
}

function readStoredWorkspaceResult() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_RESULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredWorkspaceResult(result) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (result) {
      window.sessionStorage.setItem(WORKSPACE_RESULT_STORAGE_KEY, JSON.stringify(result));
    } else {
      window.sessionStorage.removeItem(WORKSPACE_RESULT_STORAGE_KEY);
    }
  } catch {
    // ignore storage write issues
  }
}

function AppRoot() {
  const storedAdvisorState = readStoredAdvisorState();
  const storedWorkspaceResult = readStoredWorkspaceResult();
  const initialAdvisorMode = storedAdvisorState?.mode || DEFAULT_ADVISOR_MODE;
  const initialChatMessages =
    Array.isArray(storedAdvisorState?.messages) && storedAdvisorState.messages.length
      ? storedAdvisorState.messages
      : createStarterChat(initialAdvisorMode);

  const [screen, setScreen] = useState(() =>
    resolveInitialScreen(Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)))
  );
  const [entryMode, setEntryMode] = useState(() =>
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      ? "member"
      : localStorage.getItem(ENTRY_MODE_STORAGE_KEY) || "none"
  );
  const [formState, setFormState] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() => storedWorkspaceResult);
  const [providers, setProviders] = useState([]);
  const [dataStatus, setDataStatus] = useState(null);
  const [advisorMode, setAdvisorMode] = useState(initialAdvisorMode);
  const [chatMessages, setChatMessages] = useState(() => initialChatMessages);
  const [chatSessionId, setChatSessionId] = useState(
    () => storedAdvisorState?.sessionId || ensureChatSessionId()
  );
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "");
  const [trialToken] = useState(() => ensureTrialToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [historyData, setHistoryData] = useState({ plans: [], chats: [], imports: [] });
  const [userList, setUserList] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [userManagementMessage, setUserManagementMessage] = useState("");
  const [userManagementLoading, setUserManagementLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    role: ROLES.TEACHER
  });
  const [passwordResetForm, setPasswordResetForm] = useState({});
  const [guestPlanConsumed, setGuestPlanConsumed] = useState(false);
  const [selectedUniversityDetail, setSelectedUniversityDetail] = useState(() =>
    readStoredUniversityDetail()
  );
  const inlineChatInputRef = useRef(null);
  const overlayChatInputRef = useRef(null);
  const sessionHydratedRef = useRef(
    Boolean(
      (Array.isArray(initialChatMessages) && initialChatMessages.length > 1) || storedWorkspaceResult
    )
  );

  const advisorConfig = useMemo(() => getAdvisorModeConfig(advisorMode), [advisorMode]);

  const selectedInterestLabels = useMemo(
    () =>
      interestOptions
        .filter((item) => formState.interests.includes(item.id))
        .map((item) => item.label),
    [formState.interests]
  );

  const _selectedPersonalityLabels = useMemo(
    () =>
      personalityTagOptions
        .filter((item) => formState.personalityTags.includes(item.value))
        .map((item) => item.label),
    [formState.personalityTags]
  );

  const selectedSchoolLabels = useMemo(
    () =>
      filterOptions
        .find((group) => group.key === "schoolTags")
        ?.options.filter((item) => formState.schoolTags.includes(item.value))
        .map((item) => item.label) || [],
    [formState.schoolTags]
  );

  const selectedNeedLabels = useMemo(
    () =>
      filterOptions
        .find((group) => group.key === "majorNeeds")
        ?.options.filter((item) => formState.majorNeeds.includes(item.value))
        .map((item) => item.label) || [],
    [formState.majorNeeds]
  );

  const _selectedConstraintLabels = useMemo(
    () =>
      filterOptions
        .find((group) => group.key === "subjectConstraints")
        ?.options.filter((item) => formState.subjectConstraints.includes(item.value))
        .map((item) => item.label) || [],
    [formState.subjectConstraints]
  );

  const activeQuickQuestions = useMemo(
    () => advisorQuickPrompts[advisorMode] || quickQuestionTemplates,
    [advisorMode]
  );

  const soulQuestions = useMemo(() => {
    if (advisorMode === "xuefeng") {
      return [
        "我最该保学校、保专业，还是保城市？你直接给判断。",
        "如果我只想留在广东，这张表要牺牲多少学校层次？",
        "你帮我挑出最可能看着稳、其实最容易出问题的几个志愿。"
      ];
    }

    return [
      "如果学校、专业、城市只能先保一个，我现在最该保哪一个？",
      "如果我更看重就业稳定，哪些志愿值得前置？",
      "如果我最怕滑档和被调剂，下一步该人工核查什么？"
    ];
  }, [advisorMode]);

  const mandatoryCheck = useMemo(() => {
    const missing = [];
    if (!formState.province) missing.push("省份");
    if (!formState.examMode) missing.push("高考模式");
    if (!formState.track) missing.push("科类");
    if (!formState.score) missing.push("高考分数");
    if (!formState.rank) missing.push("全省位次");
    if (!formState.selectedSubjects.length) missing.push("选考科目");

    return {
      ok: missing.length === 0,
      missing
    };
  }, [formState]);

  const profileHighlights = useMemo(
    () =>
      [
        formState.province,
        `${formState.examMode} · ${formState.track}类`,
        `分数 ${formState.score || "--"}`,
        `位次 ${formState.rank || "--"}`,
        formState.selectedSubjects.length
          ? `选科 ${formState.selectedSubjects.join(" / ")}`
          : "待补选科",
        selectedInterestLabels.length
          ? `兴趣 ${selectedInterestLabels.slice(0, 2).join(" / ")}`
          : "待补兴趣"
      ].filter(Boolean),
    [formState, selectedInterestLabels]
  );

  const planStats = useMemo(() => {
    if (!result?.applicationPlan?.length) {
      return [];
    }

    return result.applicationPlan.map((item) => ({
      key: item.tier,
      label: item.tierLabel,
      count: item.schools?.length || 0,
      tierClass: item.tierClass
    }));
  }, [result]);

  const tradeoffPanel = useMemo(() => {
    if (!result?.diagnosis?.riskProfile) {
      return null;
    }

    return buildTradeoffPanel(result.diagnosis.riskProfile, formState);
  }, [formState, result]);

  const currentRiskOption = useMemo(
    () => RISK_OPTIONS.find((item) => item.value === formState.risk) || RISK_OPTIONS[1],
    [formState.risk]
  );

  const advisorContextHighlights = useMemo(
    () => buildAdvisorContextHighlights({ formState, profileHighlights, planStats, result }),
    [formState, planStats, profileHighlights, result]
  );

  const guestMode = entryMode === "guest" && !authToken;
  const chatEnabled = Boolean(authToken);
  const canGeneratePlan = !guestMode || !guestPlanConsumed;
  const hasPlanningContext = Boolean(result?.applicationPlan?.length);
  const advisorRouteActive = screen === SCREEN_ADVISOR;
  const modelLabel =
    providers.find((item) => item.id === formState.aiProvider)?.label ||
    (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider);
  const decisionProfile = useMemo(
    () => ({
      province: formState.province,
      track: formState.track,
      score: formState.score,
      rank: formState.rank,
      city:
        formState.preferredCities
          ?.split(/[、,/]/)
          .map((item) => item.trim())
          .filter(Boolean)[0] || "",
      interest: selectedInterestLabels[0]
    }),
    [
      formState.preferredCities,
      formState.province,
      formState.rank,
      formState.score,
      formState.track,
      selectedInterestLabels
    ]
  );

  const hydrateSession = useEffectEvent(async (token) => {
    await Promise.all([fetchCurrentUser(token), fetchHistory(token)]);
  });

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (entryMode === "none") {
      localStorage.removeItem(ENTRY_MODE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ENTRY_MODE_STORAGE_KEY, entryMode);
  }, [entryMode]);

  useEffect(() => {
    function handlePopState() {
      setScreen(
        resolveScreenFromPath(window.location.pathname, {
          hasAuthToken: Boolean(authToken),
          hasGuestAccess: entryMode === "guest"
        })
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [authToken, entryMode]);

  useEffect(() => {
    if (selectedUniversityDetail) {
      writeStoredUniversityDetail(selectedUniversityDetail);
      return;
    }

    clearStoredUniversityDetail();
  }, [selectedUniversityDetail]);

  useEffect(() => {
    writeStoredAdvisorState({
      mode: advisorMode,
      sessionId: chatSessionId,
      messages: chatMessages
    });
  }, [advisorMode, chatMessages, chatSessionId]);

  useEffect(() => {
    writeStoredWorkspaceResult(result);
  }, [result]);

  useEffect(() => {
    if (authToken) {
      hydrateSession(authToken);
      setEntryMode("member");
      const routeScreen =
        typeof window !== "undefined"
          ? resolveScreenFromPath(window.location.pathname, {
              hasAuthToken: true,
              hasGuestAccess: false
            })
          : SCREEN_NAVIGATION;

      if (
        [
          SCREEN_NAVIGATION,
          SCREEN_WORKSPACE,
          SCREEN_ADVISOR,
          SCREEN_UNIVERSITY,
          SCREEN_HISTORY,
          SCREEN_ACCOUNT,
          SCREEN_ADMIN_USERS
        ].includes(routeScreen)
      ) {
        setScreen(routeScreen);
      } else {
        navigateToScreen(SCREEN_NAVIGATION);
      }
    } else {
      setCurrentUser(null);
      setHistoryData({ plans: [], chats: [], imports: [] });
      setUserList([]);
      setRoleOptions([]);
    }
  // navigateToScreen is intentionally stable enough for this auth-bound redirect effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    const nextExamMode = provinceExamModeMap[formState.province] || "传统模式";
    if (formState.examMode !== nextExamMode) {
      setFormState((current) => ({
        ...current,
        examMode: nextExamMode
      }));
    }
  }, [formState.province, formState.examMode]);

  useEffect(() => {
    if (screen === SCREEN_ADMIN_USERS && currentUser && !canAccessAdminWorkspace(currentUser)) {
      navigateToScreen(SCREEN_ACCOUNT);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, screen]);

  useEffect(() => {
    if (![SCREEN_WORKSPACE, SCREEN_ADVISOR].includes(screen)) {
      return;
    }

    scheduleChatInputFocus({
      isAdvisorRouteActive: advisorRouteActive,
      inlineInputRef: inlineChatInputRef,
      overlayInputRef: overlayChatInputRef
    });
  }, [advisorRouteActive, screen]);

  async function fetchMeta() {
    try {
      const [providerResponse, dataStatusResponse] = await Promise.all([
        fetch("/api/meta/providers"),
        fetch("/api/meta/data-status")
      ]);

      const providerPayload = await providerResponse.json();
      const dataStatusPayload = await dataStatusResponse.json();

      if (providerPayload.ok) {
        setProviders(providerPayload.data.providers);
      }

      if (dataStatusPayload.ok) {
        setDataStatus(dataStatusPayload.data);
      }
    } catch {
      setProviders([]);
      setDataStatus(null);
    }
  }

  async function fetchCurrentUser(token) {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "获取当前用户失败");
      }

      setCurrentUser(payload.data.user);

      if (canAccessAdminWorkspace(payload.data.user)) {
        await fetchUsers(token);
      } else {
        setUserList([]);
        setRoleOptions([]);
      }
    } catch {
      setCurrentUser(null);
      setUserList([]);
      setRoleOptions([]);
      setAuthToken("");
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      clearStoredAdvisorState();
      sessionHydratedRef.current = false;
      navigateToScreen(SCREEN_AUTH);
    }
  }

  async function fetchHistory(token) {
    try {
      const response = await fetch("/api/admin/history", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();
      if (payload.ok) {
        setHistoryData(payload.data);
        hydrateWorkspaceFromHistory(payload.data);
      }
    } catch {
      setHistoryData({ plans: [], chats: [], imports: [] });
    }
  }

  function hydrateWorkspaceFromHistory(data) {
    if (sessionHydratedRef.current) {
      return;
    }

    const latestPlan = data?.plans?.[0];
    const latestChat = data?.chats?.[0];

    if (latestPlan?.result && !result) {
      setResult(latestPlan.result);
    }

    if (latestChat?.messages?.length) {
      const normalizedMessages = latestChat.messages.map((message, index) =>
        createChatMessage(message.role, message.content, {
          id: `${latestChat.id || "history"}-${index}`,
          timestamp: message.timestamp || latestChat.createdAt
        })
      );

      setChatMessages(normalizedMessages);
    }

    if (latestChat?.sessionId) {
      setChatSessionId(latestChat.sessionId);
      localStorage.setItem(CHAT_SESSION_STORAGE_KEY, latestChat.sessionId);
    }

    if (latestChat?.messages?.length || latestPlan?.result) {
      sessionHydratedRef.current = true;
    }
  }

  async function fetchUsers(token = authToken) {
    if (!token) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "获取用户列表失败");
      }

      setUserList(payload.data.users || []);
      setRoleOptions(payload.data.roleOptions || []);
    } catch (fetchUsersError) {
      setRoleOptions([]);
      setUserManagementMessage(fetchUsersError.message);
    }
  }

  async function submitPlanGeneration() {
    setError("");

    if (!mandatoryCheck.ok) {
      setError(`请先补全必填信息：${mandatoryCheck.missing.join(" / ")}`);
      return { status: "validation" };
    }

    if (!canGeneratePlan) {
      setError("游客模式已完成一次正式志愿体验。登录后可继续无限使用。");
      return { status: "consumed" };
    }

    setLoading(true);

    try {
      const response = await fetch("/api/planner/recommend", {
        method: "POST",
        headers: buildHeaders(authToken, trialToken),
        body: JSON.stringify(formState)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "生成志愿方案失败");
      }

      sessionHydratedRef.current = true;
      startTransition(() => {
        setResult(payload.data);
      });
      setChatSessionId(createChatSessionId());
      setChatMessages([
        ...createStarterChat(advisorMode),
        createChatMessage("assistant", createPlanReadyMessage(advisorMode, chatEnabled))
      ]);

      if (authToken) {
        fetchHistory(authToken);
      } else {
        setGuestPlanConsumed(true);
      }

      return { status: "success" };
    } catch (submitError) {
      if (
        guestMode &&
        typeof submitError.message === "string" &&
        submitError.message.includes("游客模式")
      ) {
        setGuestPlanConsumed(true);
        setError(submitError.message);
        return { status: "consumed" };
      }

      setError(submitError.message);
      return { status: "error" };
    } finally {
      setLoading(false);
    }
  }

  async function _handleSubmit(event) {
    event.preventDefault();
    await submitPlanGeneration();
  }

  async function handleSendChat(prefilledQuestion = "") {
    if (!chatEnabled) {
      setChatMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          "游客模式只开放一次正式志愿表体验。连续追问、上下文记忆和历史记录需要登录后使用。"
        )
      ]);
      return;
    }

    const content = (prefilledQuestion || chatInput).trim();
    if (!content || chatLoading) {
      return;
    }

    const nextMessages = [...chatMessages, createChatMessage("user", content)];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    sessionHydratedRef.current = true;
    scheduleChatInputFocus({
      isAdvisorRouteActive: advisorRouteActive,
      inlineInputRef: inlineChatInputRef,
      overlayInputRef: overlayChatInputRef
    });

    try {
      const response = await fetch("/api/chat/advisor", {
        method: "POST",
        headers: buildHeaders(authToken, trialToken),
        body: JSON.stringify({
          provider: formState.aiProvider,
          advisorMode,
          sessionId: chatSessionId,
          planningContext: result,
          messages: nextMessages
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "聊天顾问暂时不可用");
      }

      setChatMessages((current) => [
        ...current,
        createChatMessage("assistant", payload.data.reply, {
          provider: payload.data.provider,
          model: payload.data.model
        })
      ]);

      if (authToken) {
        fetchHistory(authToken);
      }
    } catch (chatError) {
      setChatMessages((current) => [
        ...current,
        createChatMessage("assistant", `当前聊天服务暂时不可用：${chatError.message}`)
      ]);
    } finally {
      setChatLoading(false);
      scheduleChatInputFocus({
        isAdvisorRouteActive: advisorRouteActive,
        inlineInputRef: inlineChatInputRef,
        overlayInputRef: overlayChatInputRef
      });
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "登录失败");
      }

      setAuthToken(payload.data.token);
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.data.token);
      setEntryMode("member");
      navigateToScreen(SCREEN_NAVIGATION);
    } catch (loginSubmitError) {
      setLoginError(loginSubmitError.message);
    }
  }

  async function handleLogout() {
    try {
      if (authToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: buildHeaders(authToken, trialToken)
        });
      }
    } catch {
      // ignore
    } finally {
      setAuthToken("");
      setCurrentUser(null);
      setUserList([]);
      setRoleOptions([]);
      setHistoryData({ plans: [], chats: [], imports: [] });
      clearStoredAdvisorState();
      writeStoredWorkspaceResult(null);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      setEntryMode("none");
      sessionHydratedRef.current = false;
      navigateToScreen(SCREEN_AUTH);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setUserManagementMessage("");
    setUserManagementLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: buildHeaders(authToken, trialToken),
        body: JSON.stringify(newUserForm)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "创建用户失败");
      }

      setNewUserForm({
        username: "",
        password: "",
        role: ROLES.TEACHER
      });
      setUserManagementMessage(`用户已创建：${payload.data.user.username}`);
      await fetchUsers(authToken);
    } catch (createError) {
      setUserManagementMessage(createError.message);
    } finally {
      setUserManagementLoading(false);
    }
  }

  async function handleResetUserPassword(userId) {
    const password = passwordResetForm[userId]?.trim();
    if (!password) {
      setUserManagementMessage("请先输入新密码");
      return;
    }

    setUserManagementMessage("");
    setUserManagementLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        headers: buildHeaders(authToken, trialToken),
        body: JSON.stringify({ password })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "重置密码失败");
      }

      setPasswordResetForm((current) => ({
        ...current,
        [userId]: ""
      }));
      setUserManagementMessage(`密码已重置：${payload.data.user.username}`);
    } catch (resetError) {
      setUserManagementMessage(resetError.message);
    } finally {
      setUserManagementLoading(false);
    }
  }

  async function handleChangeUserRole(userId, role) {
    setUserManagementMessage("");
    setUserManagementLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: buildHeaders(authToken, trialToken),
        body: JSON.stringify({ role })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "更新角色失败");
      }

      setUserManagementMessage(`角色已更新：${payload.data.user.username}`);
      await fetchUsers(authToken);
      if (currentUser?.id === userId) {
        await fetchCurrentUser(authToken);
      }
    } catch (roleError) {
      setUserManagementMessage(roleError.message);
    } finally {
      setUserManagementLoading(false);
    }
  }

  async function handleDeleteUser(userId) {
    setUserManagementMessage("");
    setUserManagementLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: buildHeaders(authToken, trialToken)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "删除用户失败");
      }

      setUserManagementMessage("用户已删除");
      await fetchUsers(authToken);
    } catch (deleteError) {
      setUserManagementMessage(deleteError.message);
    } finally {
      setUserManagementLoading(false);
    }
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleSelection(field, value) {
    setFormState((current) => {
      const hasValue = current[field].includes(value);

      return {
        ...current,
        [field]: hasValue
          ? current[field].filter((item) => item !== value)
          : [...current[field], value]
      };
    });
  }

  function handleNewUserFormFieldChange(field, value) {
    setNewUserForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handlePasswordResetValueChange(userId, value) {
    setPasswordResetForm((current) => ({
      ...current,
      [userId]: value
    }));
  }

  function handleAdvisorModeChange(nextMode) {
    if (nextMode === advisorMode) {
      return;
    }

    setAdvisorMode(nextMode);
    setChatMessages(createStarterChat(nextMode));
    setChatSessionId(createChatSessionId());
    sessionHydratedRef.current = true;
    scheduleChatInputFocus({
      isAdvisorRouteActive: advisorRouteActive,
      inlineInputRef: inlineChatInputRef,
      overlayInputRef: overlayChatInputRef
    });
  }

  function handlePrintPlan() {
    if (!result) {
      return;
    }

    const printable = buildPrintablePlan(result);
    const popup = window.open("", "_blank", "width=1180,height=920");
    if (!popup) {
      return;
    }

    popup.document.write(printable);
    popup.document.close();
    popup.focus();
  }

  function openAdvisorPanel() {
    navigateToScreen(SCREEN_ADVISOR);
  }

  function closeAdvisorPanel() {
    navigateToScreen(SCREEN_WORKSPACE);
  }

  function openUniversityDetail(university) {
    if (!university) {
      return;
    }

    setSelectedUniversityDetail(university);
    navigateToScreen(SCREEN_UNIVERSITY);
  }

  function closeUniversityDetail() {
    navigateToScreen(SCREEN_WORKSPACE);
  }

  function openHistoryPanel() {
    navigateToScreen(SCREEN_HISTORY);
  }

  function closeHistoryPanel() {
    navigateToScreen(SCREEN_WORKSPACE);
  }

  function handleResetAdvisorSession() {
    setChatMessages(createStarterChat(advisorMode));
    setChatSessionId(createChatSessionId());
    setChatInput("");
    sessionHydratedRef.current = true;
    scheduleChatInputFocus({
      isAdvisorRouteActive: advisorRouteActive,
      inlineInputRef: inlineChatInputRef,
      overlayInputRef: overlayChatInputRef
    });
  }

  function handleSendPlanningContextToAdvisor() {
    if (!hasPlanningContext) {
      setChatMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          "还没有正式志愿表。先生成一版冲稳保方案，我再基于当前方案继续拆解。"
        )
      ]);
      return;
    }

    handleSendChat(buildPlanContextPrompt(result, formState));
  }

  function handleEnterGuest() {
    setEntryMode("guest");
    navigateToScreen(SCREEN_NAVIGATION);
  }

  function goToAuth() {
    navigateToScreen(SCREEN_AUTH);
  }

  function goToLanding() {
    navigateToScreen(SCREEN_LANDING);
  }

  function goToNavigation() {
    navigateToScreen(SCREEN_NAVIGATION);
  }

  function goToAccount() {
    navigateToScreen(SCREEN_ACCOUNT);
  }

  function goToAdminUsers() {
    if (!canAccessAdminWorkspace(currentUser)) {
      navigateToScreen(SCREEN_ACCOUNT);
      return;
    }

    navigateToScreen(SCREEN_ADMIN_USERS);
  }

  async function handleContinueToWorkspace() {
    const submission = await submitPlanGeneration();

    if (submission.status === "success" || submission.status === "consumed") {
      navigateToScreen(SCREEN_WORKSPACE);
    }
  }

  function handleRestoreHistoryPlan(plan) {
    if (!plan?.result) {
      return;
    }

    startTransition(() => {
      setResult(plan.result);
    });
    sessionHydratedRef.current = true;
    navigateToScreen(SCREEN_WORKSPACE);
  }

  function navigateToScreen(nextScreen) {
    if (currentUser && !canAccessScreen(currentUser, nextScreen)) {
      nextScreen = SCREEN_ACCOUNT;
    }

    setScreen(nextScreen);

    if (typeof window === "undefined") {
      return;
    }

    const nextPath = SCREEN_PATH_MAP[nextScreen] || "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  function renderUserMenu() {
    if (!currentUser) {
      return null;
    }

    return (
      <UserMenu
        currentUser={currentUser}
        onNavigateAccount={goToAccount}
        onNavigateAdminUsers={goToAdminUsers}
        onNavigateHistory={openHistoryPanel}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-shell app-experience-shell">
      <div className="app-experience-orb orb-a" aria-hidden="true" />
      <div className="app-experience-orb orb-b" aria-hidden="true" />

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="app-screen-stage"
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageShellTransition}
        >
          <Suspense
            fallback={
              <div
                className="app-screen-fallback"
                style={{
                  minHeight: "100vh",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(35, 61, 82, 0.72)",
                  fontFamily: 'var(--font-body, "Inter", sans-serif)',
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: "0.8rem"
                }}
              >
                Loading workspace...
              </div>
            }
          >
            {screen === SCREEN_LANDING ? (
              <LandingScreen
                dataStatus={dataStatus}
                providers={providers}
                onPrimaryAction={goToAuth}
                onGuestAction={handleEnterGuest}
              />
            ) : null}

            {screen === SCREEN_AUTH ? (
              <AuthScreen
                currentUser={currentUser}
                loginError={loginError}
                loginForm={loginForm}
                onBack={goToLanding}
                onChangeLoginForm={setLoginForm}
                onGuestAction={handleEnterGuest}
                onLogin={handleLogin}
              />
            ) : null}

            {screen === SCREEN_NAVIGATION ? (
              <NavigationScreen
                canGeneratePlan={canGeneratePlan}
                currentRiskOption={currentRiskOption}
                error={error}
                formState={formState}
                guestMode={guestMode}
                loading={loading}
                mandatoryCheck={mandatoryCheck}
                onContinue={handleContinueToWorkspace}
                topAccessory={renderUserMenu()}
                toggleSelection={toggleSelection}
                updateField={updateField}
              />
            ) : null}

            {screen === SCREEN_WORKSPACE ? (
              <DecisionWorkspaceScreen
                activeQuickQuestions={activeQuickQuestions}
                advisorConfig={advisorConfig}
                canGeneratePlan={canGeneratePlan}
                currentRiskOption={currentRiskOption}
                currentUser={currentUser}
                decisionProfile={decisionProfile}
                guestMode={guestMode}
                modelLabel={modelLabel}
                onAuthClick={goToAuth}
                onEditProfile={goToNavigation}
                onOpenAdvisor={openAdvisorPanel}
                onOpenHistory={openHistoryPanel}
                onOpenUniversityDetail={openUniversityDetail}
                onPrintPlan={handlePrintPlan}
                onRefreshPlan={handleContinueToWorkspace}
                profileHighlights={profileHighlights}
                result={result}
                selectedInterestLabels={selectedInterestLabels}
                selectedNeedLabels={selectedNeedLabels}
                selectedSchoolLabels={selectedSchoolLabels}
                topAccessory={renderUserMenu()}
                tradeoffPanel={tradeoffPanel}
              />
            ) : null}

            {screen === SCREEN_UNIVERSITY ? (
              <UniversityScreen
                university={selectedUniversityDetail}
                onBack={closeUniversityDetail}
                topAccessory={renderUserMenu()}
              />
            ) : null}

            {screen === SCREEN_ADVISOR ? (
              <AdvisorScreen
                activeQuickQuestions={activeQuickQuestions}
                advisorConfig={advisorConfig}
                advisorContextHighlights={advisorContextHighlights}
                advisorMode={advisorMode}
                chatEnabled={chatEnabled}
                chatInput={chatInput}
                chatLoading={chatLoading}
                chatMessages={chatMessages}
                dataStatus={dataStatus}
                formState={formState}
                hasPlanningContext={hasPlanningContext}
                onAuthClick={goToAuth}
                onBackToWorkspace={closeAdvisorPanel}
                onModeChange={handleAdvisorModeChange}
                onResetSession={handleResetAdvisorSession}
                onSendChat={handleSendChat}
                onSendPlanningContext={handleSendPlanningContextToAdvisor}
                overlayInputRef={overlayChatInputRef}
                providers={providers}
                setChatInput={setChatInput}
                soulQuestions={soulQuestions}
                topAccessory={renderUserMenu()}
              />
            ) : null}

            {screen === SCREEN_HISTORY ? (
              <HistoryScreen
                currentResult={result}
                currentUser={currentUser}
                guestMode={guestMode}
                historyData={historyData}
                onAuthClick={goToAuth}
                onBackToWorkspace={closeHistoryPanel}
                onRestorePlan={handleRestoreHistoryPlan}
                topAccessory={renderUserMenu()}
              />
            ) : null}

            {screen === SCREEN_ACCOUNT ? (
              <AccountScreen
                currentUser={currentUser}
                historyData={historyData}
                onBackToWorkspace={closeHistoryPanel}
                onOpenAdminUsers={goToAdminUsers}
                onOpenHistory={openHistoryPanel}
                onLogout={handleLogout}
                topAccessory={renderUserMenu()}
              />
            ) : null}

            {screen === SCREEN_ADMIN_USERS ? (
              <AdminUsersScreen
                currentUser={currentUser}
                newUserForm={newUserForm}
                onBackToWorkspace={closeHistoryPanel}
                onChangeNewUserFormField={handleNewUserFormFieldChange}
                onChangePasswordResetValue={handlePasswordResetValueChange}
                onCreateUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
                onResetUserPassword={handleResetUserPassword}
                onUpdateUserRole={handleChangeUserRole}
                passwordResetForm={passwordResetForm}
                roleOptions={roleOptions}
                topAccessory={renderUserMenu()}
                userList={userList}
                userManagementLoading={userManagementLoading}
                userManagementMessage={userManagementMessage}
              />
            ) : null}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AppRoot;
