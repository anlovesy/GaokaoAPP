import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { revealUp, transitionGentle } from "../../motion/presets.js";
import {
  candidateTypeOptions,
  filterOptions,
  interestOptions,
  personalityTagOptions,
  provinceOptions,
  specialPlanOptions,
  subjectOptions,
  trackOptions
} from "../../config.js";
import { RISK_OPTIONS, WORKSPACE_TABS } from "../../app/constants.js";
import {
  buildUniversityGallery,
  formatDateTime,
  formatTuitionText,
  formatUserRole,
  resolveSchoolRankValue
} from "../../app/utils.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";
import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";
import { getUniversityProfile, resolveUniversityImage } from "../../universityProfiles.js";

const WORKSPACE_STAGE_META = {
  plan: {
    eyebrow: "PLAN STAGE",
    title: "志愿方案编排",
    description: "围绕分数、位次与偏好，整理一套可执行的冲稳保顺序。"
  },
  insights: {
    eyebrow: "RISK LENS",
    title: "风险与机会判断",
    description: "从覆盖率和提醒项里，继续缩小不确定性。"
  },
  account: {
    eyebrow: "PROFILE VAULT",
    title: "账户与历史记录",
    description: "查看画像、历史方案与成员信息，不改变当前工作流。"
  }
};

function StageEmpty({ title, subtitle }) {
  return (
    <section className="workspace-empty-state">
      <span className="brand-kicker">READY</span>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </section>
  );
}

