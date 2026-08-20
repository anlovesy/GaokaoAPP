import { motion, useReducedMotion } from "framer-motion";
import {
  getUniversityProfile,
  getUniversityResourceLinks,
  resolveUniversityImage
} from "../../universityProfiles.js";
import { formatTuitionText } from "../../app/utils.js";
import { resolveSchoolRankValue } from "../../app/universityUtils.js";
import {
  revealSoft,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/university.css";

function UniversitySummaryChips({ items }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="editorial-fact-grid university-summary-grid"
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.24 }}
      variants={prefersReducedMotion ? undefined : staggerDense}
    >
      {items.map((item) => (
        <motion.article
          key={item.label}
          variants={prefersReducedMotion ? undefined : staggerItem}
          whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }}
          transition={transitionGentle}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </motion.article>
      ))}
    </motion.div>
  );
}

function UniversityValueList({ title, eyebrow, items = [] }) {
  return (
    <article className="university-dossier-card">
      <div className="university-dossier-head">
        <div>
          <span className="brand-kicker">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
      </div>

      <div className="university-editorial-list">
        {items.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
    </article>
  );
}

function buildUniversityMajorDetails(admissionRows = [], fallbackMajors = []) {
  const details = [];
  const seen = new Set();

  admissionRows.forEach((school) => {
    (school.majorDetails || []).forEach((detail) => {
      if (!detail?.name || seen.has(detail.name)) {
        return;
      }
      seen.add(detail.name);
      details.push(detail);
    });
  });

  if (!details.length) {
    return fallbackMajors.map((name) => ({
      name,
      direction: "",
      popularity: "stable",
      tuition: 0,
      recommendationReason: "建议结合当年招生计划，继续核对这个专业在当前专业组里的具体口径。"
    }));
  }

  return details.slice(0, 6);
}

export function UniversityDetailPanel({
  university,
  onOpenStandalone = null,
  isStandalone = false
}) {
  const prefersReducedMotion = useReducedMotion();
  const profile = university.profile || getUniversityProfile(university.university);
  const admissionRows = [...university.schools]
    .sort(
      (a, b) =>
        Number(b.year || 0) - Number(a.year || 0) ||
        Number(b.confidence || 0) - Number(a.confidence || 0)
    )
    .slice(0, 8);
  const majorDetails = buildUniversityMajorDetails(admissionRows, profile.keyMajors || []);
  const resourceLinks = getUniversityResourceLinks(university.university);
  const focusMajors = Array.from(
    new Set(
      (majorDetails.length
        ? majorDetails.map((item) => item.name)
        : profile.keyMajors?.length
          ? profile.keyMajors
          : university.schools.map((school) => school.major)
      ).filter(Boolean)
    )
  ).slice(0, 8);
  const latestAdmission = admissionRows[0] || null;
  const universityImage = resolveUniversityImage(university, university.university);

  const summaryItems = [
    {
      label: "Region",
      value: profile.region || "待补充"
    },
    {
      label: "City",
      value: university.city || profile.city || "待补充"
    },
    {
      label: "Focus Majors",
      value: String(focusMajors.length).padStart(2, "0")
    }
  ];

  const dossierSignals = [
    {
      title: "平台判断",
      content: profile.level || "建议人工复核学校层级与培养资源。"
    },
    {
      title: "适合谁",
      content:
        profile.suitableFor?.[0] ||
        "适合对学校平台、城市资源与专业出口有明确偏好的考生。"
    },
    {
      title: "当前提醒",
      content:
        latestAdmission
          ? `${latestAdmission.year || "当前口径"} / 最低分 ${latestAdmission.minScore || "--"} / 位次 ${resolveSchoolRankValue(latestAdmission)}`
          : "等待录取口径补充。"
    }
  ];

  const campusSignals = [
    {
      title: "校园体验",
      content:
        profile.campusNotes?.[0] ||
        "建议重点关注培养校区、生活节奏与不同学院之间的资源差异。"
    },
    {
      title: "报考规则",
      content:
        profile.brochureNotes?.[0] ||
        "建议同步核查专业组、调剂范围与选科要求。"
    },
    {
      title: "就业去向",
      content:
        profile.employmentDirections?.slice(0, 2).join(" / ") ||
        "优先看你能接受的专业出口，而不是只看学校标签。"
    }
  ];

  const recommendedMajorItems = majorDetails.slice(0, 3).map((detail) => ({
    title: `${detail.name}${detail.direction ? ` · ${detail.direction}` : ""}`,
    content: `${detail.recommendationReason}${detail.tuition ? ` 学费约 ${formatTuitionText(detail.tuition)}。` : ""}`
  }));

  const panel = (
    <article className={`university-editorial${isStandalone ? " standalone" : ""}`}>
      <motion.section
        className="university-dossier-hero"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <div className="university-dossier-media">
          <div className="university-editorial-orbit" aria-hidden="true">
            <span className="university-editorial-orbit-ring university-editorial-orbit-ring-a" />
            <span className="university-editorial-orbit-ring university-editorial-orbit-ring-b" />
            <span className="university-editorial-orbit-dot university-editorial-orbit-dot-a" />
            <span className="university-editorial-orbit-dot university-editorial-orbit-dot-b" />
          </div>
          <motion.img
            src={universityImage}
            alt={`${university.university} 校园图片`}
            loading="lazy"
            decoding="async"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.025 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="university-dossier-hero-copy">
          <div className="university-editorial-copy">
            <span className="brand-kicker">University Dossier</span>
            <h3>{university.university}</h3>
            <p>{profile.level}</p>
          </div>

          <p className="university-dossier-overview">{profile.overview}</p>

          <UniversitySummaryChips items={summaryItems} />

          <div className="university-dossier-cta-row">
            {onOpenStandalone ? (
              <button className="text-link-btn" type="button" onClick={() => onOpenStandalone(university)}>
                打开完整详情
              </button>
            ) : null}
            <a className="editorial-link" href={resourceLinks.admissionsUrl} target="_blank" rel="noreferrer">
              查看招生网
            </a>
          </div>
        </div>
      </motion.section>

      <div className="university-dossier-grid">
        <motion.article
          className="university-dossier-card university-dossier-narrative"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={transitionGentle}
        >
          <div className="university-dossier-head">
            <div>
              <span className="brand-kicker">Today's Insight</span>
              <h4>为什么它仍然在你的主决策区间里</h4>
            </div>
          </div>

          <article className="university-latest-callout editorial-highlight-block large">
            <span>Current Position</span>
            <strong>{profile.label}</strong>
            <p>{profile.officialHint || "建议同步对照学校招生网与近年录取位次变化。"}</p>
          </article>

          <div className="workspace-insight-list university-insight-list">
            {dossierSignals.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.content}</p>
              </article>
            ))}
          </div>
        </motion.article>

        <motion.aside
          className="university-dossier-sidebar"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={{ ...transitionGentle, delay: 0.03 }}
        >
          <article className="university-dossier-card university-editorial-summary-rail">
            <span className="brand-kicker">Focus Majors</span>
            <div className="editorial-chip-cloud">
              {focusMajors.map((item) => (
                <motion.span
                  key={item}
                  className="editorial-chip"
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  transition={transitionGentle}
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </article>

          <article className="university-dossier-card">
            <span className="brand-kicker">Official Links</span>
            <div className="editorial-link-stack">
              <a className="editorial-link" href={resourceLinks.admissionsUrl} target="_blank" rel="noreferrer">
                本科招生
              </a>
              <a className="editorial-link" href={resourceLinks.overviewUrl} target="_blank" rel="noreferrer">
                学校简介
              </a>
              <a className="editorial-link" href={resourceLinks.scoreUrl} target="_blank" rel="noreferrer">
                历年录取
              </a>
            </div>
          </article>
        </motion.aside>
      </div>

      <div className="university-dossier-signal-grid">
        <motion.div
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={transitionGentle}
        >
          <UniversityValueList title="报考与培养信号" eyebrow="Campus Notes" items={campusSignals} />
        </motion.div>

        {recommendedMajorItems.length ? (
          <motion.div
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView={prefersReducedMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.18 }}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.02 }}
          >
            <UniversityValueList
              title="建议关注的具体专业"
              eyebrow="Major Focus"
              items={recommendedMajorItems}
            />
          </motion.div>
        ) : null}

        <motion.section
          className="university-dossier-card university-admission-board"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.16 }}
          variants={prefersReducedMotion ? undefined : staggerDense}
        >
          <div className="university-dossier-head">
            <div>
              <span className="brand-kicker">Admission Timeline</span>
              <h4>近年录取口径</h4>
            </div>
          </div>

          <div className="university-admission-stack">
            {admissionRows.map((school) => (
              <motion.article
                key={`${school.university}-${school.major}-${school.year || school.tierLabel}`}
                className="university-admission-row"
                variants={prefersReducedMotion ? undefined : staggerItem}
                whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                transition={transitionGentle}
              >
                <div className="university-admission-major">
                  <span>专业</span>
                  <strong>{school.major}</strong>
                </div>
                <div className="university-admission-meta">
                  <span>年份：{school.year || "当前口径"}</span>
                  <span>最低分：{school.minScore || "--"}</span>
                  <span>最低位次：{resolveSchoolRankValue(school)}</span>
                  <span>批次：{school.batch || "待补充"}</span>
                  <span>学费：{formatTuitionText(school.tuition)}</span>
                  <span>录取概率：{school.confidence || "--"}%</span>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>
    </article>
  );

  if (isStandalone) {
    return panel;
  }

  return <section className="workspace-stage-section">{panel}</section>;
}
