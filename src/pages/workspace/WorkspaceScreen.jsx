import { useEffect, useMemo, useState } from "react";
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
import { RISK_OPTIONS, WORKSPACE_FEATURES, WORKSPACE_TABS } from "../../app/constants.js";
import {
  buildUniversityGallery,
  formatDateTime,
  formatTuitionText,
  formatUserRole,
  resolveSchoolRankValue
} from "../../app/utils.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";
import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";
import { getUniversityProfile } from "../../universityProfiles.js";

function PlanPanel({ result, planStats, tradeoffPanel, onOpenUniversityDetail }) {
  const universityGallery = useMemo(() => buildUniversityGallery(result), [result]);
  const [selectedUniversity, setSelectedUniversity] = useState("");

  useEffect(() => {
    if (!universityGallery.length) {
      setSelectedUniversity("");
      return;
    }

    setSelectedUniversity((current) =>
      universityGallery.some((item) => item.university === current)
        ? current
        : universityGallery[0].university
    );
  }, [universityGallery]);

  if (!result) {
    return (
      <article className="info-card">
        <h4>等待生成正式方案</h4>
        <p>完成左侧画像后生成志愿表，这里会展示冲稳保分层、核心摘要、院校图片与高校档案入口。</p>
      </article>
    );
  }

  const activeUniversity =
    universityGallery.find((item) => item.university === selectedUniversity) ||
    universityGallery[0] ||
    null;

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
            <h4>整体判断</h4>
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

      {universityGallery.length ? (
        <section className="result-block">
          <div className="section-head compact">
            <div>
              <h3>高校影像速览</h3>
              <p className="workspace-subtitle">先看推荐里最值得重点研究的学校，再点击进入高校档案，继续查看简介、招生参考、分数线和学费信息。</p>
            </div>
          </div>
          <div className="university-gallery-grid">
            {universityGallery.map((item) => (
              <button
                key={item.university}
                type="button"
                className={`university-gallery-card ${selectedUniversity === item.university ? "active" : ""}`}
                onMouseEnter={() => setSelectedUniversity(item.university)}
                onFocus={() => setSelectedUniversity(item.university)}
                onClick={() => {
                  setSelectedUniversity(item.university);
                  if (onOpenUniversityDetail) {
                    onOpenUniversityDetail(item);
                  }
                }}
              >
                <img src={item.profile.image} alt={`${item.university} 校园图片`} loading="lazy" />
                <div className="university-gallery-copy">
                  <span>{item.profile.region} / {item.city || item.profile.city}</span>
                  <strong>{item.university}</strong>
                  <p>{item.heroMajor || item.profile.label}</p>
                  <div className="university-gallery-meta">
                    <em>{item.tierLabel}</em>
                    <em>{item.recommendationCount} 个推荐专业</em>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
                {tier.schools?.map((school) => {
                  const schoolProfile = getUniversityProfile(school.university);
                  const isSelected = selectedUniversity === school.university;

                  return (
                    <article
                      key={`${tier.tier}-${school.university}-${school.major}`}
                      className={`school-card school-card-visual ${isSelected ? "is-selected" : ""}`}
                    >
                      <button
                        type="button"
                        className="school-visual"
                        onClick={() => {
                          const nextUniversity =
                            universityGallery.find((item) => item.university === school.university) || null;
                          if (nextUniversity && onOpenUniversityDetail) {
                            onOpenUniversityDetail(nextUniversity);
                            return;
                          }
                          setSelectedUniversity(school.university);
                        }}
                      >
                        <img src={schoolProfile.image} alt={`${school.university} 校园图片`} loading="lazy" />
                        <span className="school-visual-badge">点击查看高校档案</span>
                        <div className="school-visual-copy">
                          <strong>{school.university}</strong>
                          <span>{school.city || schoolProfile.city || "城市待补充"}</span>
                        </div>
                      </button>

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
                        <span>最低位次 {resolveSchoolRankValue(school)}</span>
                        <span>城市 {school.city || schoolProfile.city || "未知"}</span>
                        <span>学费 {formatTuitionText(school.tuition)}</span>
                      </div>

                      {school.subjectRequirement ? <div className="subject-line">选科要求：{school.subjectRequirement}</div> : null}
                      {school.reason ? <p className="school-reason">{school.reason}</p> : null}
                    </article>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeUniversity ? <UniversityDetailPanel university={activeUniversity} onOpenStandalone={onOpenUniversityDetail} /> : null}

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

export function WorkspaceScreen(props) {
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

            {workspaceTab === "plan" ? <PlanPanel result={result} planStats={planStats} tradeoffPanel={tradeoffPanel} onOpenUniversityDetail={openUniversityDetail} /> : null}
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
