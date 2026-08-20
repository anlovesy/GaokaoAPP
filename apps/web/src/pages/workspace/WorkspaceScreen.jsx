import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  revealSoft,
  revealUp,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/workspace.css";
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
import { canAccessAdminWorkspace } from "../../app/rbac.js";
import {
  formatDateTime,
  formatTuitionText,
  formatUserRole
} from "../../app/utils.js";
import { buildUniversityGallery } from "../../app/universityUtils.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";
import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";
import { getUniversityProfile, resolveUniversityImage } from "../../universityProfiles.js";

const WORKSPACE_STAGE_META = {
  plan: {
    eyebrow: "Live Workspace",
    title: "你的决策正在形成",
    description: "AI 正根据你的分数、位次与偏好，不断校准院校与专业排序。"
  },
  insights: {
    eyebrow: "Risk Lens",
    title: "先把风险看清",
    description: "把滑档概率、冷热差异与梯度取舍，放回同一条判断路径里。"
  },
  account: {
    eyebrow: "Profile Vault",
    title: "把记录沉淀下来",
    description: "保留画像、历史方案与协作权限，让后续判断始终连续。"
  }
};

export function StageEmpty({ title, subtitle, kicker = "Ready", children = null }) {
  return (
    <section className="workspace-empty-state">
      <div className="workspace-empty-orbit" aria-hidden="true">
        <span className="workspace-empty-orbit-ring workspace-empty-orbit-ring-a" />
        <span className="workspace-empty-orbit-ring workspace-empty-orbit-ring-b" />
        <span className="workspace-empty-orbit-core" />
      </div>
      <span className="brand-kicker">{kicker}</span>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <div className="workspace-empty-steps">
        <article>
          <strong>01</strong>
          <span>完善画像</span>
        </article>
        <article>
          <strong>02</strong>
          <span>生成方案</span>
        </article>
        <article>
          <strong>03</strong>
          <span>继续追问</span>
        </article>
      </div>
      {children}
    </section>
  );
}

export function SummaryRibbon({ items, className = "" }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`editorial-fact-grid ${className}`.trim()}
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.24 }}
      variants={prefersReducedMotion ? undefined : staggerDense}
    >
      {items.map((item) => (
        <motion.article
          key={item.label}
          variants={prefersReducedMotion ? undefined : staggerItem}
          whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
          transition={transitionGentle}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </motion.article>
      ))}
    </motion.div>
  );
}

