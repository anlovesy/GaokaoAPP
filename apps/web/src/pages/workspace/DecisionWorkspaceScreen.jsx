import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  revealSoft,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import { buildUniversityGallery } from "../../app/universityUtils.js";
import { getUniversityProfile, resolveUniversityImage } from "../../universityProfiles.js";
import "../../styles/pages/decision-workspace.css";

const FALLBACK_QUESTIONS = [
  "哪些专业在未来 5 年就业会更稳？",
  "如果优先保城市，哪些学校值得前置？",
  "广东省内还有哪些计算机方向值得看？",
  "现在这套冲稳保里，最容易出问题的是哪一层？"
];

const JOURNEY_ICON_MAP = {
  Score: "S",
  Rank: "R",
  Interest: "I",
  City: "C",
  University: "U",
  Result: "A"
};

function WorkspaceEmptyState({ guestMode, canGeneratePlan, onAuthClick, onRefreshPlan }) {
  const title =
    guestMode && !canGeneratePlan
      ? "体验版方案已经生成完成"
      : "AI Decision Workspace 正在等待第一轮推演";
  const description =
    guestMode && !canGeneratePlan
      ? "登录后可以继续追问、保存版本，并把当前方案继续推进到正式工作流里。"
      : "先在 Navigation 完成画像设定，AI 会基于分数、位次、城市与专业偏好生成第一版志愿路径。";

  return (
    <section className="decision-empty-card decision-panel-surface">
      <div className="decision-empty-orb" aria-hidden="true">
        <span className="decision-empty-ring decision-empty-ring-a" />
        <span className="decision-empty-ring decision-empty-ring-b" />
        <span className="decision-empty-core" />
      </div>

      <span className="decision-eyebrow">{guestMode ? "Guest Session" : "Workspace Ready"}</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <button
        className="decision-primary-button"
        type="button"
        onClick={guestMode && !canGeneratePlan ? onAuthClick : onRefreshPlan}
      >
        {guestMode && !canGeneratePlan ? "登录继续" : "开始分析"}
      </button>
    </section>
  );
}

