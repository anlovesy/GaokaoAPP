export function AuthScreen({
  authWallRows,
  currentUser,
  loginError,
  loginForm,
  onBack,
  onChangeLoginForm,
  onGuestAction,
  onLogin
}) {
  return (
    <div className="auth-shell">
      <div className="auth-wall" aria-hidden="true">
        {authWallRows.map((row, rowIndex) => (
          <div key={`auth-row-${rowIndex}`} className="auth-wall-row">
            <div className={`auth-wall-track ${rowIndex % 2 === 1 ? "reverse" : ""}`}>
              {[...row, ...row].map((school, index) => (
                <article key={`${school.name}-${rowIndex}-${index}`} className="campus-poster">
                  <img src={school.image} alt="" loading="lazy" />
                  <div className="campus-poster-copy">
                    <span>{school.region} / {school.city}</span>
                    <strong>{school.name}</strong>
                    <p>{school.label}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="auth-layout">
        <section className="auth-copy surface-card">
          <p className="eyebrow">Member Access</p>
          <h1>登录后进入正式工作台</h1>
          <p className="hero-text">
            正式用户可以无限生成志愿表，开启连续问答、聊天记忆、历史记录，以及管理员的多用户账号管理能力。
          </p>

          <div className="auth-visual-hint">
            <strong>全国高校影像墙</strong>
            <p>背景会自动来回滚动，鼠标停留在任意校园卡片上会放大预览，帮助用户先感受学校气质，再进入正式填报流程。</p>
          </div>

          <div className="info-stack">
            <article className="info-card">
              <h3>正式用户能做什么</h3>
              <ul className="simple-list">
                <li>连续追问 AI 顾问，保持上下文记忆</li>
                <li>查看自己的历史志愿表和聊天记录</li>
                <li>管理员可统一创建和管理顾问账号</li>
              </ul>
            </article>

            <article className="info-card">
              <h3>游客体验边界</h3>
              <ul className="simple-list">
                <li>可进入工作台并完成一次正式志愿表体验</li>
                <li>不开放连续聊天、历史记录与后台管理</li>
                <li>适合先看系统生成能力，再决定是否正式使用</li>
              </ul>
            </article>
          </div>

          {currentUser ? (
            <div className="validation-box ok">检测到已有登录会话，直接进入工作台即可继续使用。</div>
          ) : null}
        </section>

        <section className="auth-card surface-card">
          <div className="section-head compact">
            <div>
              <p className="section-kicker">Sign In</p>
              <h2>输入用户账号与密码</h2>
            </div>
          </div>

          <form className="planner-form" onSubmit={onLogin}>
            <label>
              <span>用户账号</span>
              <input
                value={loginForm.username}
                onChange={(event) =>
                  onChangeLoginForm((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
              />
            </label>

            <label>
              <span>用户密码</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  onChangeLoginForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />
            </label>

            <button className="primary-btn" type="submit">
              登录并进入工作台
            </button>
            {loginError ? <p className="error-text">{loginError}</p> : null}
          </form>

          <div className="auth-actions">
            <button className="secondary-btn" type="button" onClick={onGuestAction}>
              先用游客模式体验
            </button>
            <button className="ghost-btn" type="button" onClick={onBack}>
              返回平台介绍
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