function SummaryRibbon({ items }) {
  return (
    <div className="workspace-summary-ribbon">
      {items.map((item) => (
        <article key={item.label} className="workspace-summary-chip">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function PlanPanel({ result, onOpenUniversityDetail }) {
  const universityGallery = useMemo(() => buildUniversityGallery(result), [result]);
  const [selectedUniversity, setSelectedUniversity] = useState("");

  const activeUniversity =
    universityGallery.find((item) => item.university === selectedUniversity) ||
    universityGallery[0] ||
    null;
  const activeSchool = activeUniversity?.schools?.[0] || null;
  const activeUniversityImage = activeUniversity
    ? resolveUniversityImage(activeUniversity, activeUniversity.university)
    : "";

  const tierMetrics = useMemo(() => {
    if (!result) {
      return [];
    }

    const tiers = result.applicationPlan || [];
    const totalSchools = tiers.reduce((sum, tier) => sum + (tier.schools?.length || 0), 0);

    return [
      {
        label: "方案层级",
        value: `${tiers.length || 0} 组`
      },
      {
        label: "院校数量",
        value: String(totalSchools).padStart(2, "0")
      },
      {
        label: "覆盖率",
        value:
          result.diagnosis?.coverageRate !== undefined
            ? `${result.diagnosis.coverageRate}%`
            : "待生成"
      }
    ];
  }, [result]);

  if (!result) {
    return <StageEmpty title="还没有生成方案" subtitle="填写左侧信息后，开始第一轮志愿判断。" />;
  }

  return (
    <div className="workspace-stage-stack workspace-plan-stack">
      <section className="workspace-stage-hero workspace-plan-hero">
        <div className="workspace-plan-hero-copy">
          <span className="brand-kicker">PLAN</span>
          <h3>{result.summary?.overview || "方案已生成"}</h3>
          <p>{result.summary?.strategy || result.summary?.careerAdvice || "围绕你的位次，继续微调学校与专业顺序。"}</p>
        </div>

        <SummaryRibbon items={tierMetrics} />
      </section>

      <section className="workspace-stage-section workspace-plan-tier-stage">
        <div className="workspace-plan-tier-grid">
          {result.applicationPlan?.map((tier) => (
            <article key={tier.tier} className={`workspace-tier-band workspace-plan-tier ${tier.tierClass}`}>
              <div className="workspace-tier-head">
                <span>{tier.tierLabel}</span>
                <strong>{String(tier.schools?.length || 0).padStart(2, "0")}</strong>
              </div>

              <div className="workspace-tier-list">
                {tier.schools?.map((school) => {
                  const schoolProfile = getUniversityProfile(school.university);

                  return (
                    <button
                      key={`${tier.tier}-${school.university}-${school.major}`}
                      type="button"
                      className={`workspace-tier-row ${
                        selectedUniversity === school.university ? "active" : ""
                      }`}
                      onMouseEnter={() => setSelectedUniversity(school.university)}
                      onFocus={() => setSelectedUniversity(school.university)}
                      onClick={() => {
                        const nextUniversity =
                          universityGallery.find((item) => item.university === school.university) ||
                          null;

                        if (nextUniversity) {
                          onOpenUniversityDetail(nextUniversity);
                        }
                      }}
                    >
                      <div>
                        <strong>{school.university}</strong>
                        <span>{school.major}</span>
                      </div>
                      <div>
                        <span>{school.city || schoolProfile.city || "城市待补充"}</span>
                        <span>位次 {resolveSchoolRankValue(school)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeUniversity ? (
        <section className="workspace-stage-section workspace-plan-focus-stage">
          <article className="workspace-focus-school workspace-plan-focus">
            <div className="workspace-focus-media">
              <img src={activeUniversityImage} alt={activeUniversity.university} loading="lazy" />
            </div>
            <div className="workspace-focus-copy">
              <span className="brand-kicker">FOCUS</span>
              <h4>{activeUniversity.university}</h4>
              <p>
                {activeSchool?.reason ||
                  activeUniversity.heroMajor ||
                  activeUniversity.profile.label}
              </p>
              <div className="workspace-focus-meta">
                <span>{activeUniversity.city || activeUniversity.profile.city}</span>
                <span>{activeSchool?.major || "推荐专业待补充"}</span>
                <span>{formatTuitionText(activeSchool?.tuition)}</span>
              </div>
              <button
                className="text-link-btn"
                type="button"
                onClick={() => onOpenUniversityDetail(activeUniversity)}
              >
                打开高校详情
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {activeUniversity ? (
        <UniversityDetailPanel
          university={activeUniversity}
          onOpenStandalone={onOpenUniversityDetail}
        />
      ) : null}
    </div>
  );
}

function InsightsPanel({ result, tradeoffPanel }) {
  const insightMetrics = [
    {
      label: "冲刺",
      value: result?.diagnosis?.riskProfile?.rushCount || 0
    },
    {
      label: "稳妥",
      value: result?.diagnosis?.riskProfile?.steadyCount || 0
    },
    {
      label: "保底",
      value: result?.diagnosis?.riskProfile?.safeCount || 0
    }
  ];

  if (!result) {
    return <StageEmpty title="还没有生成洞察" subtitle="先生成一版方案，再查看风险和机会提示。" />;
  }

  return (
    <div className="workspace-stage-stack workspace-insight-stack">
      <section className="workspace-stage-section workspace-insight-spotlight">
        <div className="workspace-insight-score">
          <span className="brand-kicker">COVERAGE</span>
          <strong>{result.diagnosis?.coverageRate || "--"}%</strong>
          <p>{result.summary?.careerAdvice || "围绕风险继续判断"}</p>
        </div>

        <div className="workspace-insight-side">
          <SummaryRibbon items={insightMetrics} />
          <article className="workspace-insight-note">
            <span className="brand-kicker">NEXT</span>
            <p>{result.diagnosis?.adjustmentAdvice || "继续缩小不确定性，保留更清晰的选择。"}</p>
          </article>
        </div>
      </section>

      <section className="workspace-stage-section workspace-insight-grid">
        <article className="workspace-editorial-block">
          <div className="workspace-editorial-headline">
            <span className="brand-kicker">DIRECTIONS</span>
            <h4>优先方向</h4>
          </div>
          <ul className="simple-list">
            {result.diagnosis?.topDirections?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="workspace-editorial-block">
          <div className="workspace-editorial-headline">
            <span className="brand-kicker">ALERTS</span>
            <h4>风险提醒</h4>
          </div>
          <ul className="simple-list">
            {result.riskAlerts?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      {tradeoffPanel ? (
        <section className="workspace-stage-section">
          <article className="workspace-tradeoff-callout">
            <span className="brand-kicker">NEXT STEP</span>
            <strong>{tradeoffPanel.title}</strong>
            <p>{tradeoffPanel.description}</p>
          </article>
        </section>
      ) : null}
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
  const historyPlans = historyData?.plans || [];

  const accountMetrics = [
    {
      label: "身份",
      value: authToken ? formatUserRole(currentUser?.role) : "游客"
    },
    {
      label: "历史方案",
      value: String(historyPlans.length).padStart(2, "0")
    },
    {
      label: "成员数量",
      value: String(userList.length).padStart(2, "0")
    }
  ];

  return (
    <div className="workspace-stage-stack workspace-account-stack">
      <section className="workspace-stage-hero workspace-account-hero">
        <div className="workspace-account-hero-copy">
          <span className="brand-kicker">ACCOUNT</span>
          <h3>{authToken ? currentUser?.username || "当前账户" : "游客模式"}</h3>
          <p>{authToken ? formatUserRole(currentUser?.role) : "登录后保存历史方案与连续对话记录。"}</p>
        </div>

        <SummaryRibbon items={accountMetrics} />
      </section>

      <section className="workspace-stage-section workspace-account-grid">
        <article className="workspace-editorial-block">
          <div className="workspace-editorial-headline">
            <span className="brand-kicker">PROFILE</span>
            <h4>画像摘要</h4>
          </div>
          <ul className="simple-list">
            <li>兴趣：{selectedInterestLabels.join(" / ") || "待补充"}</li>
            <li>性格：{selectedPersonalityLabels.join(" / ") || "待补充"}</li>
            <li>院校：{selectedSchoolLabels.join(" / ") || "待补充"}</li>
            <li>专业：{selectedNeedLabels.join(" / ") || "待补充"}</li>
            <li>约束：{selectedConstraintLabels.join(" / ") || "待补充"}</li>
          </ul>
        </article>

        <article className="workspace-editorial-block">
          <div className="workspace-editorial-headline">
            <span className="brand-kicker">HISTORY</span>
            <h4>最近记录</h4>
          </div>

          <div className="workspace-history-timeline">
            {historyPlans.slice(0, 4).map((item) => (
              <div key={item.id} className="workspace-history-item">
                <div className="workspace-history-dot" aria-hidden="true" />
                <div className="workspace-history-copy">
                  <strong>{item.province}</strong>
                  <span>
                    {item.score} / {item.rank}
                  </span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>
            ))}
            {!historyPlans.length ? <p className="muted">还没有历史方案。</p> : null}
          </div>
        </article>
      </section>

      {currentUser?.role === "admin" ? (
        <section className="workspace-stage-section workspace-account-admin">
          <div className="workspace-account-admin-grid">
            <form className="editorial-admin-form workspace-account-form" onSubmit={handleCreateUser}>
              <div className="workspace-editorial-headline">
                <span className="brand-kicker">NEW USER</span>
                <h4>新增成员</h4>
              </div>

              <label>
                <span>新账户</span>
                <input
                  value={newUserForm.username}
                  onChange={(event) =>
                    setNewUserForm((current) => ({ ...current, username: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>初始密码</span>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) =>
                    setNewUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>角色</span>
                <select
                  value={newUserForm.role}
                  onChange={(event) =>
                    setNewUserForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="advisor">顾问</option>
                  <option value="admin">管理员</option>
                </select>
              </label>
              <button className="primary-btn" type="submit" disabled={userManagementLoading}>
                {userManagementLoading ? "处理中..." : "创建"}
              </button>
              {userManagementMessage ? <p className="muted">{userManagementMessage}</p> : null}
            </form>

            <div className="editorial-user-stack workspace-account-members">
              {userList.map((user) => (
                <article key={user.id} className="editorial-user-row workspace-member-row">
                  <div>
                    <strong>{user.username}</strong>
                    <span>
                      {formatUserRole(user.role)} / 创建于 {formatDateTime(user.createdAt)}
                    </span>
                  </div>

                  <div className="editorial-user-actions">
                    <select
                      value={user.role}
                      onChange={(event) => handleChangeUserRole(user.id, event.target.value)}
                      disabled={userManagementLoading}
                    >
                      <option value="advisor">顾问</option>
                      <option value="admin">管理员</option>
                    </select>
                    <input
                      type="password"
                      value={passwordResetForm[user.id] || ""}
                      placeholder="新密码"
                      onChange={(event) =>
                        setPasswordResetForm((current) => ({
                          ...current,
                          [user.id]: event.target.value
                        }))
                      }
                    />
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => handleResetUserPassword(user.id)}
                      disabled={userManagementLoading}
                    >
                      重置
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={userManagementLoading || currentUser?.id === user.id}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function WorkspaceScreen({
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
  profileHighlights,
  providers,
  result,
  openUniversityDetail,
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
}) {
  const modelLabel =
    providers.find((item) => item.id === formState.aiProvider)?.label ||
    (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider);
  const plannerFormRef = useRef(null);
  const chatScrollRef = useRef(null);
  const activeTabMeta = WORKSPACE_STAGE_META[workspaceTab] || WORKSPACE_STAGE_META.plan;
  const activeTabLabel =
    WORKSPACE_TABS.find((item) => item.value === workspaceTab)?.label || "当前工作台";

  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages, chatLoading]);

  return (
    <div className="workspace-shell brand-shell">
      <motion.header
        className="workspace-premium-head"
        initial="hidden"
        animate="visible"
        variants={revealUp}
        transition={transitionGentle}
      >
        <div className="workspace-head-copy">
          <span className="brand-kicker">VOLUNTARY STRATEGY</span>
          <h1>志愿工作台</h1>
          <p>把画像、方案与顾问判断放在同一空间里完成。</p>
        </div>

        <div className="workspace-head-status">
          <div className="workspace-head-model">
            <span className="brand-kicker">SESSION</span>
            <strong>{modelLabel}</strong>
            <p>
              {chatEnabled
                ? `当前身份：${currentUser?.username || "已登录用户"}`
                : guestMode
                  ? "当前身份：游客体验"
                  : "当前身份：未登录"}
            </p>
          </div>

          <div className="workspace-head-actions">
            <button className="text-link-btn" type="button" onClick={goToLanding}>
              返回首页
            </button>
            {!chatEnabled ? (
              <button className="text-link-btn" type="button" onClick={goToAuth}>
                登录
              </button>
            ) : null}
            {chatEnabled ? (
              <button className="text-link-btn" type="button" onClick={handleLogout}>
                退出
              </button>
            ) : null}
          </div>
        </div>
      </motion.header>

      <div className="workspace-shell-stage">
        <div className="workspace-shell-backdrop" aria-hidden="true" />

        <div className="workspace-premium-grid">
          <motion.aside
            className="workspace-portrait-rail workspace-shell-panel"
            initial="hidden"
            animate="visible"
            variants={revealUp}
            transition={{ duration: 0.58, delay: 0.08 }}
          >
            <div className="workspace-rail-mark">
              <div>
                <span className="brand-kicker">PORTRAIT</span>
                <h2>考生画像</h2>
              </div>
              <span className={`workspace-risk-pill risk-${formState.risk}`}>
                {currentRiskOption.label}
              </span>
            </div>

            <div className="workspace-profile-cloud">
              <span className="brand-kicker">SNAPSHOT</span>
              <div className="editorial-chip-cloud muted">
                {profileHighlights.map((item) => (
                  <span key={item} className="editorial-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className={`workspace-inline-note ${mandatoryCheck.ok ? "ok" : "warn"}`}>
              {mandatoryCheck.ok
                ? "信息已齐备，可以开始生成。"
                : `还缺：${mandatoryCheck.missing.join(" / ")}`}
            </div>

            <form ref={plannerFormRef} className="workspace-form-stack" onSubmit={handleSubmit}>
              <section className="workspace-form-section">
                <h3>基础信息</h3>
                <div className="workspace-field-grid">
                  <label>
                    <span>省份</span>
                    <select
                      value={formState.province}
                      onChange={(event) => updateField("province", event.target.value)}
                    >
                      {provinceOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>高考模式</span>
                    <input value={formState.examMode} readOnly />
                  </label>

                  <label>
                    <span>科类</span>
                    <select
                      value={formState.track}
                      onChange={(event) => updateField("track", event.target.value)}
                    >
                      {trackOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>考生类型</span>
                    <select
                      value={formState.candidateType}
                      onChange={(event) => updateField("candidateType", event.target.value)}
                    >
                      {candidateTypeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>分数</span>
                    <input
                      type="number"
                      value={formState.score}
                      onChange={(event) => updateField("score", Number(event.target.value || 0))}
                    />
                  </label>

                  <label>
                    <span>位次</span>
                    <input
                      type="number"
                      value={formState.rank}
                      onChange={(event) => updateField("rank", Number(event.target.value || 0))}
                    />
                  </label>

                  <label>
                    <span>英语</span>
                    <input
                      type="number"
                      value={formState.englishScore}
                      onChange={(event) =>
                        updateField("englishScore", Number(event.target.value || 0))
                      }
                    />
                  </label>

                  <label>
                    <span>学费上限</span>
                    <input
                      type="number"
                      value={formState.maxTuition}
                      onChange={(event) =>
                        updateField("maxTuition", Number(event.target.value || 0))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="workspace-form-section">
                <h3>偏好选择</h3>

                <fieldset>
                  <legend>选考科目</legend>
                  <div className="editorial-chip-cloud">
                    {subjectOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`editorial-chip ${
                          formState.selectedSubjects.includes(item) ? "active" : ""
                        }`}
                        onClick={() => toggleSelection("selectedSubjects", item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>兴趣方向</legend>
                  <div className="editorial-chip-cloud">
                    {interestOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`editorial-chip ${
                          formState.interests.includes(item.id) ? "active" : ""
                        }`}
                        onClick={() => toggleSelection("interests", item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>性格标签</legend>
                  <div className="editorial-chip-cloud">
                    {personalityTagOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`editorial-chip ${
                          formState.personalityTags.includes(item.value) ? "active" : ""
                        }`}
                        onClick={() => toggleSelection("personalityTags", item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="workspace-risk-grid">
                  {RISK_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`workspace-risk-option ${
                        formState.risk === item.value ? "active" : ""
                      }`}
                      onClick={() => updateField("risk", item.value)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </button>
                  ))}
                </div>

                {filterOptions.map((group) => (
                  <fieldset key={group.key}>
                    <legend>{group.label}</legend>
                    <div className="editorial-chip-cloud">
                      {group.options.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`editorial-chip ${
                            formState[group.key].includes(item.value) ? "active" : ""
                          }`}
                          onClick={() => toggleSelection(group.key, item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <fieldset>
                  <legend>专项计划</legend>
                  <div className="editorial-chip-cloud">
                    {specialPlanOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`editorial-chip ${
                          formState.specialPlans.includes(item.value) ? "active" : ""
                        }`}
                        onClick={() => toggleSelection("specialPlans", item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="workspace-form-section">
                <h3>补充说明</h3>

                <label>
                  <span>意向城市</span>
                  <input
                    value={formState.preferredCities}
                    onChange={(event) => updateField("preferredCities", event.target.value)}
                    placeholder="例如：广州 / 深圳 / 杭州"
                  />
                </label>

                <label>
                  <span>职业规划</span>
                  <textarea
                    rows="4"
                    value={formState.careerPlan}
                    onChange={(event) => updateField("careerPlan", event.target.value)}
                    placeholder="例如：更重视就业、读研、考公或行业方向"
                  />
                </label>

                <label>
                  <span>补充说明</span>
                  <textarea
                    rows="4"
                    value={formState.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="例如：优先省内、优先保专业、不接受冷门调剂"
                  />
                </label>

                <label>
                  <span>报考限制</span>
                  <textarea
                    rows="3"
                    value={formState.healthNotes}
                    onChange={(event) => updateField("healthNotes", event.target.value)}
                    placeholder="例如：体检限制、色弱、近视等"
                  />
                </label>

                <label className="workspace-switch">
                  <input
                    type="checkbox"
                    checked={formState.willingAdjustment}
                    onChange={(event) => updateField("willingAdjustment", event.target.checked)}
                  />
                  <span>接受专业调剂</span>
                </label>
              </section>

              <div className="workspace-submit-row">
                <button
                  className="primary-btn magnetic-btn"
                  type="submit"
                  disabled={loading || !canGeneratePlan}
                >
                  {loading ? "生成中..." : guestMode ? "生成体验方案" : "生成正式方案"}
                </button>
                {result ? (
                  <button className="text-link-btn" type="button" onClick={handlePrintPlan}>
                    打印志愿表
                  </button>
                ) : null}
                {error ? <p className="error-text">{error}</p> : null}
              </div>
            </form>
          </motion.aside>

          <motion.section
            className="workspace-decision-stage workspace-shell-panel"
            initial="hidden"
            animate="visible"
            variants={revealUp}
            transition={{ duration: 0.58, delay: 0.14 }}
          >
            <div className="workspace-stage-header">
              <div className="workspace-stage-intro">
                <span className="brand-kicker">{activeTabMeta.eyebrow}</span>
                <h2>{activeTabMeta.title}</h2>
                <p>{activeTabMeta.description}</p>
              </div>

              <div className="workspace-stage-status">
                <span className="workspace-stage-pill">{activeTabLabel}</span>
                <span className={`workspace-stage-pill ${result ? "accent" : ""}`}>
                  {result ? "最新方案已生成" : "等待生成"}
                </span>
              </div>
            </div>

            <div className="workspace-tabline">
              {WORKSPACE_TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`workspace-tab ${workspaceTab === item.value ? "active" : ""}`}
                  onClick={() => setWorkspaceTab(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {workspaceTab === "plan" ? (
              <PlanPanel result={result} onOpenUniversityDetail={openUniversityDetail} />
            ) : null}
            {workspaceTab === "insights" ? (
              <InsightsPanel result={result} tradeoffPanel={tradeoffPanel} />
            ) : null}
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
          </motion.section>

          <motion.aside
            className="workspace-advisor-dock workspace-shell-panel"
            initial="hidden"
            animate="visible"
            variants={revealUp}
            transition={{ duration: 0.58, delay: 0.2 }}
          >
            <div className="workspace-advisor-mark">
              <div>
                <span className="brand-kicker">ADVISOR</span>
                <h2>继续追问</h2>
              </div>
              <button className="text-link-btn" type="button" onClick={openAdvisorPanel}>
                全屏打开
              </button>
            </div>

            <div className="workspace-advisor-meta">
              <span>{advisorConfig.shortLabel}</span>
              <span>{modelLabel}</span>
            </div>

            <div className="workspace-advisor-prompts">
              <span className="brand-kicker">PROMPTS</span>
              <div className="editorial-chip-cloud">
                {activeQuickQuestions.slice(0, 3).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="editorial-chip prompt-chip"
                    onClick={() => handleSendChat(item)}
                    disabled={chatLoading || !chatEnabled}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="text-link-btn"
              type="button"
              onClick={handleSendPlanningContextToAdvisor}
              disabled={chatLoading || !chatEnabled || !hasPlanningContext}
            >
              附上当前方案
            </button>

            <ChatTranscript
              advisorBadge={advisorConfig.badge}
              chatLoading={chatLoading}
              className="workspace-advisor-chat"
              messages={chatMessages}
              scrollRef={chatScrollRef}
              typingLabel="正在整理你的下一轮判断..."
            />

            <div className="workspace-advisor-input">
              <textarea
                ref={inlineChatInputRef}
                rows="4"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={
                  chatEnabled
                    ? "继续追问学校、专业、城市与风险"
                    : "登录后继续完整对话"
                }
                disabled={!chatEnabled}
              />

              <div className="workspace-advisor-actions">
                <button
                  className="primary-btn magnetic-btn"
                  type="button"
                  onClick={() => handleSendChat()}
                  disabled={chatLoading || !chatEnabled}
                >
                  {chatLoading ? "思考中..." : "发送"}
                </button>
                {!chatEnabled ? (
                  <button className="text-link-btn" type="button" onClick={goToAuth}>
                    登录解锁
                  </button>
                ) : null}
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <div className="workspace-mobile-dock">
        <button
          className="secondary-btn"
          type="button"
          onClick={() => plannerFormRef.current?.requestSubmit()}
          disabled={loading || !canGeneratePlan}
        >
          {loading ? "生成中..." : "生成"}
        </button>
        <button className="primary-btn" type="button" onClick={openAdvisorPanel}>
          顾问
        </button>
      </div>
    </div>
  );
}