function WorkspaceUtilityEmpty({ title, description, actionLabel, onAction }) {
  return (
    <section className="decision-utility-empty decision-panel-surface">
      <h3>{title}</h3>
      <p>{description}</p>
      {onAction ? (
        <button className="decision-primary-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function buildProfileReading({
  currentRiskOption,
  decisionProfile,
  selectedInterestLabels,
  selectedNeedLabels
}) {
  const interest = selectedInterestLabels?.[0] || "技术方向";
  const need = selectedNeedLabels?.[0] || "长期确定性";
  const risk = currentRiskOption?.label || "均衡推进";
  const city = decisionProfile.city || "目标城市";

  return `${interest} + ${need}，适合以「${risk}」节奏围绕 ${city} 形成志愿顺序。`;
}

function buildInsightHeadline(result) {
  const directions = result?.diagnosis?.topDirections?.slice(0, 3) || [];
  if (directions.length) {
    return `优先围绕 ${directions.join("、")} 建立主志愿轴。`;
  }

  return (
    result?.summary?.overview ||
    "先稳住主体结构，再把上探空间留给更有把握的学校与专业。"
  );
}

function compactSupportingCopy(result) {
  const source = result?.summary?.strategy || result?.summary?.careerAdvice || "";
  const firstSentence = source
    .split(/[。！？]/)
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return firstSentence
    ? `${firstSentence}。`
    : "AI 正在把分数确定性、城市偏好与专业接受度重新排在同一条判断链里。";
}

function buildTimelineEntries(result, universityGallery) {
  if (!result) {
    return [];
  }

  const seenUniversities = new Set();
  const collected = [];

  const appendSchool = (school, tier) => {
    if (!school?.university || seenUniversities.has(school.university)) {
      return;
    }

    const galleryItem =
      universityGallery.find((item) => item.university === school.university) || null;
    const profile = getUniversityProfile(school.university);

    seenUniversities.add(school.university);
    collected.push({
      ...school,
      image: galleryItem
        ? resolveUniversityImage(galleryItem, galleryItem.university)
        : resolveUniversityImage(school, school.university),
      tierClass: tier?.tierClass || school.tierClass || tier?.tier || school.tier || "steady",
      tierLabel: tier?.tierLabel || school.tierLabel || tier?.tier || school.tier || "推荐志愿",
      city: school.city || galleryItem?.city || profile?.city || "城市待确认"
    });
  };

  (result.applicationPlan || []).forEach((tier) => {
    (tier.schools || []).forEach((school) => appendSchool(school, tier));
  });

  (result.backupOptions || []).forEach((school) => appendSchool(school, null));

  return collected.slice(0, 10);
}

function buildInsightItems(result) {
  const topDirections = result?.diagnosis?.topDirections || [];
  const strategy = result?.summary?.strategy;
  const firstAlert = result?.riskAlerts?.[0];
  const adjustmentAdvice = result?.diagnosis?.adjustmentAdvice;
  const careerAdvice = result?.summary?.careerAdvice;

  return [
    {
      title: "最佳方向",
      caption: "Best Direction",
      description:
        topDirections[0] ||
        strategy ||
        "主轴先围绕确定性更高的专业簇建立，避免方案被单点偏好带偏。"
    },
    {
      title: "城市建议",
      caption: "City Strategy",
      description:
        adjustmentAdvice ||
        "以核心城市为锚点，保留相邻城市的同层级院校作为弹性空间。"
    },
    {
      title: "风险提醒",
      caption: "Risk Alert",
      description:
        firstAlert || "保持冲、稳、保的节奏分布，确保录取成功率与上探机会同时存在。"
    },
    {
      title: "就业趋势",
      caption: "Career Signal",
      description:
        careerAdvice || "优先把专业的长期就业稳定性纳入排序，而不是只看短期热度。"
    }
  ];
}

function getConfidenceScore(result, timelineEntries) {
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
}

function getRiskSummary(currentRiskOption, tradeoffPanel) {
  return (
    currentRiskOption?.description ||
    tradeoffPanel?.description ||
    tradeoffPanel?.title ||
    "以稳为骨架，给冲刺学校保留空间，同时确保保底层足够扎实。"
  );
}

function buildUniversityReason(school, result) {
  const raw =
    school.reason ||
    result?.summary?.strategy ||
    result?.summary?.overview ||
    "更符合当前位次、风险偏好与专业目标的综合判断。";

  const firstSentence = raw
    .split(/[。！？]/)
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return firstSentence ? `${firstSentence}。` : raw;
}

function buildSchoolSummary(school) {
  const profile = getUniversityProfile(school.university);
  return {
    level: profile?.level || "建议人工复核",
    label: profile?.label || "高校档案待补全",
    majors: profile?.keyMajors?.slice(0, 3).join(" / ") || school.major || "专业方向待补充",
    fit:
      profile?.suitableFor?.[0] ||
      "适合继续结合位次、专业接受度与城市诉求做人工复核。"
  };
}

function groupMajors(majorLibrary) {
  return majorLibrary
    .map((item) => ({
      ...item,
      summary: buildSchoolSummary(item)
    }))
    .slice(0, 9);
}

function buildCompareGroups(result, universityGallery) {
  return (result?.applicationPlan || []).map((tier) => {
    const schools = tier.schools || [];
    const values = schools
      .map((item) => Number(item.confidence || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const focusSchool = schools[0];
    const galleryTarget =
      universityGallery.find((item) => item.university === focusSchool?.university) || focusSchool;

    return {
      key: tier.tier || tier.tierLabel,
      tierLabel: tier.tierLabel || tier.tier || "推荐层",
      tierClass: tier.tierClass || tier.tier || "steady",
      schoolCount: schools.length,
      focusSchool: galleryTarget,
      sampleSchools: schools.slice(0, 3).map((item) => item.university),
      confidence:
        values.length > 0
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : null
    };
  });
}

function mergeUniversityDisplayRecord(primaryRecord, galleryRecord) {
  const seed = primaryRecord || galleryRecord || null;

  if (!seed) {
    return null;
  }

  const profile = getUniversityProfile(seed.university);

  return {
    ...(galleryRecord || {}),
    ...(primaryRecord || {}),
    university: primaryRecord?.university || galleryRecord?.university || seed.university,
    major: primaryRecord?.major || galleryRecord?.major || "专业待确认",
    tierClass: primaryRecord?.tierClass || galleryRecord?.tierClass || "steady",
    tierLabel: primaryRecord?.tierLabel || galleryRecord?.tierLabel || "推荐志愿",
    confidence:
      primaryRecord?.confidence ??
      galleryRecord?.confidence ??
      galleryRecord?.bestConfidence ??
      null,
    city: primaryRecord?.city || galleryRecord?.city || profile?.city || "城市待确认",
    image:
      primaryRecord?.image ||
      galleryRecord?.image ||
      resolveUniversityImage(galleryRecord || primaryRecord, seed.university)
  };
}

function DecisionOrb({ compact = false }) {
  return (
    <div className={compact ? "decision-orb compact" : "decision-orb"} aria-hidden="true">
      <span className="decision-orb-field decision-orb-field-a" />
      <span className="decision-orb-field decision-orb-field-b" />
      <span className="decision-orb-field decision-orb-field-c" />
      <span className="decision-orb-core" />
      <span className="decision-orb-line decision-orb-line-a" />
      <span className="decision-orb-line decision-orb-line-b" />
      <span className="decision-orb-particle decision-orb-particle-a" />
      <span className="decision-orb-particle decision-orb-particle-b" />
      <span className="decision-orb-particle decision-orb-particle-c" />
    </div>
  );
}

function SchoolImageFrame({ image, alt, title, className }) {
  const initials = (title || "AI").slice(0, 2).toUpperCase();

  return (
    <div className={className} data-empty={image ? "false" : "true"}>
      {image ? (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.parentElement?.setAttribute("data-empty", "true");
          }}
        />
      ) : null}
      <span className="decision-media-fallback" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

function FoldSection({ title, label, action, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`decision-fold ${open ? "is-open" : ""}`}>
      <header className="decision-fold-head">
        <button type="button" className="decision-fold-toggle" onClick={() => setOpen((value) => !value)}>
          <span className="decision-fold-label">{label}</span>
          <strong>{title}</strong>
        </button>
        {action ? <div className="decision-fold-action">{action}</div> : null}
      </header>
      {open ? <div className="decision-fold-body">{children}</div> : null}
    </section>
  );
}

function UniversityShelfCard({ school, result, onOpenUniversityDetail, whileHover, whileTap }) {
  return (
    <motion.button
      type="button"
      className={`decision-shelf-card tier-${school.tierClass || "steady"}`}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transitionGentle}
      onClick={() => onOpenUniversityDetail(school)}
    >
      <span className="decision-probability-badge">
        {school.tierLabel} · {school.confidence || "--"}%
      </span>
      <SchoolImageFrame
        image={school.image}
        alt={school.university}
        title={school.university}
        className="decision-shelf-media"
      />
      <div className="decision-shelf-copy">
        <strong>{school.university}</strong>
        <p>{school.major}</p>
        <span>{school.city}</span>
        <em>{buildUniversityReason(school, result)}</em>
      </div>
      <i aria-hidden="true">{"->"}</i>
    </motion.button>
  );
}

export function DecisionWorkspaceScreen({
  activeQuickQuestions,
  advisorConfig,
  canGeneratePlan,
  currentRiskOption,
  currentUser,
  decisionProfile,
  guestMode,
  modelLabel,
  onAuthClick,
  onEditProfile,
  onOpenAdvisor,
  onOpenHistory,
  onOpenUniversityDetail,
  onPrintPlan,
  onRefreshPlan,
  profileHighlights,
  result,
  selectedInterestLabels,
  selectedNeedLabels,
  selectedSchoolLabels,
  topAccessory,
  tradeoffPanel
}) {
  const [workspaceView, setWorkspaceView] = useState("workspace");
  const prefersReducedMotion = useReducedMotion();
  const universityGallery = useMemo(() => buildUniversityGallery(result), [result]);
  const timelineEntries = useMemo(
    () => buildTimelineEntries(result, universityGallery),
    [result, universityGallery]
  );
  const insightItems = useMemo(() => buildInsightItems(result), [result]);
  const confidenceScore = useMemo(
    () => getConfidenceScore(result, timelineEntries),
    [result, timelineEntries]
  );
  const quickQuestions = (
    activeQuickQuestions?.length ? activeQuickQuestions : FALLBACK_QUESTIONS
  ).slice(0, 4);
  const profileReading = buildProfileReading({
    currentRiskOption,
    decisionProfile,
    selectedInterestLabels,
    selectedNeedLabels
  });
  const insightHeadline = buildInsightHeadline(result);
  const insightSupportingCopy = compactSupportingCopy(result);
  const advisorSuggestion =
    tradeoffPanel?.title ||
    result?.summary?.strategy ||
    result?.summary?.careerAdvice ||
    "先稳住主体结构，再判断哪些学校值得继续上探。";
  const advisorModel = guestMode ? "Guest" : advisorConfig?.shortLabel || modelLabel || "ZHIXU";
  const hasResult = Boolean(result?.applicationPlan?.length);

  const candidateFacts = [
    { label: "Profile", value: profileReading },
    { label: "Score", value: decisionProfile.score ? `${decisionProfile.score} 分` : "--" },
    { label: "Rank", value: decisionProfile.rank ? `${decisionProfile.rank} 位` : "--" },
    { label: "Province", value: decisionProfile.province || "待补全" },
    { label: "Subject", value: decisionProfile.track ? `${decisionProfile.track}类` : "待补全" },
    {
      label: "Preference",
      value:
        [selectedInterestLabels?.[0], selectedNeedLabels?.[0], currentRiskOption?.label]
          .filter(Boolean)
          .join(" · ") || "待补全"
    }
  ];

  const profileTags = [
    selectedInterestLabels?.[0],
    selectedNeedLabels?.[0],
    selectedSchoolLabels?.[0],
    ...(profileHighlights || [])
  ]
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 4);

  const progressItems = [
    {
      label: "AI Progress",
      value: `${confidenceScore}%`,
      note: hasResult ? "第一轮排序已形成" : "等待首版方案"
    },
    {
      label: "Schools",
      value: String(timelineEntries.length).padStart(2, "0"),
      note: "已进入决策货架"
    },
    {
      label: "Mode",
      value: guestMode ? "Guest" : "Live",
      note: "当前工作台状态"
    }
  ];

  const journeyNodes = [
    {
      label: "Score",
      title: "分数",
      value: decisionProfile.score ? `${decisionProfile.score} 分` : "待补全"
    },
    {
      label: "Rank",
      title: "位次",
      value: decisionProfile.rank ? `${decisionProfile.rank} 位` : "待补全"
    },
    {
      label: "Interest",
      title: "兴趣",
      value: selectedInterestLabels?.[0] || "待选择"
    },
    {
      label: "City",
      title: "城市",
      value: decisionProfile.city || "待选择"
    },
    {
      label: "University",
      title: "院校",
      value: timelineEntries[0]?.university || "等待生成"
    },
    {
      label: "Result",
      title: "AI Result",
      value: hasResult ? "决策已成形" : "等待生成"
    }
  ];

  const compareGroups = useMemo(
    () =>
      buildCompareGroups(result, universityGallery).map((group) => ({
        ...group,
        focusSchool: mergeUniversityDisplayRecord(
          group.focusSchool,
          universityGallery.find((item) => item.university === group.focusSchool?.university) || null
        )
      })),
    [result, universityGallery]
  );

  const majorLibrary = useMemo(() => {
    const seen = new Set();
    return timelineEntries
      .map((item) => ({
        major: item.major || "专业待确认",
        university: item.university,
        city: item.city,
        confidence: item.confidence,
        tierLabel: item.tierLabel,
        tierClass: item.tierClass
      }))
      .filter((item) => {
        const key = `${item.major}-${item.university}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [timelineEntries]);

  const groupedMajors = useMemo(() => groupMajors(majorLibrary), [majorLibrary]);
  const featuredUniversity = useMemo(() => {
    const primary = timelineEntries[0] || null;
    const galleryMatch =
      universityGallery.find((item) => item.university === primary?.university) ||
      universityGallery[0] ||
      null;

    return mergeUniversityDisplayRecord(primary, galleryMatch);
  }, [timelineEntries, universityGallery]);
  const featuredSummary = featuredUniversity ? buildSchoolSummary(featuredUniversity) : null;

  const viewOptions = [
    { value: "workspace", label: "工作台", meta: "Live Canvas" },
    { value: "compare", label: "方案对比", meta: "Compare Tiers" },
    { value: "university", label: "院校库", meta: "University Shelf" },
    { value: "major", label: "专业库", meta: "Major Signals" }
  ];

  function handleWorkspaceViewChange(nextView) {
    setWorkspaceView(nextView);
  }

  function openUniversityTarget(target) {
    if (!target) {
      return;
    }
    onOpenUniversityDetail(target);
  }

  function renderDecisionJourney() {
    return (
      <motion.section
        className="decision-journey-section decision-panel-surface"
        variants={staggerItem}
      >
        <div className="decision-section-head">
          <div>
            <span className="decision-label">Decision Journey</span>
            <h3>AI 正沿着同一条判断路径收敛决策</h3>
          </div>
          <span className="decision-status-pill">Live Updating</span>
        </div>

        <div className="decision-journey-track">
          {journeyNodes.map((node, index) => (
            <article key={node.label} className={index === journeyNodes.length - 1 ? "is-current" : ""}>
              <div className="decision-journey-node">
                <span>{JOURNEY_ICON_MAP[node.label]}</span>
              </div>
              <strong>{node.title}</strong>
              <em>{node.value}</em>
            </article>
          ))}
        </div>
      </motion.section>
    );
  }

  function renderInsightCards() {
    return (
      <motion.section className="decision-insights-section" variants={staggerItem}>
        <div className="decision-insights-copy decision-panel-surface">
          <div className="decision-section-head">
            <div>
              <span className="decision-label">AI Insight</span>
              <h3>{insightHeadline}</h3>
            </div>
            <aside className="decision-confidence-chip">
              <span>Confidence</span>
              <strong>{confidenceScore}</strong>
            </aside>
          </div>
          <p>{insightSupportingCopy}</p>
        </div>

        <div className="decision-insight-grid">
          {insightItems.map((item, index) => (
            <motion.article
              key={item.title}
              className="decision-insight-card decision-panel-surface"
              whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
              transition={transitionGentle}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <em>{item.caption}</em>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>
    );
  }

  function renderUniversityShelf() {
    return (
      <motion.section className="decision-shelf-section decision-panel-surface" variants={staggerItem}>
        <div className="decision-section-head">
          <div>
            <span className="decision-label">University Shelf</span>
            <h3>把志愿方案放进同一条横向决策货架中浏览</h3>
          </div>
          <div className="decision-shelf-actions">
            <button type="button" onClick={() => handleWorkspaceViewChange("compare")}>
              方案对比
            </button>
            <button type="button" onClick={() => handleWorkspaceViewChange("university")}>
              打开院校库
            </button>
          </div>
        </div>

        <div className="decision-shelf-row">
          {timelineEntries.slice(0, 5).map((school, index) => {
            const target = mergeUniversityDisplayRecord(
              school,
              universityGallery.find((item) => item.university === school.university) || null
            );

            return (
              <UniversityShelfCard
                key={`${school.university}-${school.major}-${index}`}
                school={target}
                result={result}
                onOpenUniversityDetail={onOpenUniversityDetail}
                whileHover={prefersReducedMotion ? undefined : { y: -8, scale: 1.015 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              />
            );
          })}
        </div>
      </motion.section>
    );
  }

  function renderCompareView() {
    return (
      <div className="decision-content-stack">
        <section className="decision-utility-board decision-panel-surface">
          <div className="decision-section-head">
            <div>
              <span className="decision-label">Compare</span>
              <h3>冲稳保三层已经形成可读的判断结构</h3>
            </div>
            <span className="decision-status-pill">Decision Matrix</span>
          </div>

          <div className="decision-compare-grid">
            {compareGroups.map((group) => (
              <article
                key={group.key}
                className={`decision-compare-card tier-${group.tierClass || "steady"} ${group.schoolCount ? "" : "is-empty"}`.trim()}
              >
                <div className="decision-compare-head">
                  <span>{group.tierLabel}</span>
                  <strong>{group.schoolCount ? `${String(group.schoolCount).padStart(2, "0")} 所` : "待补齐"}</strong>
                </div>
                <p>
                  {group.sampleSchools.length
                    ? group.sampleSchools.join(" · ")
                    : "等待 AI 补充候选学校"}
                </p>
                <div className="decision-compare-foot">
                  <div>
                    <em>平均录取把握</em>
                    <b>{group.confidence ? `${group.confidence}%` : "—"}</b>
                  </div>
                  {group.focusSchool ? (
                    <button
                      className="decision-inline-link"
                      type="button"
                      onClick={() => openUniversityTarget(group.focusSchool)}
                    >
                      {"查看主学校 ->"}
                    </button>
                  ) : (
                    <span className="decision-inline-hint">AI 正在补全此层级</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="decision-utility-board decision-panel-surface">
          <div className="decision-section-head">
            <div>
              <span className="decision-label">Decision Rule</span>
              <h3>当前取舍原则</h3>
            </div>
          </div>

          <div className="decision-compare-summary">
            <article>
              <span>Confidence</span>
              <strong>{confidenceScore}</strong>
              <p>当前组合的整体完成度与可执行性评分。</p>
            </article>
            <article>
              <span>Risk Strategy</span>
              <strong>{currentRiskOption?.label || "均衡型"}</strong>
              <p>{getRiskSummary(currentRiskOption, tradeoffPanel)}</p>
            </article>
            <article>
              <span>Primary Focus</span>
              <strong>{timelineEntries[0]?.major || "待生成"}</strong>
              <p>
                {timelineEntries[0]
                  ? buildUniversityReason(timelineEntries[0], result)
                  : "等待第一版路径形成。"}
              </p>
            </article>
            <article>
              <span>Next Action</span>
              <strong>{featuredUniversity?.university || "返回 Navigation"}</strong>
              <p>优先核查最靠前学校的专业顺序、调剂口径与城市接受度。</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  function renderUniversityView() {
    if (!timelineEntries.length) {
      return (
        <WorkspaceUtilityEmpty
          title="院校库暂时为空"
          description="等当前方案生成后，这里会把所有重点学校整理成可浏览、可点击、可继续判断的图文货架。"
          actionLabel="返回 Workspace"
          onAction={() => setWorkspaceView("workspace")}
        />
      );
    }

    return (
      <div className="decision-content-stack">
        {featuredUniversity ? (
          <section className="decision-library-feature decision-panel-surface">
            <div className="decision-library-feature-media">
              <SchoolImageFrame
                image={resolveUniversityImage(featuredUniversity, featuredUniversity.university)}
                alt={featuredUniversity.university}
                title={featuredUniversity.university}
                className="decision-library-feature-frame"
              />
            </div>
            <div className="decision-library-feature-copy">
              <span className="decision-label">Featured University</span>
              <h3>{featuredUniversity.university}</h3>
              <p>{featuredSummary?.label || "当前主判断院校。"}</p>

              <div className="decision-library-feature-meta">
                <article>
                  <span>Tier</span>
                  <strong>{featuredUniversity.tierLabel || "推荐层"}</strong>
                </article>
                <article>
                  <span>Confidence</span>
                  <strong>{featuredUniversity.bestConfidence || featuredUniversity.confidence || "--"}%</strong>
                </article>
                <article>
                  <span>City</span>
                  <strong>{featuredUniversity.city || "待确认"}</strong>
                </article>
              </div>

              <div className="decision-library-feature-tags">
                {(featuredSummary?.majors?.split(" / ") || []).slice(0, 3).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>

              <button
                className="decision-primary-button"
                type="button"
                onClick={() => onOpenUniversityDetail(featuredUniversity)}
              >
                打开院校详情
              </button>
            </div>
          </section>
        ) : null}

        <section className="decision-utility-board decision-panel-surface">
          <div className="decision-section-head">
            <div>
              <span className="decision-label">University Library</span>
              <h3>院校库</h3>
            </div>
            <span className="decision-status-pill">{timelineEntries.length} Schools</span>
          </div>

          <div className="decision-library-grid">
            {timelineEntries.map((school, index) => {
              const target = mergeUniversityDisplayRecord(
                school,
                universityGallery.find((item) => item.university === school.university) || null
              );
              const summary = buildSchoolSummary(target);

              return (
                <button
                  key={`${school.university}-${index}`}
                  type="button"
                  className={`decision-library-card tier-${school.tierClass || "steady"}`}
                  onClick={() => onOpenUniversityDetail(target)}
                >
                  <SchoolImageFrame
                    image={resolveUniversityImage(target, target.university)}
                    alt={school.university}
                    title={school.university}
                    className="decision-library-media"
                  />
                  <div className="decision-library-topline">
                    <span>{school.tierLabel}</span>
                    <strong>{school.university}</strong>
                    <p>{summary.label}</p>
                    <em>
                      {school.city} · {school.major}
                    </em>
                  </div>
                  <div className="decision-library-foot">
                    <small>{summary.majors}</small>
                    <i>{school.confidence || "--"}%</i>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  function renderMajorView() {
    return groupedMajors.length ? (
      <div className="decision-content-stack">
        <section className="decision-utility-board decision-panel-surface">
          <div className="decision-section-head">
            <div>
              <span className="decision-label">Major Library</span>
              <h3>专业库</h3>
            </div>
            <span className="decision-status-pill">{groupedMajors.length} Majors</span>
          </div>

          <div className="decision-major-grid">
            {groupedMajors.map((item, index) => (
              <button
                key={`${item.major}-${index}`}
                type="button"
                className={`decision-major-card tier-${item.tierClass || "steady"}`}
                onClick={() => {
                  const target = mergeUniversityDisplayRecord(
                    item,
                    universityGallery.find((school) => school.university === item.university) || null
                  );
                  openUniversityTarget(target);
                }}
              >
                <span>{item.tierLabel}</span>
                <strong>{item.major}</strong>
                <p>{item.university}</p>
                <small>{item.summary.label}</small>
                <div>
                  <em>{item.city}</em>
                  <b>{item.confidence ? `${item.confidence}%` : "--"}</b>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    ) : (
      <WorkspaceUtilityEmpty
        title="专业库暂时为空"
        description="等当前方案生成后，这里会把专业与学校一起整理成可浏览视图。"
        actionLabel="返回 Workspace"
        onAction={() => setWorkspaceView("workspace")}
      />
    );
  }

  function renderWorkspaceBody() {
    if (!hasResult) {
      return (
        <WorkspaceEmptyState
          canGeneratePlan={canGeneratePlan}
          guestMode={guestMode}
          onAuthClick={onAuthClick}
          onRefreshPlan={onRefreshPlan}
        />
      );
    }

    if (workspaceView === "compare") {
      return renderCompareView();
    }

    if (workspaceView === "university") {
      return renderUniversityView();
    }

    if (workspaceView === "major") {
      return renderMajorView();
    }

    return (
      <motion.div
        className="decision-content-stack"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : staggerDense}
        transition={transitionGentle}
      >
        {renderDecisionJourney()}
        {renderInsightCards()}
        {renderUniversityShelf()}
      </motion.div>
    );
  }

  return (
    <div className="decision-os-shell">
      <div className="decision-background-grid" aria-hidden="true" />
      <motion.div
        className="decision-os"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <aside className="decision-sidebar decision-panel-surface">
          <div className="decision-brand-lockup">
            <span className="decision-brand-mark" aria-hidden="true">
              <span />
            </span>
            <div>
              <strong>ZHIXU AI</strong>
              <em>AI Decision OS</em>
            </div>
          </div>

          <nav className="decision-rail" aria-label="Workspace shortcuts">
            {viewOptions.map((item, index) => (
              <button
                key={item.value}
                className={workspaceView === item.value ? "active" : ""}
                type="button"
                onClick={() => handleWorkspaceViewChange(item.value)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <em>{item.meta}</em>
              </button>
            ))}
            <button type="button" className="decision-rail-secondary" onClick={onOpenHistory}>
              <span>05</span>
              <strong>历史方案</strong>
              <em>Version Vault</em>
            </button>
            <button type="button" className="decision-rail-secondary" onClick={onEditProfile}>
              <span>06</span>
              <strong>画像设置</strong>
              <em>快速调整</em>
            </button>
          </nav>

          <section className="decision-profile-card">
            <div className="decision-profile-top">
              <span className="decision-eyebrow">Candidate Profile</span>
              <button
                type="button"
                className="decision-edit-button"
                onClick={onEditProfile}
                aria-label="编辑画像"
              >
                编辑
              </button>
            </div>

            <div className="decision-score-orb" aria-hidden="true">
              <span className="decision-score-ring" />
              <strong>{decisionProfile.score || "--"}</strong>
              <em>{decisionProfile.track ? `${decisionProfile.track}类` : "Profile"}</em>
            </div>

            <div className="decision-profile-groups">
              {candidateFacts.map((fact) => (
                <article key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </article>
              ))}
            </div>

            <div className="decision-chip-row">
              {(profileTags.length ? profileTags : ["计算机 / AI", "城市优先", "均衡型"]).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <button className="decision-subtle-button" type="button" onClick={onEditProfile}>
              快速调整
              <span>{"->"}</span>
            </button>
          </section>
        </aside>

        <main className="decision-main">
          <header className="decision-header decision-panel-surface">
            <div className="decision-header-nav">
              <nav className="decision-tabs" aria-label="Workspace navigation">
                {viewOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={workspaceView === item.value ? "active" : ""}
                    onClick={() => handleWorkspaceViewChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" onClick={onOpenHistory}>
                  历史方案
                </button>
              </nav>

              <div className="decision-top-actions">
                {hasResult ? (
                  <button className="decision-action-chip" type="button" onClick={onPrintPlan}>
                    导出方案
                  </button>
                ) : (
                  <button className="decision-action-chip" type="button" onClick={onRefreshPlan}>
                    开始分析
                  </button>
                )}
                {topAccessory ? (
                  topAccessory
                ) : (
                  <button
                    className="decision-avatar"
                    type="button"
                    onClick={guestMode ? onAuthClick : undefined}
                  >
                    {currentUser?.username?.slice(0, 1)?.toUpperCase() || "Z"}
                  </button>
                )}
              </div>
            </div>

            <section className="decision-hero">
              <div className="decision-hero-copy">
                <span className="decision-eyebrow">AI ANALYZING</span>
                <h1>你的决策正在形成</h1>
                <p>AI 正在基于你的画像、位次、偏好与录取规律，逐步收敛出更稳妥的志愿顺序。</p>

                <div className="decision-progress-grid">
                  {progressItems.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.note}</em>
                    </article>
                  ))}
                </div>
              </div>

              <div className="decision-hero-visual">
                <div className="decision-canvas-noise" aria-hidden="true" />
                <DecisionOrb />
              </div>
            </section>
          </header>

          {renderWorkspaceBody()}
        </main>

        <aside className="decision-copilot decision-panel-surface">
          <header className="decision-copilot-head">
            <div>
              <span className="decision-eyebrow">AI Copilot</span>
              <h2>顾问面板</h2>
            </div>
            <button type="button" className="decision-open-button" onClick={onOpenAdvisor}>
              打开
            </button>
          </header>

          <div className="decision-copilot-orb">
            <DecisionOrb compact />
          </div>

          <div className="decision-copilot-stack">
            <FoldSection
              title="Current Focus"
              label="01"
              action={<span className="decision-mini-pill">{currentRiskOption?.label || "均衡型"}</span>}
            >
              <strong className="decision-focus-line">{advisorSuggestion}</strong>
              <p>{getRiskSummary(currentRiskOption, tradeoffPanel)}</p>
            </FoldSection>

            <FoldSection
              title="AI Thinking"
              label="02"
              action={<span className="decision-mini-pill">{advisorModel}</span>}
            >
              <div className="decision-signal-grid">
                <article>
                  <span>Confidence</span>
                  <strong>{confidenceScore}</strong>
                </article>
                <article>
                  <span>Schools</span>
                  <strong>{timelineEntries.length}</strong>
                </article>
                <article>
                  <span>Mode</span>
                  <strong>{guestMode ? "Guest" : "Live"}</strong>
                </article>
              </div>
            </FoldSection>

            <FoldSection title="Suggestions" label="03">
              <div className="decision-question-stack">
                {quickQuestions.slice(0, 3).map((question) => (
                  <button key={question} type="button" onClick={onOpenAdvisor}>
                    <span>{question}</span>
                    <em>{"->"}</em>
                  </button>
                ))}
              </div>
            </FoldSection>

            <FoldSection
              title="History"
              label="04"
              action={
                <button type="button" className="decision-text-link" onClick={onOpenHistory}>
                  查看
                </button>
              }
            >
              <div className="decision-history-list">
                <article>
                  <span />
                  <div>
                    <strong>分析计算机专业的就业前景</strong>
                    <em>刚刚</em>
                  </div>
                </article>
                <article>
                  <span />
                  <div>
                    <strong>{advisorSuggestion}</strong>
                    <em>5 分钟前</em>
                  </div>
                </article>
              </div>
            </FoldSection>

            <FoldSection title="Quick Actions" label="05">
              <div className="decision-quick-actions">
                <button type="button" onClick={onRefreshPlan}>
                  重新分析
                </button>
                <button type="button" onClick={onOpenHistory}>
                  查看历史
                </button>
                <button type="button" onClick={onEditProfile}>
                  调整画像
                </button>
              </div>
            </FoldSection>
          </div>

          <button className="decision-advisor-input" type="button" onClick={onOpenAdvisor}>
            <span>{guestMode ? "登录后继续追问..." : "向 AI Copilot 提问..."}</span>
            <em>{"->"}</em>
          </button>
        </aside>
      </motion.div>
    </div>
  );
}