export function PortraitSummary({
  currentRiskOption,
  mandatoryCheck,
  profileHighlights,
  province,
  rank,
  score,
  selectedConstraintLabels,
  selectedInterestLabels,
  selectedNeedLabels,
  selectedPersonalityLabels,
  selectedSchoolLabels,
  track
}) {
  const summarySentence =
    [
      profileHighlights[0],
      selectedInterestLabels[0],
      selectedNeedLabels[0],
      selectedConstraintLabels[0]
    ]
      .filter(Boolean)
      .join(" · ") || "先把主体结构放稳，再给未来留下更高层次的选择空间。";

  const strengths = [profileHighlights[0], profileHighlights[1], profileHighlights[2]]
    .filter(Boolean)
    .slice(0, 3);
  const preferences = [
    selectedInterestLabels[0],
    selectedNeedLabels[0],
    selectedSchoolLabels[0],
    selectedPersonalityLabels[0]
  ]
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="workspace-candidate-capsule">
      <div className="workspace-candidate-topline">
        <span className="brand-kicker">Candidate Capsule</span>
        <span className={`workspace-risk-pill risk-${currentRiskOption.value}`}>
          {currentRiskOption.label}
        </span>
      </div>

      <div className="workspace-candidate-avatar-wrap" aria-hidden="true">
        <span className="workspace-candidate-avatar-ring workspace-candidate-avatar-ring-a" />
        <span className="workspace-candidate-avatar-ring workspace-candidate-avatar-ring-b" />
        <div className="workspace-candidate-avatar-core">
          <strong>{score || "--"}</strong>
          <span>{track || "画像"}</span>
        </div>
      </div>

      <div className="workspace-candidate-identity">
        <h2>当前画像</h2>
        <p>{summarySentence}</p>
      </div>

      <div className="workspace-candidate-stats">
        <article>
          <span>省份</span>
          <strong>{province || "待补充"}</strong>
        </article>
        <article>
          <span>分数</span>
          <strong>{score ? `${score} 分` : "待补充"}</strong>
        </article>
        <article>
          <span>位次</span>
          <strong>{rank ? `${rank}` : "待补充"}</strong>
        </article>
      </div>

      <article className="workspace-candidate-quote">
        <span>Current Goal</span>
        <strong>
          {mandatoryCheck.ok
            ? "信息已经齐备，可以正式进入志愿排序与取舍。"
            : `还需补充：${mandatoryCheck.missing.join(" / ")}`}
        </strong>
      </article>

      <div className="workspace-candidate-cluster">
        <span className="brand-kicker">Key Strengths</span>
        <div className="workspace-candidate-list">
          {(strengths.length ? strengths : ["画像信息待补充"]).map((item) => (
            <article key={item}>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-candidate-cluster">
        <span className="brand-kicker">Decision Preference</span>
        <div className="editorial-chip-cloud">
          {(preferences.length ? preferences : ["先完善偏好条件"]).map((item) => (
            <span key={item} className="editorial-chip">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PlanPanel({
  decisionProfile,
  result,
  onOpenUniversityDetail,
  guestMode = false,
  canGeneratePlan = true,
  onAuthClick,
  compact = false
}) {
  const prefersReducedMotion = useReducedMotion();
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
        value: `${tiers.length || 0} 层`
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

  const flowNodes = useMemo(
    () => [
      {
        label: "分数",
        value: decisionProfile.score ? `${decisionProfile.score} 分` : "待补充"
      },
      {
        label: "位次",
        value: decisionProfile.rank ? `${decisionProfile.rank}` : "待补充"
      },
      {
        label: "偏好",
        value: decisionProfile.interest || "待补充"
      },
      {
        label: "城市",
        value: decisionProfile.city || "待补充"
      },
      {
        label: "AI",
        value: "分析中"
      },
      {
        label: "院校匹配",
        value: `${universityGallery.length || 0} 所`
      },
      {
        label: "最终方案",
        value: "持续收敛"
      }
    ],
    [decisionProfile, universityGallery.length]
  );

  const timelineEntries = useMemo(() => {
    if (!result) {
      return [];
    }

    return (result.applicationPlan || [])
      .flatMap((tier) =>
        (tier.schools || []).slice(0, 2).map((school) => {
          const galleryItem =
            universityGallery.find((item) => item.university === school.university) || null;

          return {
            ...school,
            image: galleryItem
              ? resolveUniversityImage(galleryItem, galleryItem.university)
              : resolveUniversityImage(school, school.university),
            tierClass: tier.tierClass || tier.tier,
            tierLabel: tier.tierLabel || tier.tier
          };
        })
      )
      .slice(0, 5);
  }, [result, universityGallery]);

  const confidenceScore = useMemo(() => {
    if (typeof result?.diagnosis?.coverageRate === "number") {
      return Math.round(result.diagnosis.coverageRate);
    }

    const values = timelineEntries
      .map((item) => Number(item.confidence || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!values.length) {
      return 82;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [result, timelineEntries]);

  const insightItems = useMemo(() => {
    const topDirections = result?.diagnosis?.topDirections || [];
    const strategy = result?.summary?.strategy;
    const firstAlert = result?.riskAlerts?.[0];

    return [
      {
        title: "匹配度最高的方向",
        description: topDirections[0] || strategy || "优先把主体结构放稳。"
      },
      {
        title: "城市与专业的取舍",
        description:
          result?.diagnosis?.adjustmentAdvice || "让城市偏好与专业强度在同一权重里判断。"
      },
      {
        title: "当前风险提示",
        description: firstAlert || "保持梯度分布，避免过度集中在同一波动区间。"
      }
    ];
  }, [result]);
  const insightHeadline =
    result?.summary?.overview || "你更适合把重心放在计算机、人工智能与软件工程。";
  const insightSupportingCopy =
    result?.summary?.strategy ||
    result?.summary?.careerAdvice ||
    "先按位次与院校梯度确定主体结构，再把城市偏好与专业确定性逐层往里收。";

  if (!result && guestMode && !canGeneratePlan) {
    return (
      <StageEmpty
        kicker="Guest Session"
        title="体验已完成"
        subtitle="游客模式已完成一次正式志愿方案体验。登录后可以继续排序、追问，并重新打开院校详情。"
      >
        <div className="workspace-empty-cta-row">
          <button className="primary-btn magnetic-btn" type="button" onClick={onAuthClick}>
            登录继续
          </button>
        </div>
      </StageEmpty>
    );
  }

  if (!result) {
    return <StageEmpty title="还没有生成方案" subtitle="先返回 Navigation 完成画像，再开始第一轮志愿判断。" />;
  }

  return (
    <div className="workspace-stage-stack">
      <motion.section
        className="workspace-stage-section workspace-decision-flow-panel"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <div className="workspace-stage-section-head">
          <div>
            <span className="brand-kicker">Decision Flow</span>
            <h3>从分数到院校，沿着同一条路径收敛判断。</h3>
          </div>
          <span className="workspace-stage-live-indicator">实时分析中</span>
        </div>

        <div className="workspace-decision-flow-line">
          {flowNodes.map((node, index) => (
            <article
              key={`${node.label}-${index}`}
              className={`workspace-flow-node ${node.label === "AI" ? "is-ai" : ""}`}
            >
              <div className="workspace-flow-node-orb" />
              <strong>{node.label}</strong>
              <span>{node.value}</span>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="workspace-stage-hero workspace-insight-board"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.18 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={{ ...transitionGentle, delay: 0.04 }}
      >
        <div className="workspace-insight-copy">
          <span className="brand-kicker">Today's Insight</span>
          <h3>{insightHeadline}</h3>
          <p className="workspace-insight-lead">{insightSupportingCopy}</p>

          <div className="workspace-insight-list">
            {insightItems.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="workspace-confidence-panel">
          <span className="brand-kicker">Confidence</span>
          <div
            className="workspace-confidence-ring"
            style={{
              "--confidence-angle": `${Math.max(18, Math.min(confidenceScore, 100)) * 3.6}deg`
            }}
          >
            <div className="workspace-confidence-core">
              <strong>{confidenceScore}</strong>
              <span>/100</span>
            </div>
          </div>
          <div className="workspace-confidence-copy">
            <strong>Extremely High</strong>
            <span>最后更新于 2 分钟前</span>
          </div>
          <SummaryRibbon items={tierMetrics} className="workspace-confidence-metrics" />
        </aside>
      </motion.section>

      <motion.section
        className="workspace-stage-section workspace-timeline-board"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={{ ...transitionGentle, delay: 0.06 }}
      >
        <div className="workspace-stage-section-head">
          <div>
            <span className="brand-kicker">Scheme Timeline</span>
            <h3>把冲、稳、保放回一条连续的志愿时间轴里。</h3>
          </div>
        </div>

        <div className="workspace-plan-timeline">
          {timelineEntries.map((school, index) => (
            <motion.button
              key={`${school.university}-${school.major}-${index}`}
              type="button"
              className={`workspace-plan-card ${school.tierClass} ${
                selectedUniversity === school.university ? "active" : ""
              }`}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              transition={transitionGentle}
              onMouseEnter={() => setSelectedUniversity(school.university)}
              onFocus={() => setSelectedUniversity(school.university)}
              onClick={() => {
                const nextUniversity =
                  universityGallery.find((item) => item.university === school.university) || null;

                if (nextUniversity) {
                  onOpenUniversityDetail(nextUniversity);
                }
              }}
            >
              <span className="workspace-plan-card-tier">{school.tierLabel}</span>
              <div className="workspace-plan-card-media">
                <img src={school.image} alt={school.university} loading="lazy" decoding="async" />
              </div>
              <div className="workspace-plan-card-copy">
                <strong>{school.university}</strong>
                <span>
                  {school.city || getUniversityProfile(school.university)?.city || "城市待补充"}
                </span>
                <p>{school.major}</p>
                {school.majorDetails?.[0]?.name ? (
                  <span className="workspace-plan-card-detail">
                    专业焦点 · {school.majorDetails[0].name}
                  </span>
                ) : null}
                <em>录取概率 {school.confidence || "--"}%</em>
                <span className="workspace-plan-card-fee">
                  {formatTuitionText(school.tuition)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {!compact && activeUniversity ? (
        <>
          <motion.section
            className="workspace-focus-school"
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView={prefersReducedMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.22 }}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <div className="workspace-focus-media">
              <img src={activeUniversityImage} alt={activeUniversity.university} loading="lazy" decoding="async" />
            </div>
            <div className="workspace-focus-copy">
              <span className="brand-kicker">Current Focus</span>
              <h4>{activeUniversity.university}</h4>
              <p>
                {activeSchool?.reason ||
                  activeUniversity.heroMajor ||
                  activeUniversity.profile.label}
              </p>
              <div className="workspace-focus-meta">
                <span>{activeSchool?.city || activeUniversity.city || activeUniversity.profile.city}</span>
                <span>{activeSchool?.major || "推荐专业待补充"}</span>
                <span>{formatTuitionText(activeSchool?.tuition)}</span>
              </div>
              {activeSchool?.majorDetails?.length ? (
                <div className="workspace-insight-list university-insight-list">
                  {activeSchool.majorDetails.slice(0, 2).map((detail) => (
                    <article key={`${activeUniversity.university}-${detail.name}`}>
                      <strong>{detail.name}</strong>
                      <p>{detail.recommendationReason}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              <button
                className="text-link-btn"
                type="button"
                onClick={() => onOpenUniversityDetail(activeUniversity)}
              >
                打开院校详情
              </button>
            </div>
          </motion.section>

          <UniversityDetailPanel
            university={activeUniversity}
            onOpenStandalone={onOpenUniversityDetail}
          />
        </>
      ) : null}
    </div>
  );
}

export function InsightsPanel({ result, tradeoffPanel }) {
  const prefersReducedMotion = useReducedMotion();
  const insightMetrics = [
    {
      label: "冲",
      value: result?.diagnosis?.riskProfile?.rushCount || 0
    },
    {
      label: "稳",
      value: result?.diagnosis?.riskProfile?.steadyCount || 0
    },
    {
      label: "保",
      value: result?.diagnosis?.riskProfile?.safeCount || 0
    }
  ];

  if (!result) {
    return <StageEmpty title="还没有生成洞察" subtitle="先生成一版方案，再看风险与机会提醒。" />;
  }

  return (
    <div className="workspace-stage-stack">
      <motion.section
        className="workspace-stage-hero"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <span className="brand-kicker">Coverage</span>
        <h3>{result.diagnosis?.coverageRate || "--"}%</h3>
        <p>{result.summary?.careerAdvice || "围绕风险与机会继续做取舍。"}</p>
        <SummaryRibbon items={insightMetrics} />
      </motion.section>

      <motion.section
        className="workspace-stage-section"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.24 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <div className="editorial-list-grid">
          <article>
            <span>优先方向</span>
            <strong>{result.diagnosis?.topDirections?.join(" / ") || "待补充"}</strong>
          </article>
          <article>
            <span>调整建议</span>
            <strong>{result.diagnosis?.adjustmentAdvice || "待补充"}</strong>
          </article>
        </div>
      </motion.section>

      {result.riskAlerts?.length ? (
        <motion.section
          className="workspace-stage-section"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.22 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={{ ...transitionGentle, delay: 0.03 }}
        >
          <div className="editorial-history-list">
            {result.riskAlerts.map((item) => (
              <article key={item} className="editorial-highlight-block">
                <span>Alert</span>
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </motion.section>
      ) : null}

      {tradeoffPanel ? (
        <motion.section
          className="workspace-stage-section"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.22 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={{ ...transitionGentle, delay: 0.04 }}
        >
          <article className="editorial-highlight-block large">
            <span>Next Step</span>
            <strong>{tradeoffPanel.title}</strong>
            <p>{tradeoffPanel.description}</p>
            <div className="editorial-history-list">
              {(tradeoffPanel.nextSteps || []).map((item) => (
                <article key={item} className="editorial-highlight-block">
                  <span>Step</span>
                  <strong>{item}</strong>
                </article>
              ))}
            </div>
          </article>
        </motion.section>
      ) : null}
    </div>
  );
}

export function AccountPanel({
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
  const prefersReducedMotion = useReducedMotion();
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
    <div className="workspace-stage-stack">
      <motion.section
        className="workspace-stage-hero"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <span className="brand-kicker">Account</span>
        <h3>{authToken ? currentUser?.username || "当前账户" : "游客模式"}</h3>
        <p>{authToken ? formatUserRole(currentUser?.role) : "登录后可保留历史方案与连续对话记录。"}</p>
        <SummaryRibbon items={accountMetrics} />
      </motion.section>

      <motion.section
        className="workspace-stage-section"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.24 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <div className="editorial-list-grid">
          <article>
            <span>兴趣</span>
            <strong>{selectedInterestLabels.join(" / ") || "待补充"}</strong>
          </article>
          <article>
            <span>性格</span>
            <strong>{selectedPersonalityLabels.join(" / ") || "待补充"}</strong>
          </article>
          <article>
            <span>院校偏好</span>
            <strong>{selectedSchoolLabels.join(" / ") || "待补充"}</strong>
          </article>
          <article>
            <span>专业策略</span>
            <strong>{selectedNeedLabels.join(" / ") || "待补充"}</strong>
          </article>
          <article>
            <span>现实约束</span>
            <strong>{selectedConstraintLabels.join(" / ") || "待补充"}</strong>
          </article>
        </div>
      </motion.section>

      <motion.section
        className="workspace-stage-section"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.24 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={{ ...transitionGentle, delay: 0.03 }}
      >
        <div className="editorial-history-list">
          {historyPlans.slice(0, 4).map((item) => (
            <article key={item.id} className="editorial-history-row">
              <span>{formatDateTime(item.createdAt)}</span>
              <strong>{item.province}</strong>
              <p>
                {item.score} 分 / {item.rank} 位
              </p>
            </article>
          ))}
          {!historyPlans.length ? (
            <article className="editorial-history-row">
              <span>History</span>
              <strong>还没有历史方案</strong>
            </article>
          ) : null}
        </div>
      </motion.section>

      {canAccessAdminWorkspace(currentUser) ? (
        <motion.section
          className="workspace-stage-section"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.16 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={{ ...transitionGentle, delay: 0.04 }}
        >
          <div className="editorial-admin-grid">
            <form className="editorial-admin-form" onSubmit={handleCreateUser}>
              <span className="brand-kicker">New User</span>
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
        </motion.section>
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
  const prefersReducedMotion = useReducedMotion();
  const plannerFormRef = useRef(null);
  const portraitSectionRef = useRef(null);
  const chatScrollRef = useRef(null);

  const modelLabel =
    providers.find((item) => item.id === formState.aiProvider)?.label ||
    (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider);

  const activeTabMeta = WORKSPACE_STAGE_META[workspaceTab] || WORKSPACE_STAGE_META.plan;
  const activeTabLabel =
    WORKSPACE_TABS.find((item) => item.value === workspaceTab)?.label || "当前工作台";

  const decisionProfile = useMemo(
    () => ({
      score: formState.score,
      rank: formState.rank,
      city: formState.preferredCities?.split(/[、,/]/).map((item) => item.trim()).filter(Boolean)[0],
      interest: selectedInterestLabels[0]
    }),
    [formState.preferredCities, formState.rank, formState.score, selectedInterestLabels]
  );

  const advisorSuggestion =
    result?.summary?.strategy ||
    result?.summary?.careerAdvice ||
    "先保证主体结构稳住，再把上探空间留给更有把握的院校。";

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
        className="workspace-minimal-head premium-glass"
        initial="hidden"
        animate="visible"
        variants={revealUp}
        transition={transitionGentle}
      >
        <div>
          <span className="brand-kicker">Live Workspace</span>
          <h1>志愿工作台</h1>
          <p>把画像、方案与顾问判断，放进同一条连续的决策路径里。</p>
        </div>

        <div className="workspace-head-actions">
          <article className="workspace-head-pill editorial-highlight-block">
            <span>Session</span>
            <strong>{modelLabel}</strong>
            <p>
              {chatEnabled
                ? `当前身份：${currentUser?.username || "已登录用户"}`
                : guestMode
                  ? "当前身份：游客体验"
                  : "当前身份：未登录"}
            </p>
          </article>

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
          <div ref={portraitSectionRef}>
            <PortraitSummary
              currentRiskOption={currentRiskOption}
              mandatoryCheck={mandatoryCheck}
              profileHighlights={profileHighlights}
              province={formState.province}
              rank={formState.rank}
              score={formState.score}
              selectedConstraintLabels={selectedConstraintLabels}
              selectedInterestLabels={selectedInterestLabels}
              selectedNeedLabels={selectedNeedLabels}
              selectedPersonalityLabels={selectedPersonalityLabels}
              selectedSchoolLabels={selectedSchoolLabels}
              track={formState.track}
            />
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
          className="workspace-decision-stage"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.58, delay: 0.14 }}
        >
          <motion.div
            className="workspace-stage-headline"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : staggerDense}
          >
            <div className="workspace-stage-cosmos" aria-hidden="true">
              <span className="workspace-stage-orb" />
              <span className="workspace-stage-ring workspace-stage-ring-a" />
              <span className="workspace-stage-ring workspace-stage-ring-b" />
              <span className="workspace-stage-dot workspace-stage-dot-a" />
              <span className="workspace-stage-dot workspace-stage-dot-b" />
              <span className="workspace-stage-dot workspace-stage-dot-c" />
            </div>
            <span className="brand-kicker">{activeTabMeta.eyebrow}</span>
            <h2>{activeTabMeta.title}</h2>
            <p>{activeTabMeta.description}</p>
          </motion.div>

          <motion.div
            className="workspace-tabline"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : staggerDense}
          >
            {WORKSPACE_TABS.map((item) => (
              <motion.button
                key={item.value}
                type="button"
                className={`workspace-tab ${workspaceTab === item.value ? "active" : ""}`}
                variants={prefersReducedMotion ? undefined : staggerItem}
                whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                transition={transitionGentle}
                onClick={() => setWorkspaceTab(item.value)}
              >
                {item.label}
              </motion.button>
            ))}
            <span className="workspace-risk-pill">{activeTabLabel}</span>
          </motion.div>

          {workspaceTab === "plan" ? (
            <PlanPanel
              canGeneratePlan={canGeneratePlan}
              decisionProfile={decisionProfile}
              guestMode={guestMode}
              onAuthClick={goToAuth}
              result={result}
              onOpenUniversityDetail={openUniversityDetail}
            />
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
          <div className="workspace-advisor-orbit" aria-hidden="true">
            <span className="workspace-advisor-orb-core" />
            <span className="workspace-advisor-orb-ring workspace-advisor-orb-ring-a" />
            <span className="workspace-advisor-orb-ring workspace-advisor-orb-ring-b" />
            <span className="workspace-advisor-orb-particle workspace-advisor-orb-particle-a" />
            <span className="workspace-advisor-orb-particle workspace-advisor-orb-particle-b" />
          </div>

          <div className="workspace-advisor-head">
            <div>
              <span className="brand-kicker">AI Advisor</span>
              <h2>Advisor Studio</h2>
            </div>
            <button className="text-link-btn" type="button" onClick={openAdvisorPanel}>
              全屏打开
            </button>
          </div>

          <article className="editorial-highlight-block large workspace-advisor-lens">
            <span>Current Lens</span>
            <strong>{advisorConfig.shortLabel}</strong>
            <p>{modelLabel}</p>
          </article>

          <article className="workspace-advisor-focus-card">
            <span className="brand-kicker">Current Suggestion</span>
            <strong>{advisorSuggestion}</strong>
            <p>{hasPlanningContext ? "当前方案上下文已连接，AI 会持续沿用你的判断路径。" : "建议先附上当前方案，再继续追问院校与专业取舍。"}</p>
          </article>

          <div className="workspace-advisor-prompts">
            <span className="brand-kicker">Recommended Questions</span>
            <div className="editorial-chip-cloud workspace-advisor-prompt-list">
              {activeQuickQuestions.slice(0, 3).map((item) => (
                <motion.button
                  key={item}
                  type="button"
                  className="editorial-chip prompt-chip"
                  whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  transition={transitionGentle}
                  onClick={() => handleSendChat(item)}
                  disabled={chatLoading || !chatEnabled}
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </div>

          <button
            className="text-link-btn workspace-advisor-context-link"
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
                chatEnabled ? "继续追问学校、专业、城市与风险" : "登录后继续完整对话"
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
