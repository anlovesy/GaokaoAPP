import {
  getUniversityProfile,
  getUniversityResourceLinks,
  resolveUniversityImage
} from "../../universityProfiles.js";
import { formatTuitionText, resolveSchoolRankValue } from "../../app/utils.js";

function UniversitySummaryChips({ items }) {
  return (
    <div className="university-summary-ribbon">
      {items.map((item) => (
        <article key={item.label} className="university-summary-chip">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

export function UniversityDetailPanel({
  university,
  onOpenStandalone = null,
  isStandalone = false
}) {
  const profile = university.profile || getUniversityProfile(university.university);
  const admissionRows = [...university.schools]
    .sort(
      (a, b) =>
        Number(b.year || 0) - Number(a.year || 0) ||
        Number(b.confidence || 0) - Number(a.confidence || 0)
    )
    .slice(0, 8);
  const resourceLinks = getUniversityResourceLinks(university.university);
  const focusMajors = Array.from(
    new Set(
      (profile.keyMajors?.length
        ? profile.keyMajors
        : university.schools.map((school) => school.major)
      ).filter(Boolean)
    )
  ).slice(0, 8);
  const latestAdmission = admissionRows[0] || null;
  const universityImage = resolveUniversityImage(university, university.university);

  const summaryItems = [
    {
      label: "地区",
      value: profile.region || "待补充"
    },
    {
      label: "城市",
      value: university.city || profile.city || "待补充"
    },
    {
      label: "重点专业",
      value: String(focusMajors.length).padStart(2, "0")
    }
  ];

  const panel = (
    <article className={`university-dossier${isStandalone ? " standalone" : ""}`}>
      <section className="university-dossier-hero">
        <div className="university-dossier-media">
          <img src={universityImage} alt={`${university.university} 校园图片`} loading="lazy" />
        </div>

        <div className="university-dossier-hero-copy">
          <span className="brand-kicker">DOSSIER</span>
          <h2>{university.university}</h2>
          <p>{profile.label}</p>
          <UniversitySummaryChips items={summaryItems} />
        </div>
      </section>

      <section className="university-dossier-grid">
        <article className="university-dossier-card">
          <div className="university-dossier-head">
            <span className="brand-kicker">OVERVIEW</span>
            {onOpenStandalone ? (
              <button
                className="text-link-btn"
                type="button"
                onClick={() => onOpenStandalone(university)}
              >
                打开详情页
              </button>
            ) : null}
          </div>

          <p className="university-dossier-overview">{profile.overview}</p>
        </article>

        <article className="university-dossier-card">
          <div className="university-dossier-head">
            <span className="brand-kicker">FOCUS MAJORS</span>
          </div>

          <div className="editorial-chip-cloud">
            {focusMajors.map((item) => (
              <span key={item} className="editorial-chip">
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="university-dossier-grid secondary">
        <article className="university-dossier-card university-admission-stage">
          <div className="university-dossier-head">
            <span className="brand-kicker">ADMISSION</span>
          </div>

          <div className="university-admission-stack">
            {admissionRows.map((school) => (
              <article
                key={`${school.university}-${school.major}-${school.year || school.tierLabel}`}
                className="university-admission-row"
              >
                <div className="university-admission-major">
                  <strong>{school.major}</strong>
                  <span>{school.year || "当前口径"}</span>
                </div>

                <div className="university-admission-meta">
                  <span>最低分 {school.minScore || "--"}</span>
                  <span>位次 {resolveSchoolRankValue(school)}</span>
                  <span>{school.batch || "批次待补充"}</span>
                  <span>{formatTuitionText(school.tuition)}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="university-dossier-sidebar">
          <section className="university-dossier-card">
            <div className="university-dossier-head">
              <span className="brand-kicker">LINKS</span>
            </div>

            <div className="editorial-link-stack">
              <a
                className="editorial-link"
                href={resourceLinks.admissionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                本科招生
              </a>
              <a
                className="editorial-link"
                href={resourceLinks.overviewUrl}
                target="_blank"
                rel="noreferrer"
              >
                学校简介
              </a>
              <a
                className="editorial-link"
                href={resourceLinks.scoreUrl}
                target="_blank"
                rel="noreferrer"
              >
                历年录取
              </a>
            </div>
          </section>

          {latestAdmission ? (
            <section className="university-dossier-card university-latest-callout">
              <span className="brand-kicker">LATEST</span>
              <strong>{latestAdmission.major}</strong>
              <p>
                {latestAdmission.year || "当前口径"} / 最低分 {latestAdmission.minScore || "--"} / 位次{" "}
                {resolveSchoolRankValue(latestAdmission)}
              </p>
            </section>
          ) : null}
        </article>
      </section>
    </article>
  );

  if (isStandalone) {
    return panel;
  }

  return <section className="workspace-stage-section">{panel}</section>;
}
