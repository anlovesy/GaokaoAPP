import { motion } from "framer-motion";
import { revealUp, transitionHero } from "../../motion/presets.js";

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
    <div className="auth-shell brand-shell">
      <section className="auth-premium-stage">
        <div className="auth-visual-world" aria-hidden="true">
          <div className="auth-visual-overlay" />
          {authWallRows.map((row, rowIndex) => (
            <div key={`auth-row-${rowIndex}`} className="auth-visual-row">
              <div className={`auth-visual-track ${rowIndex % 2 === 1 ? "reverse" : ""}`}>
                {[...row, ...row].map((school, index) => (
                  <article key={`${school.name}-${rowIndex}-${index}`} className="auth-visual-card">
                    <img src={school.image} alt="" loading="lazy" />
                    <div>
                      <span>{school.city}</span>
                      <strong>{school.name}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="auth-editorial-grid">
          <motion.section
            className="auth-editorial-copy"
            initial="hidden"
            animate="visible"
            variants={revealUp}
            transition={transitionHero}
          >
            <span className="brand-kicker">Member Access</span>
            <h1>继续你的判断</h1>
            <p>直接进入工作台</p>

            {currentUser ? (
              <span className="auth-presence-chip">已检测到登录状态</span>
            ) : null}

            <button className="text-link-btn" type="button" onClick={onBack}>
              返回首页
            </button>
          </motion.section>

          <motion.section
            className="auth-glass-panel"
            initial={{ opacity: 0, x: 36, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ ...transitionHero, delay: 0.08 }}
          >
            <div className="auth-panel-mark">
              <span className="brand-kicker">Sign In</span>
              <h2>登录</h2>
            </div>

            <form className="auth-form-stack" onSubmit={onLogin}>
              <label>
                <span>账号</span>
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    onChangeLoginForm((current) => ({
                      ...current,
                      username: event.target.value
                    }))
                  }
                  placeholder="输入账号"
                />
              </label>

              <label>
                <span>密码</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    onChangeLoginForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="输入密码"
                />
              </label>

              <button className="primary-btn magnetic-btn" type="submit">
                登录并进入
              </button>

              {loginError ? <p className="error-text">{loginError}</p> : null}
            </form>

            <div className="auth-panel-actions">
              <button className="text-link-btn" type="button" onClick={onGuestAction}>
                游客体验
              </button>
              <button className="text-link-btn" type="button" onClick={onBack}>
                返回
              </button>
            </div>
          </motion.section>
        </div>
      </section>
    </div>
  );
}
