import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";

export function UniversityScreen({ university, onBack }) {
  return (
    <div className="university-page-shell">
      <div className="university-page-layout">
        <header className="university-page-topbar surface-card">
          <div>
            <p className="eyebrow">University Archive</p>
            <h1>{university ? `${university.university} · 高校详情` : "高校详情页"}</h1>
            <p className="workspace-subtitle">
              {university
                ? "这里把学校简介、推荐专业、历届招生情况、分数参考、学费和官方入口集中到一个页面里，方便你围绕单所学校做深入判断。"
                : "请先从志愿推荐页点击学校图片，再进入这张高校详情页查看具体资料。"}
            </p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={onBack}>
              返回志愿推荐
            </button>
          </div>
        </header>

        {university ? (
          <UniversityDetailPanel university={university} isStandalone />
        ) : (
          <article className="surface-card info-card">
            <h4>还没有选中高校</h4>
            <p>请先从志愿推荐页点击学校图片，再进入这张高校详情页查看具体资料。</p>
          </article>
        )}
      </div>
    </div>
  );
}
