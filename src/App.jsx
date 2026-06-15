import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  advisorModeOptions,
  advisorQuickPrompts,
  candidateTypeOptions,
  defaultFormState,
  filterOptions,
  interestOptions,
  personalityTagOptions,
  provinceExamModeMap,
  provinceOptions,
  quickQuestionTemplates,
  specialPlanOptions,
  subjectOptions,
  trackOptions
} from "./config.js";
import { buildPrintablePlan } from "./printPlan.js";

const TRIAL_STORAGE_KEY = "gaokao_trial_token";
const CHAT_SESSION_STORAGE_KEY = "gaokao_chat_session_id";
const AUTH_TOKEN_STORAGE_KEY = "gaokao_auth_token";

const SCREEN_LANDING = "landing";
const SCREEN_AUTH = "auth";
const SCREEN_WORKSPACE = "workspace";
const SCREEN_ADVISOR = "advisor";
const SCREEN_PATH_MAP = {
  [SCREEN_LANDING]: "/",
  [SCREEN_AUTH]: "/login",
  [SCREEN_WORKSPACE]: "/workspace",
  [SCREEN_ADVISOR]: "/advisor"
};

const WORKSPACE_TABS = [
  { value: "plan", label: "志愿方案", description: "看冲稳保结果与学校专业分层" },
  { value: "insights", label: "画像洞察", description: "看风险、偏好与填报提醒" },
  { value: "account", label: "账户中心", description: "看账号、历史记录与管理员功能" }
];

const RISK_OPTIONS = [
  { value: "aggressive", label: "冲刺型", description: "多给上冲空间，接受更高波动" },
  { value: "balanced", label: "均衡型", description: "兼顾学校层次与录取把握" },
  { value: "conservative", label: "保守型", description: "优先保住本科与稳妥录取" }
];

const DEFAULT_ADVISOR_MODE = "xuefeng";

const PLATFORM_HIGHLIGHTS = [
  "广东考生优先的数据和策略框架",
  "按冲稳保分层生成大学与专业建议",
  "兼顾分数、位次、城市、兴趣和职业规划",
  "聊天式 AI 顾问持续解释“为什么这么填”"
];

const WORKSPACE_FEATURES = [
  "先保证可报，再按偏好做排序，不让低分段学生被系统“放弃”",
  "保底层优先挑录取把握更高、调剂风险更低的志愿",
  "对广东新高考专业组、调剂、滑档风险做重点提醒",
  "登录用户可持续追问，聊天会记住当前志愿方案上下文"
];

