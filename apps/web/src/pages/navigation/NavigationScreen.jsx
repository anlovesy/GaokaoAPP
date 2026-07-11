import { useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  candidateTypeOptions,
  filterOptions,
  interestOptions,
  provinceOptions,
  subjectOptions,
  trackOptions
} from "../../config.js";
import { RISK_OPTIONS } from "../../app/constants.js";
import { revealSoft, revealUp, transitionGentle } from "../../motion/presets.js";
import "../../styles/pages/navigation.css";

function resolveOptionLabel(options, value) {
  const matched = options.find((item) =>
    typeof item === "string" ? item === value : item.value === value || item.id === value
  );

  if (!matched) {
    return "";
  }

  return typeof matched === "string" ? matched : matched.label;
}

function resolveFilterLabel(groupKey, value) {
  return (
    filterOptions
      .find((group) => group.key === groupKey)
      ?.options.find((item) => item.value === value)?.label || ""
  );
}

function CloudTag({ active, label, onClick, tone = "m" }) {
  return (
    <button
      type="button"
      className={`navigation-cloud-tag navigation-cloud-tag-${tone} ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function NetworkField({ nodes }) {
  return (
    <div className="navigation-network-field" aria-hidden="true">
      <svg className="navigation-network-svg" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path
          className="navigation-network-path"
          d="M16 132 C 132 64, 248 184, 384 108 S 644 62, 784 126 S 1030 172, 1184 92"
        />
        <path
          className="navigation-network-path navigation-network-path-secondary"
          d="M40 112 C 178 172, 294 42, 428 108 S 680 154, 842 98 S 1066 42, 1168 116"
        />
      </svg>

      {nodes.map((node) => (
        <span
          key={node.id}
          className={`navigation-network-node navigation-network-node-${node.size}`}
          style={{ left: node.left, top: node.top }}
        />
      ))}

      <span className="navigation-network-focus" />
    </div>
  );
}

function CandidateOrbCard({ formState, candidateLabel, narrativeSummary, previewChips }) {
  return (
    <section className="navigation-card navigation-candidate-card">
      <div className="navigation-orb-stage">
        <div className="navigation-orb-ring navigation-orb-ring-outer" />
        <div className="navigation-orb-ring navigation-orb-ring-inner" />
        <div className="navigation-score-orb">
          <strong>{formState.score || "--"}</strong>
          <span>位次 {formState.rank || "--"}</span>
        </div>
      </div>

      <div className="navigation-candidate-copy">
        <span className="navigation-section-kicker">Candidate</span>
        <h2>{candidateLabel}</h2>
        <p>{narrativeSummary}</p>
      </div>

      <div className="navigation-candidate-tags">
        {previewChips.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function BaseDataPanel({ formState, updateField }) {
  return (
    <section className="navigation-card navigation-data-card">
      <span className="navigation-section-kicker">Base Data</span>

      <div className="navigation-data-flow">
        <label className="navigation-data-item">
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

        <label className="navigation-data-item">
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

        <label className="navigation-data-item">
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

        <label className="navigation-data-item">
          <span>分数</span>
          <input
            type="number"
            value={formState.score}
            onChange={(event) => updateField("score", Number(event.target.value || 0))}
          />
        </label>

        <label className="navigation-data-item">
          <span>位次</span>
          <input
            type="number"
            value={formState.rank}
            onChange={(event) => updateField("rank", Number(event.target.value || 0))}
          />
        </label>

        <label className="navigation-data-item navigation-data-item-wide">
          <span>意向城市</span>
          <input
            value={formState.preferredCities}
            onChange={(event) => updateField("preferredCities", event.target.value)}
            placeholder="例如：广州 / 深圳 / 杭州"
          />
        </label>
      </div>
    </section>
  );
}

function PreferenceCloud({ formState, toggleSelection }) {
  return (
    <section className="navigation-card navigation-preference-card">
      <span className="navigation-section-kicker">Preference</span>

      <div className="navigation-preference-scroll">
        <div className="navigation-cloud-block">
          <span className="navigation-cloud-title">选科</span>
          <div className="navigation-cloud-layout navigation-cloud-layout-subjects">
            {subjectOptions.map((item) => (
              <CloudTag
                key={item}
                active={formState.selectedSubjects.includes(item)}
                label={item}
                tone="s"
                onClick={() => toggleSelection("selectedSubjects", item)}
              />
            ))}
          </div>
        </div>

        <div className="navigation-cloud-block">
          <span className="navigation-cloud-title">兴趣方向</span>
          <div className="navigation-cloud-layout navigation-cloud-layout-free">
            {interestOptions.map((item, index) => (
              <CloudTag
                key={item.id}
                active={formState.interests.includes(item.id)}
                label={item.label}
                tone={index % 4 === 0 ? "l" : index % 2 === 0 ? "m" : "s"}
                onClick={() => toggleSelection("interests", item.id)}
              />
            ))}
          </div>
        </div>

        <div className="navigation-cloud-columns">
          {filterOptions.map((group) => (
            <div key={group.key} className="navigation-cloud-column">
              <strong>{group.label}</strong>
              <div className="navigation-cloud-layout">
                {group.options.map((item) => (
                  <CloudTag
                    key={item.value}
                    active={formState[group.key].includes(item.value)}
                    label={item.label}
                    tone="m"
                    onClick={() => toggleSelection(group.key, item.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskTiltCards({ formState, updateField }) {
  const riskMeta = {
    aggressive: { title: "冲刺", rate: "65%", caption: "Higher swing" },
    balanced: { title: "稳妥", rate: "78%", caption: "Balanced path" },
    conservative: { title: "保守", rate: "89%", caption: "Safer landing" }
  };

  return (
    <section className="navigation-card navigation-risk-card-system">
      <div className="navigation-risk-head">
        <span className="navigation-section-kicker">Risk Model</span>
        <p>选择这一轮方案的风险姿态。</p>
      </div>

      <div className="navigation-risk-perspective">
        {RISK_OPTIONS.map((item, index) => (
          <button
            key={item.value}
            type="button"
            className={`navigation-risk-card navigation-risk-card-${index} ${
              formState.risk === item.value ? "active" : ""
            }`}
            onClick={() => updateField("risk", item.value)}
          >
            <span className="navigation-risk-kicker">{riskMeta[item.value].title}</span>
            <strong>{item.label}</strong>
            <p>{item.description}</p>
            <small>录取率 {riskMeta[item.value].rate}</small>
            <b>{riskMeta[item.value].caption}</b>
            <span className="navigation-risk-sphere" />
          </button>
        ))}
      </div>
    </section>
  );
}

function OutputPathPreview({
  currentRiskOption,
  preferredCity,
  selectedInterestLabels,
  selectedSchoolLabels
}) {
  const riskLabel = currentRiskOption?.label || "平衡策略";
  const primaryInterest = selectedInterestLabels[0] || "兴趣方向";
  const secondaryInterest = selectedInterestLabels[1] || "专业取向";
  const schoolPreference = selectedSchoolLabels[0] || "院校层次";
  const cityLabel = preferredCity || "目标城市";
  const pathRows = [
    {
      id: "A",
      label: "冲刺线",
      nodes: ["分数", primaryInterest, "高潜院校"]
    },
    {
      id: "B",
      label: "平衡线",
      nodes: ["位次", cityLabel, schoolPreference]
    },
    {
      id: "C",
      label: "稳妥线",
      nodes: ["风险", secondaryInterest, "安全落点"]
    }
  ];

  return (
    <section className="navigation-card navigation-output-card">
      <span className="navigation-section-kicker">Output Preview</span>
      <div className="navigation-output-copy">
        <h3>AI 生成路径</h3>
        <p>围绕 {riskLabel}，系统会先推导三条不同力度的志愿链。</p>
      </div>

      <div className="navigation-output-paths">
        {pathRows.map((path) => (
          <div key={path.id} className="navigation-output-path">
            <div className="navigation-output-path-top">
              <span>{path.id}</span>
              <strong>{path.label}</strong>
            </div>

            <div className="navigation-output-chain">
              {path.nodes.map((node, index) => (
                <div key={`${path.id}-${node}`} className="navigation-output-node">
                  <span className="navigation-output-dot" />
                  <em>{node}</em>
                  {index < path.nodes.length - 1 ? (
                    <span className="navigation-output-link" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIFloatingStudio({ currentRiskOption, selectedInterestLabels }) {
  const focusItems = [
    currentRiskOption.label,
    selectedInterestLabels[0] || "兴趣方向",
    selectedInterestLabels[1] || "城市偏好"
  ].filter(Boolean);

  return (
    <aside className="navigation-ai-studio premium-glass">
      <div className="navigation-ai-head">
        <div>
          <span className="navigation-section-kicker">AI Advisor Studio</span>
          <strong>Decision Copilot</strong>
        </div>
      </div>

      <div className="navigation-ai-visual">
        <div className="navigation-ai-orbit navigation-ai-orbit-outer" />
        <div className="navigation-ai-orbit navigation-ai-orbit-mid" />
        <motion.span
          className="navigation-ai-orb"
          animate={{
            rotate: 360,
            scale: [1, 1.05, 1]
          }}
          transition={{
            rotate: { duration: 16, repeat: Infinity, ease: "linear" },
            scale: { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </div>

      <div className="navigation-ai-status">
        <span>Thinking</span>
        <p>
          正在围绕 {currentRiskOption.label} 与 {selectedInterestLabels[0] || "当前偏好"}，
          重组更稳的落点路径。
        </p>
      </div>

      <div className="navigation-ai-focus">
        <span className="navigation-ai-focus-label">Current Focus</span>
        <div className="navigation-ai-focus-list">
          {focusItems.map((item) => (
            <b key={item}>{item}</b>
          ))}
        </div>
      </div>

      <div className="navigation-ai-chip-list">
        {[
          "为什么推荐平衡型？",
          "如果只留广东方案呢？",
          "专业与城市如何取舍？"
        ].map((item) => (
          <button key={item} type="button">
            {item}
          </button>
        ))}
      </div>

      <label className="navigation-ai-input">
        <input placeholder="继续追问当前策略..." readOnly />
      </label>
    </aside>
  );
}

function ContinueDock({
  canGeneratePlan,
  error,
  guestMode,
  loading,
  mandatoryCheck,
  onContinue
}) {
  return (
    <div className="navigation-continue-dock">
      <div className="navigation-continue-copy">
        <span className="navigation-section-kicker">Ready</span>
        <strong>{mandatoryCheck.ok ? "准备就绪" : "仍需补全关键信息"}</strong>
        <p>{error || `当前模式：${guestMode ? "游客模式" : "正式模式"}`}</p>
      </div>

      <button
        className="navigation-continue-btn primary-btn magnetic-btn"
        type="button"
        disabled={loading || !canGeneratePlan}
        onClick={onContinue}
      >
        {loading ? "准备中..." : "进入决策工作台"}
      </button>
    </div>
  );
}

export function NavigationScreen({
  canGeneratePlan,
  currentRiskOption,
  error,
  formState,
  guestMode,
  loading,
  mandatoryCheck,
  onContinue,
  topAccessory,
  toggleSelection,
  updateField
}) {
  const prefersReducedMotion = useReducedMotion();
  const shellRef = useRef(null);
  const selectedInterestLabels = formState.interests
    .map((value) => resolveOptionLabel(interestOptions, value))
    .filter(Boolean)
    .slice(0, 3);
  const selectedSchoolLabels = formState.schoolTags
    .map((value) => resolveFilterLabel("schoolTags", value))
    .filter(Boolean)
    .slice(0, 2);
  const selectedNeedLabels = formState.majorNeeds
    .map((value) => resolveFilterLabel("majorNeeds", value))
    .filter(Boolean)
    .slice(0, 2);
  const selectedConstraintLabels = formState.subjectConstraints
    .map((value) => resolveFilterLabel("subjectConstraints", value))
    .filter(Boolean)
    .slice(0, 2);
  const candidateLabel =
    resolveOptionLabel(candidateTypeOptions, formState.candidateType) || "普通考生";

  const narrativeSummary =
    [
      formState.province,
      formState.track,
      selectedInterestLabels[0],
      selectedNeedLabels[0],
      selectedConstraintLabels[0]
    ]
      .filter(Boolean)
      .join(" · ") || "先建立你的决策基准";

  const previewChips = [
    ...selectedInterestLabels,
    ...selectedSchoolLabels,
    ...selectedNeedLabels,
    ...selectedConstraintLabels
  ].slice(0, 4);

  const networkNodes = useMemo(
    () => [
      { id: 1, left: "6%", top: "52%", size: "s" },
      { id: 2, left: "12%", top: "38%", size: "s" },
      { id: 3, left: "17%", top: "62%", size: "m" },
      { id: 4, left: "24%", top: "42%", size: "s" },
      { id: 5, left: "31%", top: "58%", size: "m" },
      { id: 6, left: "39%", top: "36%", size: "s" },
      { id: 7, left: "46%", top: "54%", size: "m" },
      { id: 8, left: "57%", top: "44%", size: "s" },
      { id: 9, left: "66%", top: "64%", size: "m" },
      { id: 10, left: "74%", top: "40%", size: "s" },
      { id: 11, left: "82%", top: "56%", size: "m" },
      { id: 12, left: "91%", top: "34%", size: "s" }
    ],
    []
  );

  function handlePointerMove(event) {
    if (prefersReducedMotion || !shellRef.current) {
      return;
    }

    const rect = shellRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    shellRef.current.style.setProperty("--navigation-pointer-x", x.toFixed(3));
    shellRef.current.style.setProperty("--navigation-pointer-y", y.toFixed(3));
  }

  function handlePointerLeave() {
    if (!shellRef.current) {
      return;
    }

    shellRef.current.style.setProperty("--navigation-pointer-x", "0");
    shellRef.current.style.setProperty("--navigation-pointer-y", "0");
  }

  return (
    <div
      ref={shellRef}
      className="navigation-shell brand-shell"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <motion.header
        className="navigation-hero"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealUp}
        transition={transitionGentle}
      >
        <div className="navigation-hero-topline">
          <span className="navigation-hero-kicker">Navigation</span>
          <span className="navigation-hero-dot" />
        </div>

        <NetworkField nodes={networkNodes} />

        <h1 className="navigation-hero-title">
          先把你放在正确的坐标里，<em>AI</em> 将为你规划更优路径。
        </h1>
        <p className="navigation-hero-subtitle">
          这一页只建立画像。完成之后，再进入正式的志愿决策空间。
        </p>

        {topAccessory ? <div className="navigation-hero-actions">{topAccessory}</div> : null}

        <div className="navigation-current-capsule premium-glass">
          <span className="navigation-current-label">Current Setup</span>
          <strong>{narrativeSummary}</strong>
          <p>接受省外 · {currentRiskOption.label}</p>
        </div>
      </motion.header>

      <motion.main
        className="navigation-main"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={{ ...transitionGentle, delay: 0.08 }}
      >
        <section className="navigation-decision-stage premium-glass">
          <div className="navigation-ribbon" aria-hidden="true">
            {["Candidate", "Base Data", "Preference", "Risk Model", "Output Preview"].map(
              (item, index, array) => (
                <div key={item} className="navigation-ribbon-segment">
                  <span>{item}</span>
                  {index < array.length - 1 ? <i /> : null}
                </div>
              )
            )}
          </div>

          <div className="navigation-decision-grid">
            <CandidateOrbCard
              formState={formState}
              candidateLabel={candidateLabel}
              narrativeSummary={narrativeSummary}
              previewChips={previewChips}
            />
            <BaseDataPanel formState={formState} updateField={updateField} />
            <PreferenceCloud formState={formState} toggleSelection={toggleSelection} />
            <RiskTiltCards formState={formState} updateField={updateField} />
            <OutputPathPreview
              currentRiskOption={currentRiskOption}
              preferredCity={formState.preferredCities}
              selectedInterestLabels={selectedInterestLabels}
              selectedSchoolLabels={selectedSchoolLabels}
            />
          </div>

          <ContinueDock
            canGeneratePlan={canGeneratePlan}
            error={error}
            guestMode={guestMode}
            loading={loading}
            mandatoryCheck={mandatoryCheck}
            onContinue={onContinue}
          />
        </section>

        <AIFloatingStudio
          currentRiskOption={currentRiskOption}
          selectedInterestLabels={selectedInterestLabels}
        />
      </motion.main>
    </div>
  );
}
