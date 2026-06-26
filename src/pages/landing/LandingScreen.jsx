import { PLATFORM_HIGHLIGHTS } from "../../app/constants.js";

export function LandingScreen({ dataStatus, providers, onPrimaryAction, onGuestAction }) {
  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy surface-card hero-card">
          <p className="eyebrow">Guangdong-First Intelligent Planner</p>
          <h1>高考志愿，不该靠运气和信息差。</h1>
          <p className="hero-text">
            这是一个面向广东考生设计的志愿填报智能平台。它不只给学校名单，更会把分数、位次、
            专业组、城市、职业规划和调剂风险一起算进去，让志愿表更像真正能交付的商业化产品。
          </p>

          <div className="hero-chip-row">
            {PLATFORM_HIGHLIGHTS.map((item) => (
              <span key={item} className="soft-chip">
                {item}
              </span>
            ))}
          </div>

          <div className="hero-action-row">
            <button className="primary-btn" type="button" onClick={onPrimaryAction}>
              进入登录页
            </button>
            <button className="secondary-btn" type="button" onClick={onGuestAction}>
              游客体验一次方案
            </button>
          </div>
        </div>

        <div className="landing-side">
          <article className="feature-panel surface-card">
            <h2>平台结构</h2>
            <ol className="step-list">
              <li>第一页：平台介绍，先讲清楚能解决什么问题。</li>
              <li>第二页：登录入口，区分正式用户和游客体验。</li>
              <li>第三页：工作台，专心做画像、志愿表和 AI 顾问。</li>
            </ol>
          </article>

          <article className="feature-panel surface-card">
            <h2>当前数据状态</h2>
            <div className="summary-grid">
              <div className="mini-card">
                <span className="mini-label">真实结构数据</span>
                <strong>{dataStatus?.imported ? "已接入" : "未导入"}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">院校专业记录</span>
                <strong>{dataStatus?.universityMajorLineCount || 0}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">一分一段记录</span>
                <strong>{dataStatus?.provinceScoreRankCount || 0}</strong>
              </div>
              <div className="mini-card">
                <span className="mini-label">可用年份</span>
                <strong>{dataStatus?.availableYears?.join(" / ") || "--"}</strong>
              </div>
            </div>
          </article>

          <article className="feature-panel surface-card">
            <h2>模型能力</h2>
            <div className="provider-stack">
              {providers.map((provider) => (
                <div key={provider.id} className={`provider-row ${provider.enabled ? "enabled" : "disabled"}`}>
                  <div>
                    <strong>{provider.label}</strong>
                    <p>{provider.model}</p>
                  </div>
                  <span>{provider.enabled ? "已配置" : "未配置"}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="landing-sections">
        <article className="surface-card feature-large-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Why This Product</p>
              <h2>它不是只会“列学校”的工具</h2>
            </div>
          </div>
          <div className="feature-grid">
            <div className="info-card">
              <h3>先做画像</h3>
              <p>省份、兴趣、分数、位次、职业规划、城市取向和现实限制一起进入决策。</p>
            </div>
            <div className="info-card">
              <h3>再做冲稳保</h3>
              <p>冲要真冲，稳要能稳，保要接近兜底，不再出现“保底还在冒险”的方案。</p>
            </div>
            <div className="info-card">
              <h3>最后可持续追问</h3>
              <p>聊天式顾问会结合当前志愿表继续解释和重排，而不是每次都从头开始。</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
