import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

const revealUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 }
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

function PlanPanel({ result, onOpenUniversityDetail }) {
  const universityGallery = useMemo(() => buildUniversityGallery(result), [result]);
  const [selectedUniversity, setSelectedUniversity] = useState("");

  if (!result) {
    return <StageEmpty title="还没生成方案" subtitle="先输入，再开始判断" />;
  }

  const activeUniversity =
    universityGallery.find((item) => item.university === selectedUniversity) ||
    universityGallery[0] ||
    null;
  const activeSchool = activeUniversity?.schools?.[0] || null;
  const activeUniversityImage = activeUniversity
    ? resolveUniversityImage(activeUniversity, activeUniversity.university)
    : "";

  return (
    <div className="workspace-stage-stack">
      <section className="workspace-stage-hero">
        <span className="brand-kicker">PLAN</span>
        <h3>{result.summary?.overview || "方案已生成"}</h3>
        <p>
          {result.summary?.strategy || result.summary?.careerAdvice || "围绕你的位次继续判断。"}
        </p>
      </section>

      <section className="workspace-stage-section">
        <div className="workspace-tier-flow">
          {result.applicationPlan?.map((tier) => (
            <article key={tier.tier} className={`workspace-tier-band ${tier.tierClass}`}>
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
        <section className="workspace-stage-section">
          <article className="workspace-focus-school">
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
  if (!result) {
    return <StageEmpty title="还没生成洞察" subtitle="先让系统给出第一版判断" />;
  }

  return (
    <div className="workspace-stage-stack">
      <section className="workspace-stage-hero">
        <span className="brand-kicker">INSIGHT</span>
        <h3>{result.summary?.careerAdvice || "围绕风险继续判断"}</h3>
        <p>{result.diagnosis?.adjustmentAdvice || "继续缩小不确定性。"}</p>
      </section>

      <section className="workspace-stage-section">
        <div className="editorial-fact-grid">
          <article>
            <span>覆盖率</span>
            <strong>{result.diagnosis?.coverageRate || "--"}%</strong>
          </article>
          <article>
            <span>冲刺</span>
            <strong>{result.diagnosis?.riskProfile?.rushCount || 0}</strong>
          </article>
          <article>
            <span>稳妥</span>
            <strong>{result.diagnosis?.riskProfile?.steadyCount || 0}</strong>
          </article>
          <article>
            <span>保底</span>
            <strong>{result.diagnosis?.riskProfile?.safeCount || 0}</strong>
          </article>
        </div>
      </section>

      <section className="workspace-stage-section">
        <div className="editorial-list-grid">
          <article>
            <span className="brand-kicker">DIRECTIONS</span>
            <ul className="simple-list">
              {result.diagnosis?.topDirections?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article>
            <span className="brand-kicker">ALERTS</span>
            <ul className="simple-list">
              {result.riskAlerts?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {tradeoffPanel ? (
        <section className="workspace-stage-section">
          <article className="editorial-highlight-block large">
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
  return (
    <div className="workspace-stage-stack">
      <section className="workspace-stage-hero">
        <span className="brand-kicker">ACCOUNT</span>
        <h3>{authToken ? currentUser?.username || "当前账户" : "游客模式"}</h3>
        <p>{authToken ? formatUserRole(currentUser?.role) : "登录后保存历史与连续对话"}</p>
      </section>

      <section className="workspace-stage-section">
        <div className="editorial-list-grid">
          <article>
            <span className="brand-kicker">PROFILE</span>
            <ul className="simple-list">
              <li>兴趣：{selectedInterestLabels.join(" / ") || "待补充"}</li>
              <li>性格：{selectedPersonalityLabels.join(" / ") || "待补充"}</li>
              <li>院校：{selectedSchoolLabels.join(" / ") || "待补充"}</li>
              <li>专业：{selectedNeedLabels.join(" / ") || "待补充"}</li>
              <li>约束：{selectedConstraintLabels.join(" / ") || "待补充"}</li>
            </ul>
          </article>

          <article>
            <span className="brand-kicker">HISTORY</span>
            <div className="editorial-history-list">
              {historyData.plans.slice(0, 4).map((item) => (
                <div key={item.id} className="editorial-history-row">
                  <strong>{item.province}</strong>
                  <span>
                    {item.score} / {item.rank}
                  </span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              ))}
              {!historyData.plans.length ? <p className="muted">还没有历史方案。</p> : null}
            </div>
          </article>
        </div>
      </section>

      {currentUser?.role === "admin" ? (
        <section className="workspace-stage-section">
          <div className="editorial-admin-grid">
            <form className="editorial-admin-form" onSubmit={handleCreateUser}>
              <span className="brand-kicker">NEW USER</span>
              <label>
                <span>新账号</span>
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

            <div className="editorial-user-stack">
              {userList.map((user) => (
                <article key={user.id} className="editorial-user-row">
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

  return (
    <div className="workspace-shell brand-shell">
      <motion.header
        className="workspace-minimal-head"
        initial="hidden"
        animate="visible"
        variants={revealUp}
        transition={{ duration: 0.55 }}
      >
        <div>
          <span className="brand-kicker">VOLUNTARY STRATEGY</span>
          <h1>志愿工作台</h1>
          <p>直接开始判断</p>
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
      </motion.header>

      <div className="workspace-editorial-grid">
        <motion.aside
          className="workspace-portrait-rail"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.58, delay: 0.08 }}
        >
          <div className="workspace-rail-head">
            <div>
              <span className="brand-kicker">PORTRAIT</span>
              <h2>考生画像</h2>
            </div>
            <span className={`workspace-risk-pill risk-${formState.risk}`}>
              {currentRiskOption.label}
            </span>
          </div>

          <div className="editorial-chip-cloud muted">
            {profileHighlights.map((item) => (
              <span key={item} className="editorial-chip">
                {item}
              </span>
            ))}
          </div>

          <div className={`workspace-inline-note ${mandatoryCheck.ok ? "ok" : "warn"}`}>
            {mandatoryCheck.ok ? "信息已齐备" : `还缺：${mandatoryCheck.missing.join(" / ")}`}
          </div>

          <form ref={plannerFormRef} className="workspace-form-stack" onSubmit={handleSubmit}>
            <section className="workspace-form-section">
              <h3>基础</h3>
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
                    onChange={(event) => updateField("maxTuition", Number(event.target.value || 0))}
                  />
                </label>
              </div>
            </section>

            <section className="workspace-form-section">
              <h3>偏好</h3>

              <fieldset>
                <legend>选考科目</legend>
                <div className="editorial-chip-cloud">
                  {subjectOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`editorial-chip ${formState.selectedSubjects.includes(item) ? "active" : ""}`}
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
                      className={`editorial-chip ${formState.interests.includes(item.id) ? "active" : ""}`}
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
                      className={`editorial-chip ${formState.personalityTags.includes(item.value) ? "active" : ""}`}
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
                    className={`workspace-risk-option ${formState.risk === item.value ? "active" : ""}`}
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
                        className={`editorial-chip ${formState[group.key].includes(item.value) ? "active" : ""}`}
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
                      className={`editorial-chip ${formState.specialPlans.includes(item.value) ? "active" : ""}`}
                      onClick={() => toggleSelection("specialPlans", item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>

            <section className="workspace-form-section">
              <h3>补充</h3>

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
          className="workspace-decision-stage"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.58, delay: 0.14 }}
        >
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
          className="workspace-advisor-dock"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.58, delay: 0.2 }}
        >
          <div className="workspace-advisor-head">
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
            typingLabel="正在整理下一轮判断..."
          />

          <div className="workspace-advisor-input">
            <textarea
              ref={inlineChatInputRef}
              rows="4"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={chatEnabled ? "继续追问学校、专业、城市与风险" : "登录后继续完整对话"}
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
