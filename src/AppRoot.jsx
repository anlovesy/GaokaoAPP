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
import { universityProfiles } from "./universityProfiles.js";
import {
  AUTH_TOKEN_STORAGE_KEY,
  CHAT_SESSION_STORAGE_KEY,
  DEFAULT_ADVISOR_MODE,
  RISK_OPTIONS,
  SCREEN_ADVISOR,
  SCREEN_AUTH,
  SCREEN_LANDING,
  SCREEN_PATH_MAP,
  SCREEN_UNIVERSITY,
  SCREEN_WORKSPACE
} from "./app/constants.js";
import {
  buildAdvisorContextHighlights,
  buildAuthWallRows,
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
import { pageShellTransition } from "./motion/presets.js";
const AUTH_WALL_ROWS = buildAuthWallRows(universityProfiles);
const LandingScreen = lazy(() =>
  import("./pages/landing/LandingScreen.jsx").then((module) => ({
    default: module.LandingScreen
  }))
);
const AuthScreen = lazy(() =>
  import("./pages/auth/AuthScreen.jsx").then((module) => ({
    default: module.AuthScreen
  }))
);
const WorkspaceScreen = lazy(() =>
  import("./pages/workspace/WorkspaceScreen.jsx").then((module) => ({
    default: module.WorkspaceScreen
  }))
);
const UniversityScreen = lazy(() =>
  import("./pages/university/UniversityScreen.jsx").then((module) => ({
    default: module.UniversityScreen
  }))
);
const AdvisorScreen = lazy(() =>
  import("./pages/advisor/AdvisorScreen.jsx").then((module) => ({
    default: module.AdvisorScreen
  }))
);

function ScreenFallback() {
  return (
    <div className="app-shell">
      <div className="surface-card premium-glass" style={{ margin: "24px", padding: "24px" }}>
        <p>Loading workspace...</p>
      </div>
    </div>
  );
}

function AppRoot() {
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
  const [selectedUniversityDetail, setSelectedUniversityDetail] = useState(() =>
    readStoredUniversityDetail()
  );
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
  const hydrateSession = useEffectEvent(async (token) => {
    await Promise.all([fetchCurrentUser(token), fetchHistory(token)]);
  });

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    function handlePopState() {
      const hasScreenAccess = Boolean(authToken) || entryMode === "guest";
      setScreen(resolveScreenFromPath(window.location.pathname, hasScreenAccess));
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
    if (authToken) {
      hydrateSession(authToken);
      setEntryMode("member");
      const routeScreen =
        typeof window !== "undefined"
          ? resolveScreenFromPath(window.location.pathname, true)
          : SCREEN_WORKSPACE;

      if ([SCREEN_WORKSPACE, SCREEN_ADVISOR, SCREEN_UNIVERSITY].includes(routeScreen)) {
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
    <Suspense fallback={<ScreenFallback />}>
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
                authWallRows={AUTH_WALL_ROWS}
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
                openUniversityDetail={openUniversityDetail}
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

            {screen === SCREEN_UNIVERSITY ? (
              <UniversityScreen
                university={selectedUniversityDetail}
                onBack={closeUniversityDetail}
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
          </motion.div>
        </AnimatePresence>
      </div>
    </Suspense>
  );
}

export default AppRoot;