function App() {
  const [screen, setScreen] = useState(() =>
    resolveInitialScreen(Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)))
  );
  const [workspaceTab, setWorkspaceTab] = useState("plan");
  const [entryMode, setEntryMode] = useState(() =>
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ? "member" : "none"
  );
  const [formState, setFormState] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [providers, setProviders] = useState([]);
  const [dataStatus, setDataStatus] = useState(null);
  const [advisorMode, setAdvisorMode] = useState(DEFAULT_ADVISOR_MODE);
  const [chatMessages, setChatMessages] = useState(() => createStarterChat(DEFAULT_ADVISOR_MODE));
  const [chatSessionId, setChatSessionId] = useState(() => ensureChatSessionId());
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "");
  const [trialToken] = useState(() => ensureTrialToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [historyData, setHistoryData] = useState({ plans: [], chats: [], imports: [] });
  const [userList, setUserList] = useState([]);
  const [userManagementMessage, setUserManagementMessage] = useState("");
  const [userManagementLoading, setUserManagementLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    role: "advisor"
  });
  const [passwordResetForm, setPasswordResetForm] = useState({});
  const [guestPlanConsumed, setGuestPlanConsumed] = useState(false);
  const inlineChatInputRef = useRef(null);
  const overlayChatInputRef = useRef(null);
  const sessionHydratedRef = useRef(false);

  const advisorConfig = useMemo(() => getAdvisorModeConfig(advisorMode), [advisorMode]);

  const selectedInterestLabels = useMemo(
    () =>
      interestOptions
        .filter((item) => formState.interests.includes(item.id))
        .map((item) => item.label),
    [formState.interests]
  );

  const selectedPersonalityLabels = useMemo(
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

  const selectedConstraintLabels = useMemo(
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
      "如果学校、专业、城市只能先保一个，我现在最该保哪个？",
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

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    function handlePopState() {
      setScreen(resolveScreenFromPath(window.location.pathname, Boolean(authToken)));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchSessionData(authToken);
      setEntryMode("member");
      const routeScreen =
        typeof window !== "undefined"
          ? resolveScreenFromPath(window.location.pathname, true)
          : SCREEN_WORKSPACE;

      if ([SCREEN_WORKSPACE, SCREEN_ADVISOR].includes(routeScreen)) {
        setScreen(routeScreen);
      } else {
        navigateToScreen(SCREEN_WORKSPACE);
      }
    } else {
      setCurrentUser(null);
      setHistoryData({ plans: [], chats: [], imports: [] });
      setUserList([]);
    }
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
    if (typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = advisorRouteActive ? "hidden" : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [advisorRouteActive]);

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

  async function fetchSessionData(token) {
    await Promise.all([fetchCurrentUser(token), fetchHistory(token)]);
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

      if (payload.data.user.role === "admin") {
        await fetchUsers(token);
      } else {
        setUserList([]);
      }
    } catch {
      setCurrentUser(null);
      setUserList([]);
      setAuthToken("");
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
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

      setUserList(payload.data.users);
    } catch (fetchUsersError) {
      setUserManagementMessage(fetchUsersError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!mandatoryCheck.ok) {
      setError(`请先补全必填信息：${mandatoryCheck.missing.join("、")}`);
      return;
    }

    if (!canGeneratePlan) {
      setError("游客模式已完成一次正式志愿体验。登录后可继续无限使用。");
      return;
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
      setWorkspaceTab("plan");
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
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
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
      navigateToScreen(SCREEN_WORKSPACE);
      setWorkspaceTab("plan");
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
      setHistoryData({ plans: [], chats: [], imports: [] });
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
        role: "advisor"
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
    navigateToScreen(SCREEN_WORKSPACE);
    setWorkspaceTab("plan");
  }

  function goToAuth() {
    navigateToScreen(SCREEN_AUTH);
  }

  function goToLanding() {
    navigateToScreen(SCREEN_LANDING);
  }

  function navigateToScreen(nextScreen) {
    setScreen(nextScreen);

    if (typeof window === "undefined") {
      return;
    }

    const nextPath = SCREEN_PATH_MAP[nextScreen] || "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  return (
    <div className="app-shell">
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

      {screen === SCREEN_WORKSPACE ? (
        <WorkspaceScreen
          activeQuickQuestions={activeQuickQuestions}
          advisorConfig={advisorConfig}
          canGeneratePlan={canGeneratePlan}
          chatEnabled={chatEnabled}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatMessages={chatMessages}
          currentRiskOption={currentRiskOption}
          currentUser={currentUser}
          dataStatus={dataStatus}
          error={error}
          formState={formState}
          goToAuth={goToAuth}
          goToLanding={goToLanding}
          guestMode={guestMode}
          handleChangeUserRole={handleChangeUserRole}
          handleCreateUser={handleCreateUser}
          handleDeleteUser={handleDeleteUser}
          handleLogout={handleLogout}
          handlePrintPlan={handlePrintPlan}
          handleResetUserPassword={handleResetUserPassword}
          handleSendChat={handleSendChat}
          handleSendPlanningContextToAdvisor={handleSendPlanningContextToAdvisor}
          handleSubmit={handleSubmit}
          hasPlanningContext={hasPlanningContext}
          historyData={historyData}
          inlineChatInputRef={inlineChatInputRef}
          loading={loading}
          mandatoryCheck={mandatoryCheck}
          newUserForm={newUserForm}
          openAdvisorPanel={openAdvisorPanel}
          passwordResetForm={passwordResetForm}
          planStats={planStats}
          profileHighlights={profileHighlights}
          providers={providers}
          result={result}
          selectedConstraintLabels={selectedConstraintLabels}
          selectedInterestLabels={selectedInterestLabels}
          selectedNeedLabels={selectedNeedLabels}
          selectedPersonalityLabels={selectedPersonalityLabels}
          selectedSchoolLabels={selectedSchoolLabels}
          setChatInput={setChatInput}
          setNewUserForm={setNewUserForm}
          setPasswordResetForm={setPasswordResetForm}
          soulQuestions={soulQuestions}
          tradeoffPanel={tradeoffPanel}
          updateField={updateField}
          toggleSelection={toggleSelection}
          userList={userList}
          userManagementLoading={userManagementLoading}
          userManagementMessage={userManagementMessage}
          workspaceTab={workspaceTab}
          setWorkspaceTab={setWorkspaceTab}
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
        />
      ) : null}
    </div>
  );
}

function WorkspaceScreen(props) {
  const {
    activeQuickQuestions,
    advisorConfig,
    canGeneratePlan,
    chatEnabled,
    chatInput,
    chatLoading,
    chatMessages,
    currentRiskOption,
    currentUser,
    error,
    formState,
    goToAuth,
    goToLanding,
    guestMode,
    handleChangeUserRole,
    handleCreateUser,
    handleDeleteUser,
    handleLogout,
    handlePrintPlan,
    handleResetUserPassword,
    handleSendChat,
    handleSendPlanningContextToAdvisor,
    handleSubmit,
    hasPlanningContext,
    historyData,
    inlineChatInputRef,
    loading,
    mandatoryCheck,
    newUserForm,
    openAdvisorPanel,
    passwordResetForm,
    planStats,
    profileHighlights,
    providers,
    result,
    selectedConstraintLabels,
    selectedInterestLabels,
    selectedNeedLabels,
    selectedPersonalityLabels,
    selectedSchoolLabels,
    setChatInput,
    setNewUserForm,
    setPasswordResetForm,
    tradeoffPanel,
    updateField,
    toggleSelection,
    userList,
    userManagementLoading,
    userManagementMessage,
    workspaceTab,
    setWorkspaceTab
  } = props;

  return (
    <div className="workspace-shell workspace-shell-main">
      <header className="workspace-topbar workspace-topbar-main">
        <div>
          <p className="eyebrow">Smart Volunteer Platform</p>
          <h1>广东高考志愿智能工作台</h1>
          <p className="workspace-subtitle">
            先完成学生画像，再生成冲稳保方案，最后把问题交给独立 AI 顾问持续追问。整个流程按真实填报场景拆开，不再挤在一个页面里。
          </p>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={goToLanding}>
            返回介绍页
          </button>
          {!chatEnabled ? (
            <button className="secondary-btn" type="button" onClick={goToAuth}>
              去登录
            </button>
          ) : null}
          {chatEnabled ? (
            <button className="ghost-btn" type="button" onClick={handleLogout}>
              退出登录
            </button>
          ) : null}
        </div>
      </header>

      <section className="workspace-banner workspace-banner-main">
        <div className="banner-block">
          <span className="banner-label">{guestMode ? "游客模式" : "正式用户"}</span>
          <p>
            {guestMode
              ? "当前为游客体验：可以完成一次正式志愿表生成，但不能持续聊天、保存历史或使用完整 AI 顾问能力。"
              : `当前账号：${currentUser?.username || "未命名用户"}。你的志愿方案、聊天记录和账号功能都会保留在本次工作台里。`}
          </p>
        </div>

        <div className="banner-chips">
          {WORKSPACE_FEATURES.map((item) => (
            <span key={item} className="soft-chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <div className="workspace-grid">
        <div className="workspace-main">
          <aside className="workspace-sidebar surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Step 1</p>
                <h2>学生画像与填报输入</h2>
              </div>
              <span className={`risk-pill risk-${formState.risk}`}>{currentRiskOption.label}</span>
            </div>

            <div className="highlights-wrap">
              {profileHighlights.map((item) => (
                <span key={item} className="profile-pill">
                  {item}
                </span>
              ))}
            </div>

            <div className={`validation-box ${mandatoryCheck.ok ? "ok" : "warn"}`}>
              {mandatoryCheck.ok
                ? "核心信息已补齐，可以开始生成正式志愿方案。"
                : `还缺少这些必填项：${mandatoryCheck.missing.join("、")}`}
            </div>

            <form className="planner-form" onSubmit={handleSubmit}>
              <section className="form-block">
                <h3>基础信息</h3>
                <div className="field-grid">
                  <label>
                    <span>省份</span>
                    <select value={formState.province} onChange={(event) => updateField("province", event.target.value)}>
                      {provinceOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>高考模式</span>
                    <input value={formState.examMode} readOnly />
                  </label>

                  <label>
                    <span>科类</span>
                    <select value={formState.track} onChange={(event) => updateField("track", event.target.value)}>
                      {trackOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>考生类型</span>
                    <select value={formState.candidateType} onChange={(event) => updateField("candidateType", event.target.value)}>
                      {candidateTypeOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>高考分数</span>
                    <input type="number" value={formState.score} onChange={(event) => updateField("score", Number(event.target.value || 0))} />
                  </label>

                  <label>
                    <span>全省位次</span>
                    <input type="number" value={formState.rank} onChange={(event) => updateField("rank", Number(event.target.value || 0))} />
                  </label>

                  <label>
                    <span>英语成绩</span>
                    <input type="number" value={formState.englishScore} onChange={(event) => updateField("englishScore", Number(event.target.value || 0))} />
                  </label>

                  <label>
                    <span>学费上限</span>
                    <input type="number" value={formState.maxTuition} onChange={(event) => updateField("maxTuition", Number(event.target.value || 0))} />
                  </label>
                </div>
              </section>

              <section className="form-block">
                <h3>选科偏好与风险风格</h3>

                <fieldset>
                  <legend>选考科目</legend>
                  <div className="chip-grid">
                    {subjectOptions.map((item) => (
                      <button key={item} type="button" className={`chip ${formState.selectedSubjects.includes(item) ? "active" : ""}`} onClick={() => toggleSelection("selectedSubjects", item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>兴趣方向</legend>
                  <div className="chip-grid">
                    {interestOptions.map((item) => (
                      <button key={item.id} type="button" className={`chip ${formState.interests.includes(item.id) ? "active" : ""}`} onClick={() => toggleSelection("interests", item.id)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>性格标签</legend>
                  <div className="chip-grid">
                    {personalityTagOptions.map((item) => (
                      <button key={item.value} type="button" className={`chip ${formState.personalityTags.includes(item.value) ? "active" : ""}`} onClick={() => toggleSelection("personalityTags", item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="risk-grid">
                  {RISK_OPTIONS.map((item) => (
                    <button key={item.value} type="button" className={`mode-card ${formState.risk === item.value ? "active" : ""}`} onClick={() => updateField("risk", item.value)}>
                      <strong>{item.label}</strong>
                      <p>{item.description}</p>
                    </button>
                  ))}
                </div>

                {filterOptions.map((group) => (
                  <fieldset key={group.key}>
                    <legend>{group.label}</legend>
                    <div className="chip-grid">
                      {group.options.map((item) => (
                        <button key={item.value} type="button" className={`chip ${formState[group.key].includes(item.value) ? "active" : ""}`} onClick={() => toggleSelection(group.key, item.value)}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <fieldset>
                  <legend>专项计划</legend>
                  <div className="chip-grid">
                    {specialPlanOptions.map((item) => (
                      <button key={item.value} type="button" className={`chip ${formState.specialPlans.includes(item.value) ? "active" : ""}`} onClick={() => toggleSelection("specialPlans", item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="form-block">
                <h3>城市、职业与补充限制</h3>
                <label>
                  <span>意向城市</span>
                  <input value={formState.preferredCities} onChange={(event) => updateField("preferredCities", event.target.value)} placeholder="例如：广州 / 深圳 / 珠海" />
                </label>

                <label>
                  <span>职业规划</span>
                  <textarea rows="4" value={formState.careerPlan} onChange={(event) => updateField("careerPlan", event.target.value)} placeholder="例如：更重视稳定就业、考公、读研、进入互联网或制造业等方向" />
                </label>

                <label>
                  <span>补充说明</span>
                  <textarea rows="4" value={formState.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="例如：家庭希望留省内、接受民办、优先保专业、不能接受冷门调剂等" />
                </label>

                <label>
                  <span>身体或报考限制</span>
                  <textarea rows="3" value={formState.healthNotes} onChange={(event) => updateField("healthNotes", event.target.value)} placeholder="例如：色弱、近视、体检受限专业、不能报军警类等" />
                </label>

                <label className="switch-row">
                  <input type="checkbox" checked={formState.willingAdjustment} onChange={(event) => updateField("willingAdjustment", event.target.checked)} />
                  <span>接受专业调剂</span>
                </label>
              </section>

              <div className="action-stack">
                <button className="primary-btn" type="submit" disabled={loading || !canGeneratePlan}>
                  {loading ? "正在生成方案..." : guestMode ? "生成一次体验方案" : "生成正式志愿方案"}
                </button>
                {result ? (
                  <button className="secondary-btn" type="button" onClick={handlePrintPlan}>打印志愿表</button>
                ) : null}
                {error ? <p className="error-text">{error}</p> : null}
              </div>
            </form>
          </aside>

          <aside className="workspace-sidepanel surface-card">
            <div className="section-head compact">
              <div>
                <p className="section-kicker">Step 2</p>
                <h2>方案结果与账户模块</h2>
              </div>
            </div>

            <div className="tabs-row">
              {WORKSPACE_TABS.map((item) => (
                <button key={item.value} type="button" className={`tab-btn ${workspaceTab === item.value ? "active" : ""}`} onClick={() => setWorkspaceTab(item.value)}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            {workspaceTab === "plan" ? <PlanPanel result={result} planStats={planStats} tradeoffPanel={tradeoffPanel} /> : null}
            {workspaceTab === "insights" ? <InsightsPanel result={result} tradeoffPanel={tradeoffPanel} /> : null}
            {workspaceTab === "account" ? (
              <AccountPanel
                authToken={chatEnabled}
                currentUser={currentUser}
                handleChangeUserRole={handleChangeUserRole}
                handleCreateUser={handleCreateUser}
                handleDeleteUser={handleDeleteUser}
                handleResetUserPassword={handleResetUserPassword}
                historyData={historyData}
                newUserForm={newUserForm}
                passwordResetForm={passwordResetForm}
                selectedConstraintLabels={selectedConstraintLabels}
                selectedInterestLabels={selectedInterestLabels}
                selectedNeedLabels={selectedNeedLabels}
                selectedPersonalityLabels={selectedPersonalityLabels}
                selectedSchoolLabels={selectedSchoolLabels}
                setNewUserForm={setNewUserForm}
                setPasswordResetForm={setPasswordResetForm}
                userList={userList}
                userManagementLoading={userManagementLoading}
                userManagementMessage={userManagementMessage}
              />
            ) : null}
          </aside>

          <section className="workspace-chat surface-card advisor-inline-panel workspace-agent-preview">
            <div className="section-head compact">
              <div>
                <p className="section-kicker">Step 3</p>
                <h2>聊天式 AI 志愿顾问</h2>
              </div>
              <button className="secondary-btn" type="button" onClick={openAdvisorPanel}>进入独立顾问页</button>
            </div>

            <p className="workspace-subtitle">
              这里保留一个轻量预览入口，适合快速追问。需要完整对话、上下文记忆和更大的聊天区时，直接进入独立 AI 顾问页。
            </p>

            <div className="chat-meta">
              <span className="soft-chip">{advisorConfig.shortLabel}</span>
              <span className="soft-chip">{chatEnabled ? "连续会话已开启" : "登录后开启连续会话"}</span>
              <span className="soft-chip">
                {providers.find((item) => item.id === formState.aiProvider)?.label || (formState.aiProvider === "auto" ? "自动选择模型" : formState.aiProvider)}
              </span>
            </div>

            <div className="chip-grid">
              {activeQuickQuestions.slice(0, 4).map((item) => (
                <button key={item} type="button" className="chip prompt-chip" onClick={() => handleSendChat(item)} disabled={chatLoading || !chatEnabled}>
                  {item}
                </button>
              ))}
            </div>

            <div className="advisor-inline-tools">
              <button className="ghost-btn" type="button" onClick={handleSendPlanningContextToAdvisor} disabled={chatLoading || !chatEnabled || !hasPlanningContext}>
                把当前方案发给顾问
              </button>
            </div>

            <ChatTranscript advisorBadge={advisorConfig.badge} chatLoading={chatLoading} className="advisor-inline-chat-box" messages={chatMessages} typingLabel="顾问正在结合当前方案继续分析..." />

            <div className="chat-input-panel advisor-inline-input-panel">
              <div className="input-tip">
                {chatEnabled ? "继续追问时，顾问会自动带上最近方案和聊天上下文。" : "游客模式不开放连续聊天，登录后即可继续追问。"}
              </div>

              <textarea
                ref={inlineChatInputRef}
                rows="4"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={chatEnabled ? "例如：把保底里最稳的 3 所单独挑出来，并告诉我为什么稳" : "登录后可在这里连续追问 AI 顾问"}
                disabled={!chatEnabled}
              />

              <div className="chat-action-row">
                <button className="primary-btn" type="button" onClick={() => handleSendChat()} disabled={chatLoading || !chatEnabled}>
                  {chatLoading ? "顾问思考中..." : "发送追问"}
                </button>
                {!chatEnabled ? <button className="secondary-btn" type="button" onClick={goToAuth}>登录后解锁</button> : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      <button className="advisor-fab" type="button" onClick={openAdvisorPanel}>
        <span className="advisor-fab-badge">{chatEnabled ? "AI 顾问在线" : "登录后可用"}</span>
        <strong>打开独立 AI 顾问</strong>
        <span>{chatEnabled ? "进入完整顾问工作区继续追问" : "登录后进入完整顾问工作区"}</span>
      </button>
    </div>
  );
}


function AdvisorScreen({
  activeQuickQuestions,
  advisorConfig,
  advisorContextHighlights,
  advisorMode,
  chatEnabled,
  chatInput,
  chatLoading,
  chatMessages,
  dataStatus,
  formState,
  hasPlanningContext,
  onAuthClick,
  onBackToWorkspace,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  providers,
  setChatInput,
  soulQuestions
}) {
  return (
    <div className="advisor-page-shell">
      <div className="advisor-shell advisor-shell-page">
        <AdvisorWorkbenchV2
          activeQuickQuestions={activeQuickQuestions}
          advisorConfig={advisorConfig}
          advisorMode={advisorMode}
          chatEnabled={chatEnabled}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatMessages={chatMessages}
          contextHighlights={advisorContextHighlights}
          dataStatus={dataStatus}
          formState={formState}
          hasPlanningContext={hasPlanningContext}
          onAuthClick={onAuthClick}
          onClose={onBackToWorkspace}
          onModeChange={onModeChange}
          onResetSession={onResetSession}
          onSendChat={onSendChat}
          onSendPlanningContext={onSendPlanningContext}
          overlayInputRef={overlayInputRef}
          providers={providers}
          setChatInput={setChatInput}
          soulQuestions={soulQuestions}
        />
      </div>
    </div>
  );
}

function PlanPanel({ result, planStats, tradeoffPanel }) {
  if (!result) {
    return (
      <article className="info-card">
        <h4>等待生成正式方案</h4>
        <p>完成左侧画像后生成志愿表，这里会展示冲稳保分层、核心摘要和可打印版本。</p>
      </article>
    );
  }

  return (
    <div className="tab-panel">
      <div className="summary-grid">
        <article className="mini-card">
          <span className="mini-label">方案总览</span>
          <strong>{result.summary?.overview || "待生成"}</strong>
        </article>
        <article className="mini-card">
          <span className="mini-label">参考年份</span>
          <strong>{result.meta?.latestUniversityYear || "--"} / {result.meta?.latestProvinceYear || "--"}</strong>
        </article>
        <article className="mini-card">
          <span className="mini-label">分析模式</span>
          <strong>{result.meta?.analysisMode === "llm" ? "大模型增强" : "规则与数据混合"}</strong>
        </article>
      </div>

      <div className="stat-row">
        {planStats.map((item) => (
          <article key={item.key} className={`stat-card ${item.tierClass}`}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </article>
        ))}
      </div>

      <section className="result-block">
        <h3>方案摘要</h3>
        <div className="narrative-stack">
          <article className="info-card">
            <h4>总体判断</h4>
            <p>{result.summary?.overview}</p>
          </article>
          <article className="info-card">
            <h4>填报策略</h4>
            <p>{result.summary?.strategy}</p>
          </article>
          <article className="info-card">
            <h4>职业建议</h4>
            <p>{result.summary?.careerAdvice}</p>
          </article>
        </div>
      </section>

      <section className="result-block">
        <h3>冲稳保分层</h3>
        <div className="plan-tier-stack">
          {result.applicationPlan?.map((tier) => (
            <article key={tier.tier} className={`tier-card ${tier.tierClass}`}>
              <div className="tier-card-head">
                <span className={`tier-badge ${tier.tierClass}`}>{tier.tierLabel}</span>
                <p>{tier.explanation}</p>
              </div>

              <div className="school-stack">
                {tier.schools?.map((school) => (
                  <article key={`${tier.tier}-${school.university}-${school.major}`} className="school-card">
                    <div className="school-card-head">
                      <div>
                        <h4>{school.university}</h4>
                        <p>{school.major}</p>
                      </div>
                      <div className="school-badges">
                        <span className={`confidence-badge ${tier.tierClass}`}>{school.confidence || "待评估"}</span>
                        <span className="summary-tag">{school.batch || "待补批次"}</span>
                      </div>
                    </div>

                    <div className="school-meta-grid">
                      <span>最低分 {school.minScore || "--"}</span>
                      <span>最低位次 {school.minRank || "--"}</span>
                      <span>城市 {school.city || "未知"}</span>
                      <span>学费 {school.tuition || "待补"}</span>
                    </div>

                    {school.subjectRequirement ? <div className="subject-line">选科要求：{school.subjectRequirement}</div> : null}
                    {school.reason ? <p className="school-reason">{school.reason}</p> : null}
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {tradeoffPanel ? (
        <section className="result-block">
          <h3>取舍建议</h3>
          <article className="info-card">
            <h4>{tradeoffPanel.title}</h4>
            <p>{tradeoffPanel.description}</p>
            <ul className="simple-list">
              {tradeoffPanel.nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}

function InsightsPanel({ result, tradeoffPanel }) {
  if (!result) {
    return (
      <article className="info-card">
        <h4>等待画像洞察</h4>
        <p>生成方案后，这里会把风险、方向、专项提示和人工复核清单拆开给你看。</p>
      </article>
    );
  }

  return (
    <div className="tab-panel">
      <section className="result-block">
        <h3>方向洞察</h3>
        <div className="insight-grid">
          <article className="info-card">
            <h4>优先方向</h4>
            <ul className="simple-list">
              {result.diagnosis?.topDirections?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <h4>覆盖情况</h4>
            <ul className="simple-list">
              <li>方案覆盖率：{result.diagnosis?.coverageRate || "--"}%</li>
              <li>{result.diagnosis?.scoreRankReference}</li>
              <li>{result.diagnosis?.fallbackNotice}</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="result-block">
        <h3>风险结构</h3>
        <div className="narrative-stack">
          <article className="info-card">
            <h4>冲稳保分布</h4>
            <ul className="simple-list">
              <li>冲刺院校：{result.diagnosis?.riskProfile?.rushCount || 0}</li>
              <li>稳妥院校：{result.diagnosis?.riskProfile?.steadyCount || 0}</li>
              <li>保底院校：{result.diagnosis?.riskProfile?.safeCount || 0}</li>
              <li>高把握保底：{result.diagnosis?.riskProfile?.safeHighConfidenceCount || 0}</li>
              <li>接近兜底保底：{result.diagnosis?.riskProfile?.safeNearlyCertainCount || 0}</li>
            </ul>
          </article>

          <article className="info-card">
            <h4>调整建议</h4>
            <p>{result.diagnosis?.adjustmentAdvice}</p>
          </article>

          {tradeoffPanel ? (
            <article className="info-card">
              <h4>{tradeoffPanel.title}</h4>
              <p>{tradeoffPanel.description}</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="result-block">
        <h3>重点提醒</h3>
        <div className="warning-grid">
          {result.riskAlerts?.map((item) => (
            <article key={item} className="warning-card">{item}</article>
          ))}
        </div>
        <div className="insight-grid">
          <article className="info-card">
            <h4>专项计划提示</h4>
            <ul className="simple-list">
              {result.diagnosis?.specialPlanHints?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <h4>人工复核清单</h4>
            <ul className="simple-list">
              {result.diagnosis?.checklist?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

function AccountPanel({
  authToken,
  currentUser,
  handleChangeUserRole,
  handleCreateUser,
  handleDeleteUser,
  handleResetUserPassword,
  historyData,
  newUserForm,
  passwordResetForm,
  selectedConstraintLabels,
  selectedInterestLabels,
  selectedNeedLabels,
  selectedPersonalityLabels,
  selectedSchoolLabels,
  setNewUserForm,
  setPasswordResetForm,
  userList,
  userManagementLoading,
  userManagementMessage
}) {
  return (
    <div className="tab-panel">
      <section className="result-block">
        <h3>账号状态</h3>
        <div className="insight-grid">
          <article className="info-card">
            <h4>{authToken ? "当前会话" : "游客限制"}</h4>
            {authToken ? (
              <ul className="simple-list">
                <li>账号：{currentUser?.username || "--"}</li>
                <li>角色：{formatUserRole(currentUser?.role)}</li>
                <li>创建时间：{formatDateTime(currentUser?.createdAt)}</li>
                <li>最近登录：{formatDateTime(currentUser?.lastLoginAt)}</li>
              </ul>
            ) : (
              <ul className="simple-list">
                <li>当前还未登录正式账号</li>
                <li>游客仅可体验一次正式志愿表生成</li>
                <li>连续对话、历史记录和账号管理均需登录</li>
              </ul>
            )}
          </article>

          <article className="info-card">
            <h4>当前画像摘要</h4>
            <ul className="simple-list">
              <li>兴趣：{selectedInterestLabels.join("、") || "待补"}</li>
              <li>性格：{selectedPersonalityLabels.join("、") || "待补"}</li>
              <li>院校偏好：{selectedSchoolLabels.join("、") || "待补"}</li>
              <li>专业诉求：{selectedNeedLabels.join("、") || "待补"}</li>
              <li>选科限制：{selectedConstraintLabels.join("、") || "待补"}</li>
            </ul>
          </article>
        </div>
      </section>

      {authToken ? (
        <section className="result-block">
          <h3>最近历史</h3>
          <div className="history-grid">
            {historyData.plans.slice(0, 4).map((item) => (
              <article key={item.id} className="info-card">
                <h4>{item.province}</h4>
                <p>分数 {item.score} / 位次 {item.rank}</p>
                <p className="muted">{formatDateTime(item.createdAt)}</p>
              </article>
            ))}
            {!historyData.plans.length ? (
              <article className="info-card">
                <h4>还没有历史方案</h4>
                <p>生成过正式志愿表后，这里会保留最近记录。</p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {currentUser?.role === "admin" ? (
        <section className="result-block">
          <h3>用户管理</h3>
          <form className="planner-form compact" onSubmit={handleCreateUser}>
            <div className="field-grid">
              <label>
                <span>新账号</span>
                <input value={newUserForm.username} onChange={(event) => setNewUserForm((current) => ({ ...current, username: event.target.value }))} />
              </label>

              <label>
                <span>初始密码</span>
                <input type="password" value={newUserForm.password} onChange={(event) => setNewUserForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
            </div>

            <label>
              <span>账号角色</span>
              <select value={newUserForm.role} onChange={(event) => setNewUserForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="advisor">顾问</option>
                <option value="admin">管理员</option>
              </select>
            </label>

            <button className="secondary-btn" type="submit" disabled={userManagementLoading}>
              {userManagementLoading ? "处理中..." : "创建用户"}
            </button>
            {userManagementMessage ? <p className="muted">{userManagementMessage}</p> : null}
          </form>

          <div className="user-card-stack">
            {userList.map((user) => (
              <article key={user.id} className="user-card">
                <div className="user-card-head">
                  <div>
                    <h4>{user.username}</h4>
                    <p className="muted">{formatUserRole(user.role)} · 创建于 {formatDateTime(user.createdAt)}</p>
                  </div>
                  {user.isBootstrapAdmin ? <span className="summary-tag">默认管理员</span> : null}
                </div>

                <div className="field-grid">
                  <label>
                    <span>角色</span>
                    <select value={user.role} onChange={(event) => handleChangeUserRole(user.id, event.target.value)} disabled={userManagementLoading}>
                      <option value="advisor">顾问</option>
                      <option value="admin">管理员</option>
                    </select>
                  </label>

                  <label>
                    <span>重置密码</span>
                    <input
                      type="password"
                      value={passwordResetForm[user.id] || ""}
                      onChange={(event) => setPasswordResetForm((current) => ({ ...current, [user.id]: event.target.value }))}
                      placeholder="输入新密码"
                    />
                  </label>
                </div>

                <div className="chat-action-row">
                  <button className="secondary-btn" type="button" onClick={() => handleResetUserPassword(user.id)} disabled={userManagementLoading}>重置密码</button>
                  <button className="danger-btn" type="button" onClick={() => handleDeleteUser(user.id)} disabled={userManagementLoading || user.id === currentUser.id}>删除账号</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LandingScreen({ dataStatus, providers, onPrimaryAction, onGuestAction }) {
  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy surface-card hero-card">
          <p className="eyebrow">Guangdong-First Intelligent Planner</p>
          <h1>高考志愿，不该靠运气和信息差。</h1>
          <p className="hero-text">
            这是一个面向广东考生设计的志愿填报智能平台。它不只给学校名单，更会把分数、位次、
            专业组、城市、职业规划和调剂风险一起算进去，让志愿表更像真正能交付的商业化产品。
          </p>

          <div className="hero-chip-row">
            {PLATFORM_HIGHLIGHTS.map((item) => (
              <span key={item} className="soft-chip">
                {item}
              </span>
            ))}
          </div>

          <div className="hero-action-row">
            <button className="primary-btn" type="button" onClick={onPrimaryAction}>
              进入登录页
            </button>
            <button className="secondary-btn" type="button" onClick={onGuestAction}>
              游客体验一次方案
            </button>
          </div>
        </div>

        <div className="landing-side">
          <article className="feature-panel surface-card">
            <h2>平台结构</h2>
            <ol className="step-list">
              <li>第一页：平台介绍，先讲清楚能解决什么问题。</li>
              <li>第二页：登录入口，区分正式用户和游客体验。</li>
              <li>第三页：工作台，专心做画像、志愿表和 AI 顾问。</li>
            </ol>
          </article>

          <article className="feature-panel surface-card">
            <h2>当前数据状态</h2>
            <div className="summary-grid">
              <div className="mini-card">
                <span className="mini-label">真实结构数据</span>
                <strong>{dataStatus?.imported ? "已接入" : "未导入"}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">院校专业记录</span>
                <strong>{dataStatus?.universityMajorLineCount || 0}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">一分一段记录</span>
                <strong>{dataStatus?.provinceScoreRankCount || 0}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">可用年份</span>
                <strong>{dataStatus?.availableYears?.join(" / ") || "--"}</strong>
              </div>
            </div>
          </article>

          <article className="feature-panel surface-card">
            <h2>模型能力</h2>
            <div className="provider-stack">
              {providers.map((provider) => (
                <div key={provider.id} className={`provider-row ${provider.enabled ? "enabled" : "disabled"}`}>
                  <div>
                    <strong>{provider.label}</strong>
                    <p>{provider.model}</p>
                  </div>
                  <span>{provider.enabled ? "已配置" : "未配置"}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="landing-sections">
        <article className="surface-card feature-large-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Why This Product</p>
              <h2>它不是只会“列学校”的工具</h2>
            </div>
          </div>
          <div className="feature-grid">
            <div className="info-card">
              <h3>先做画像</h3>
              <p>省份、兴趣、分数、位次、职业规划、城市取向和现实限制一起进入决策。</p>
            </div>
            <div className="info-card">
              <h3>再做冲稳保</h3>
              <p>冲要真冲，稳要能稳，保要接近兜底，不再出现“保底还在冒险”的方案。</p>
            </div>
            <div className="info-card">
              <h3>最后可持续追问</h3>
              <p>聊天式顾问会结合当前志愿表继续解释和重排，而不是每次都从头开始。</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function AuthScreen({
  currentUser,
  loginError,
  loginForm,
  onBack,
  onChangeLoginForm,
  onGuestAction,
  onLogin
}) {
  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-copy surface-card">
          <p className="eyebrow">Member Access</p>
          <h1>登录后进入正式工作台</h1>
          <p className="hero-text">
            正式用户可以无限生成志愿表，开启连续问答、聊天记忆、历史记录，以及管理员的多用户账号管理能力。
          </p>

          <div className="info-stack">
            <article className="info-card">
              <h3>正式用户能做什么</h3>
              <ul className="simple-list">
                <li>连续追问 AI 顾问，保持上下文记忆</li>
                <li>查看自己的历史志愿表和聊天记录</li>
                <li>管理员可统一创建和管理顾问账号</li>
              </ul>
            </article>

            <article className="info-card">
              <h3>游客体验边界</h3>
              <ul className="simple-list">
                <li>可进入工作台并完成一次正式志愿表体验</li>
                <li>不开放连续聊天、历史记录与后台管理</li>
                <li>适合先看系统生成能力，再决定是否正式使用</li>
              </ul>
            </article>
          </div>

          {currentUser ? (
            <div className="validation-box ok">检测到已有登录会话，直接进入工作台即可继续使用。</div>
          ) : null}
        </section>

        <section className="auth-card surface-card">
          <div className="section-head compact">
            <div>
              <p className="section-kicker">Sign In</p>
              <h2>输入用户账号与密码</h2>
            </div>
          </div>

          <form className="planner-form" onSubmit={onLogin}>
            <label>
              <span>用户账号</span>
              <input
                value={loginForm.username}
                onChange={(event) =>
                  onChangeLoginForm((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
              />
            </label>

            <label>
              <span>用户密码</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  onChangeLoginForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />
            </label>

            <button className="primary-btn" type="submit">
              登录并进入工作台
            </button>
            {loginError ? <p className="error-text">{loginError}</p> : null}
          </form>

          <div className="auth-actions">
            <button className="secondary-btn" type="button" onClick={onGuestAction}>
              先用游客模式体验
            </button>
            <button className="ghost-btn" type="button" onClick={onBack}>
              返回平台介绍
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdvisorWorkbenchV2({
  activeQuickQuestions,
  advisorConfig,
  advisorMode,
  chatEnabled,
  chatInput,
  chatLoading,
  chatMessages,
  contextHighlights,
  dataStatus,
  formState,
  hasPlanningContext,
  onAuthClick,
  onClose,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  providers,
  setChatInput,
  soulQuestions
}) {
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages]);

  return (
    <section className="workspace-chat surface-card advisor-dialog advisor-dialog-v2">
      <div className="advisor-dialog-topbar advisor-dialog-topbar-hero">
        <div>
          <p className="section-kicker">AI Agent Workspace</p>
          <h2>聊天式 AI 志愿顾问</h2>
          <p className="workspace-subtitle">
            这里是独立顾问工作区。左侧负责判断框架和追问入口，右侧专门用来持续聊透学校、专业、城市、就业和风险。
          </p>
          <div className="advisor-workbench-strip">
            <span className="soft-chip">判断先行</span>
            <span className="soft-chip">连续追问</span>
            <span className="soft-chip">广东优先</span>
          </div>
        </div>

        <div className="advisor-dialog-actions">
          <span className="summary-tag">{advisorConfig.shortLabel}</span>
          <button className="secondary-btn" type="button" onClick={onResetSession}>
            新会话
          </button>
          <button className="ghost-btn" type="button" onClick={onClose}>
            返回工作台
          </button>
        </div>
      </div>

      <div className="advisor-stage">
        <aside className="advisor-rail">
          <div className="advisor-presence advisor-presence-locked">
            <div className="presence-copy">
              <span className="presence-badge">{advisorConfig.badge}</span>
              <h3>{advisorMode === "xuefeng" ? "先给判断，再讲道理" : "先帮你理顺，再陪你细化"}</h3>
              <p>{advisorConfig.opening}</p>
            </div>

            <div className="advisor-presence-points">
              <span>看当前志愿表，不空谈</span>
              <span>先判断，再解释利弊</span>
              <span>最后给你下一步动作</span>
            </div>

            <div className="mode-switcher">
              {advisorModeOptions.map((item) => {
                const active = advisorMode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`mode-card ${active ? "active" : ""}`}
                    onClick={() => onModeChange(item.value)}
                  >
                    <strong>{item.label}</strong>
                    <p>{item.tone}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="prompt-section">
            <div className="prompt-card">
              <strong>现在最适合先问</strong>
              <div className="chip-grid">
                {activeQuickQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip prompt-chip"
                    onClick={() => onSendChat(item)}
                    disabled={chatLoading || !chatEnabled}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="prompt-card">
              <strong>顾问会继续追问这些关键点</strong>
              <div className="chip-grid">
                {soulQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip soul-chip"
                    onClick={() => onSendChat(item)}
                    disabled={chatLoading || !chatEnabled}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chat-meta advisor-meta-stack">
            <span className="soft-chip">
              模型：
              {providers.find((item) => item.id === formState.aiProvider)?.label ||
                (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider)}
            </span>
            <span className="soft-chip">
              数据：
              {dataStatus?.imported ? "已导入真实结构数据" : "内置演示数据 + 规则模型"}
            </span>
            <span className="soft-chip">
              记忆：
              {chatEnabled ? "连续问答已开启" : "游客模式未开放"}
            </span>
          </div>

          <article className="advisor-guidance-card">
            <strong>建议你这样用</strong>
            <p>先把当前方案发给顾问，再围绕“学校和专业谁优先”“只留广东要牺牲什么”“哪些专业组最危险”这三类问题往下追问，效率最高。</p>
          </article>

          <article className="advisor-guidance-card advisor-guidance-card-strong">
            <strong>高质量追问模板</strong>
            <p>直接问“把保底里最稳的 3 个挑出来”“只留广东后把整张表重排”“告诉我哪几个专业组最容易坑我”，顾问会更快进入实战状态。</p>
          </article>

          <div className="advisor-context-panel">
            <div className="section-head compact">
              <div>
                <p className="section-kicker">Planner Memory</p>
                <h3>当前志愿上下文</h3>
              </div>
              <button
                className="ghost-btn compact"
                type="button"
                onClick={onSendPlanningContext}
                disabled={chatLoading || !chatEnabled || !hasPlanningContext}
              >
                一键发给顾问
              </button>
            </div>

            <div className="advisor-context-grid">
              {contextHighlights.map((item) => (
                <article key={item.label} className="advisor-context-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <div className="advisor-conversation">
          <div className="advisor-conversation-head">
            <div>
              <p className="section-kicker">Live Conversation</p>
              <h3>主对话区</h3>
              <p className="workspace-subtitle">这里负责连续追问、解释理由、重排方案。尽量把问题说具体，顾问会更像真人老师一样接着往下聊。</p>
            </div>
            <div className="conversation-tools">
              <span className="summary-tag">{chatEnabled ? "可连续追问" : "登录后解锁完整对话"}</span>
              <button className="ghost-btn compact" type="button" onClick={onResetSession}>
                清空会话
              </button>
            </div>
          </div>

          <div className="advisor-conversation-status">
            <span className="presence-badge">{advisorConfig.badge}</span>
            <p>{chatEnabled ? "顾问会结合当前志愿表、最近聊天记录和你的这次追问，继续往下拆学校、专业、城市与风险。" : "登录后可开启完整上下文记忆、连续追问和历史记录恢复。"}</p>
          </div>

          <ChatTranscript
            advisorBadge={advisorConfig.badge}
            chatLoading={chatLoading}
            className="advisor-chat-box-v2"
            messages={chatMessages}
            scrollRef={chatScrollRef}
            typingLabel="顾问正在沿着这轮上下文继续拆解..."
          />

          <div className="chat-input-panel advisor-input-panel advisor-input-panel-v2">
            <div className="input-tip">
              {chatEnabled
                ? "继续追问时，顾问会沿用当前志愿方案和最近上下文，不会重新从头回答。"
                : "游客模式不开放连续聊天，登录后可解锁 AI 连续追问、历史记录和上下文记忆。"}
            </div>

            <textarea
              ref={overlayInputRef}
              rows="5"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={
                chatEnabled
                  ? "例如：把保底院校里最稳的 3 个单独挑出来，告诉我为什么稳，再顺便说说有没有调剂风险。"
                  : "登录后可在这里继续追问志愿顺序、专业选择、城市取舍与风险控制。"
              }
              disabled={!chatEnabled}
            />

            <div className="chat-action-row">
              <button
                className="primary-btn"
                type="button"
                onClick={() => onSendChat()}
                disabled={chatLoading || !chatEnabled}
              >
                {chatLoading ? "顾问思考中..." : "发送追问"}
              </button>
              {!chatEnabled ? (
                <button className="secondary-btn" type="button" onClick={onAuthClick}>
                  登录解锁顾问
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatTranscript({
  advisorBadge,
  chatLoading,
  className = "",
  messages,
  scrollRef = null,
  typingLabel
}) {
  return (
    <div className={`chat-box advisor-chat-box ${className}`.trim()} ref={scrollRef}>
      {messages.map((message, index) => (
        <div
          key={message.id || `${message.role}-${index}`}
          className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}
        >
          <div className="chat-message-head">
            <strong>{message.role === "user" ? "你" : advisorBadge}</strong>
            <span>{formatChatTimestamp(message.timestamp)}</span>
          </div>
          <p>{message.content}</p>
        </div>
      ))}

      {chatLoading ? (
        <div className="chat-message assistant typing">
          <div className="chat-message-head">
            <strong>{advisorBadge}</strong>
            <span>思考中</span>
          </div>
          <div className="chat-typing" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>{typingLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyResultState() {
  return (
    <div className="empty-state">
      <h3>先在左侧生成一份正式志愿方案</h3>
      <p>生成后这里会出现冲稳保分层、院校与专业建议、风险提示和可打印版本。</p>
    </div>
  );
}

export default App;

function getAdvisorModeConfig(mode) {
  return (
    advisorModeOptions.find((item) => item.value === mode) ||
    advisorModeOptions.find((item) => item.value === DEFAULT_ADVISOR_MODE) ||
    advisorModeOptions[0]
  );
}

function createChatMessage(role, content, extra = {}) {
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

function createStarterChat(mode = DEFAULT_ADVISOR_MODE) {
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

function createPlanReadyMessage(mode = DEFAULT_ADVISOR_MODE, chatEnabled = true) {
  if (!chatEnabled) {
    return "正式志愿方案已经生成。游客模式到这里可以完整体验一次填报能力；如果你想继续连续追问、记住上下文并重排方案，登录后就能继续往下聊。";
  }

  if (mode === "xuefeng") {
    return "方案已经出来了。接下来别急着高兴，先把最关键的几件事聊透：为什么这么排、哪些专业组是看着稳其实最坑、如果只留广东要不要降层次、哪些位置最容易因为调剂和组内冷热差被坑。";
  }

  return "正式方案已经生成。接下来我们可以继续把原因讲透，比如为什么这样排序、哪些专业组风险更高、如果只想留在广东该怎么调，以及怎样把滑档和调剂风险继续压下去。";
}

function buildHeaders(token, trialToken) {
  const headers = {
    "Content-Type": "application/json",
    "X-Trial-Token": trialToken
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function resolveInitialScreen(hasAuthToken) {
  if (typeof window === "undefined") {
    return hasAuthToken ? SCREEN_WORKSPACE : SCREEN_LANDING;
  }

  return resolveScreenFromPath(window.location.pathname, hasAuthToken);
}

function resolveScreenFromPath(pathname, hasAuthToken) {
  if (pathname === SCREEN_PATH_MAP[SCREEN_AUTH]) {
    return SCREEN_AUTH;
  }

  if (pathname === SCREEN_PATH_MAP[SCREEN_ADVISOR]) {
    return hasAuthToken ? SCREEN_ADVISOR : SCREEN_LANDING;
  }

  if (pathname === SCREEN_PATH_MAP[SCREEN_WORKSPACE]) {
    return hasAuthToken ? SCREEN_WORKSPACE : SCREEN_LANDING;
  }

  return SCREEN_LANDING;
}

function ensureTrialToken() {
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

function ensureChatSessionId() {
  const existing = localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextSessionId = createChatSessionId();
  localStorage.setItem(CHAT_SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

function createChatSessionId() {
  const nextSessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(CHAT_SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

function scheduleChatInputFocus({ isAdvisorRouteActive, inlineInputRef, overlayInputRef }) {
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

function buildAdvisorContextHighlights({ formState, profileHighlights, planStats, result }) {
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

function buildPlanContextPrompt(result, formState) {
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

function buildTradeoffPanel(riskProfile, formState) {
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

function formatUserRole(role) {
  if (role === "admin") {
    return "管理员";
  }

  if (role === "advisor") {
    return "普通顾问";
  }

  return "未识别";
}

function formatDateTime(value) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatChatTimestamp(value) {
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
