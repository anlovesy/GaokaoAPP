import { getUniversityProfile, getUniversityResourceLinks } from "../../universityProfiles.js";
import { formatTuitionText, resolveSchoolRankValue } from "../../app/utils.js";

export function UniversityDetailPanel({ university, onOpenStandalone = null, isStandalone = false }) {
  const profile = university.profile || getUniversityProfile(university.university);
  const admissionRows = [...university.schools]
    .sort(
      (a, b) =>
        Number(b.year || 0) - Number(a.year || 0) || Number(b.confidence || 0) - Number(a.confidence || 0)
    )
    .slice(0, 8);
  const resourceLinks = getUniversityResourceLinks(university.university);
  const focusMajors = Array.from(
    new Set(
      (profile.keyMajors?.length ? profile.keyMajors : university.schools.map((school) => school.major)).filter(
        Boolean
      )
    )
  ).slice(0, 6);
  const suitableFor = (profile.suitableFor?.length
    ? profile.suitableFor
    : ["建议结合城市、专业接受度和志愿风险综合判断。"]
  ).slice(0, 4);
  const employmentDirections = (profile.employmentDirections?.length
    ? profile.employmentDirections
    : ["结合学校就业质量报告与升学去向人工复核。"]
  ).slice(0, 4);
  const campusNotes = (profile.campusNotes?.length
    ? profile.campusNotes
    : ["建议优先核查培养校区、住宿安排和是否存在异地培养。"]
  ).slice(0, 4);
  const brochureNotes = (profile.brochureNotes?.length
    ? profile.brochureNotes
    : ["建议重点核查招生章程、调剂口径和专业组选科要求。"]
  ).slice(0, 4);
  const latestAdmission = admissionRows[0] || null;
  const profileFacts = [
    { label: "办学定位", value: profile.schoolType || "待补充" },
    { label: "平台特征", value: profile.level || "建议人工复核" },
    { label: "所在城市", value: university.city || profile.city || "待补充" },
    { label: "当前主推", value: university.heroMajor || latestAdmission?.major || "待补充" }
  ];

  const panel = (
    <article className={`university-detail-panel${isStandalone ? " is-standalone" : ""}`}>
      <div className="university-detail-hero">
        <img src={profile.image} alt={`${university.university} 校园图片`} loading="lazy" />
        <div className="university-detail-hero-copy">
          <span>{profile.region} / {university.city || profile.city}</span>
          <h4>{university.university}</h4>
          <p>{profile.label}</p>

          <div className="university-hero-metrics">
            {profileFacts.map((item) => (
              <article key={item.label} className="hero-metric">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="university-detail-grid university-detail-grid-primary">
        <section className="university-detail-section">
          <h4>学校简介</h4>
          <p>{profile.overview}</p>
          <div className="university-chip-row">
            {profile.highlights.map((item) => (
              <span key={item} className="soft-chip">{item}</span>
            ))}
            <span className="soft-chip">推荐专业 {university.recommendationCount} 个</span>
          </div>

          <div className="university-action-row">
            {onOpenStandalone ? (
              <button className="primary-btn" type="button" onClick={() => onOpenStandalone(university)}>
                进入独立高校详情页
              </button>
            ) : null}
            <a className="secondary-btn link-btn" href={resourceLinks.admissionsUrl} target="_blank" rel="noreferrer">
              查看招生简章 / 本科招生
            </a>
            <a className="ghost-btn link-btn" href={resourceLinks.overviewUrl} target="_blank" rel="noreferrer">
              查看学校简介
            </a>
            <a className="ghost-btn link-btn" href={resourceLinks.scoreUrl} target="_blank" rel="noreferrer">
              查看历年录取信息
            </a>
          </div>
        </section>

        <aside className="university-detail-section university-profile-aside">
          <h4>报考画像</h4>
          <div className="profile-stat-grid">
            {profileFacts.map((item) => (
              <article key={`${item.label}-stat`} className="profile-stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="profile-list-grid">
            <article className="profile-list-card">
              <h5>重点方向</h5>
              <div className="university-chip-row">
                {focusMajors.map((item) => (
                  <span key={item} className="soft-chip">{item}</span>
                ))}
              </div>
            </article>

            <article className="profile-list-card">
              <h5>适合什么样的考生</h5>
              <ul className="simple-list">
                {suitableFor.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </aside>
      </div>

      <div className="university-detail-grid detail-grid-secondary">
        <section className="university-detail-section university-detail-note">
          <h4>报考提醒</h4>
          <ul className="simple-list">
            {profile.admissionsNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="muted">{profile.officialHint}</p>
        </section>

        <section className="university-detail-section university-detail-note">
          <h4>招生章程 / 校区提示</h4>
          <div className="detail-note-group">
            <h5>校区与培养体验</h5>
            <ul className="simple-list">
              {campusNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="detail-note-group">
            <h5>章程里建议重点核查</h5>
            <ul className="simple-list">
              {brochureNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="university-detail-grid detail-grid-secondary">
        <section className="university-detail-section">
          <h4>当前推荐专业</h4>
          <div className="recommendation-pills">
            {university.schools.map((school) => (
              <article key={`${school.university}-${school.major}-${school.tierLabel}`} className="recommendation-pill-card">
                <strong>{school.major}</strong>
                <span>{school.tierLabel}</span>
                {school.subjectRequirement ? <span>{school.subjectRequirement}</span> : null}
                <em>把握度 {school.confidence || "待评估"}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="university-detail-section">
          <h4>历届招生情况 / 分数参考</h4>
          <div className="admission-snapshot-grid">
            {admissionRows.map((school) => (
              <article key={`${school.university}-${school.major}-${school.year || school.tierLabel}-snapshot`} className="admission-snapshot-card">
                <strong>{school.major}</strong>
                <span>年份 {school.year || "当前口径"}</span>
                <span>最低分 {school.minScore || "--"}</span>
                <span>最低位次 {resolveSchoolRankValue(school)}</span>
                <span>学费 {formatTuitionText(school.tuition)}</span>
                <span>批次 {school.batch || "待补充"}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="university-detail-grid detail-grid-secondary detail-grid-tertiary">
        <section className="university-detail-section">
          <h4>就业与发展方向</h4>
          <div className="profile-list-grid">
            <article className="profile-list-card">
              <h5>常见去向</h5>
              <ul className="simple-list">
                {employmentDirections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="profile-list-card profile-list-card-emphasis">
              <h5>最近一次可见录取参考</h5>
              {latestAdmission ? (
                <ul className="simple-list">
                  <li>年份：{latestAdmission.year || "当前口径"}</li>
                  <li>专业：{latestAdmission.major || "待补充"}</li>
                  <li>最低分：{latestAdmission.minScore || "--"}</li>
                  <li>最低位次：{resolveSchoolRankValue(latestAdmission)}</li>
                  <li>学费：{formatTuitionText(latestAdmission.tuition)}</li>
                </ul>
              ) : (
                <p className="muted">当前推荐结果里还没有带年份的录取参考。</p>
              )}
            </article>
          </div>
        </section>

        <section className="university-detail-section">
          <h4>官方入口</h4>
          <div className="resource-link-grid">
            <a className="resource-link-card" href={resourceLinks.admissionsUrl} target="_blank" rel="noreferrer">
              <strong>本科招生 / 招生简章</strong>
              <span>优先核对当年招生章程、专业目录、专业组选考要求和调剂口径。</span>
            </a>
            <a className="resource-link-card" href={resourceLinks.overviewUrl} target="_blank" rel="noreferrer">
              <strong>学校简介 / 本科培养</strong>
              <span>适合核查院系设置、培养方案、校区分布与学校官方介绍。</span>
            </a>
            <a className="resource-link-card" href={resourceLinks.scoreUrl} target="_blank" rel="noreferrer">
              <strong>历年录取信息</strong>
              <span>建议把最低分、最低位次、专业冷热差和年份波动放在一起看。</span>
            </a>
          </div>
        </section>
      </div>
    </article>
  );

  if (isStandalone) {
    return panel;
  }

  return (
    <section className="result-block">
      <h3>高校档案</h3>
      {panel}
    </section>
  );
}
