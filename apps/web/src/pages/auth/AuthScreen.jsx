import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { revealUpLarge, transitionHero } from "../../motion/presets.js";
import "../../styles/pages/auth.css";

const zhixuAssets = {
  horizontal: "/brand/zhixu/decision-orbit-lockup-horizontal.svg",
  markPaper: "/brand/zhixu/decision-orbit-mark-paper.svg"
};

const authMediaItems = [
  {
    id: "tsinghua-gate",
    image: "/hero-universities/optimized/tsinghua-gate.webp",
    school: "清华大学",
    top: "-3%",
    left: "2%",
    width: "20vw",
    maxWidth: "330px",
    aspectRatio: "0.82",
    depthX: 0.22,
    depthY: 0.16,
    rotation: -8,
    floatY: -16,
    floatRotate: 1,
    delay: 0.04,
    duration: 19,
    layer: "front"
  },
  {
    id: "pku-hall",
    image: "/hero-universities/optimized/pku-hall.webp",
    school: "北京大学",
    top: "5%",
    right: "7%",
    width: "17vw",
    maxWidth: "280px",
    aspectRatio: "1.06",
    depthX: -0.14,
    depthY: 0.12,
    rotation: 7,
    floatY: 12,
    floatRotate: -1,
    delay: 0.12,
    duration: 20,
    layer: "middle"
  },
  {
    id: "fudan-aerial",
    image: "/hero-universities/optimized/fudan-aerial.webp",
    school: "复旦大学",
    top: "34%",
    left: "-1%",
    width: "18vw",
    maxWidth: "290px",
    aspectRatio: "0.84",
    depthX: 0.18,
    depthY: 0.08,
    rotation: -6,
    floatY: 14,
    floatRotate: 0.8,
    delay: 0.2,
    duration: 22,
    layer: "back"
  },
  {
    id: "tsinghua-shuimu",
    image: "/hero-universities/optimized/tsinghua-shuimu.webp",
    school: "清华大学",
    top: "22%",
    right: "24%",
    width: "14vw",
    maxWidth: "220px",
    aspectRatio: "1.04",
    depthX: -0.08,
    depthY: 0.1,
    rotation: 5,
    floatY: -10,
    floatRotate: -0.7,
    delay: 0.28,
    duration: 18,
    layer: "back"
  },
  {
    id: "whu-aerial",
    image: "/hero-universities/optimized/whu-aerial.webp",
    school: "武汉大学",
    bottom: "8%",
    left: "12%",
    width: "20vw",
    maxWidth: "326px",
    aspectRatio: "1.08",
    depthX: 0.12,
    depthY: -0.12,
    rotation: 4,
    floatY: -16,
    floatRotate: 1,
    delay: 0.36,
    duration: 23,
    layer: "middle"
  },
  {
    id: "sysu-campus",
    image: "/hero-universities/optimized/sysu-campus.webp",
    school: "中山大学",
    bottom: "2%",
    right: "2%",
    width: "23vw",
    maxWidth: "360px",
    aspectRatio: "0.86",
    depthX: -0.2,
    depthY: -0.14,
    rotation: 6,
    floatY: 16,
    floatRotate: -1,
    delay: 0.44,
    duration: 21,
    layer: "front"
  }
];

const authParticles = [
  { top: "8%", left: "6%", size: "4px", delay: "0.2s" },
  { top: "12%", left: "24%", size: "3px", delay: "1.2s" },
  { top: "7%", right: "18%", size: "4px", delay: "0.6s" },
  { top: "19%", right: "30%", size: "2px", delay: "1.8s" },
  { top: "36%", left: "14%", size: "3px", delay: "0.9s" },
  { top: "43%", left: "58%", size: "4px", delay: "1.5s" },
  { top: "52%", right: "11%", size: "3px", delay: "0.5s" },
  { bottom: "31%", left: "10%", size: "3px", delay: "1.1s" },
  { bottom: "24%", left: "34%", size: "2px", delay: "1.9s" },
  { bottom: "16%", right: "24%", size: "4px", delay: "0.8s" },
  { bottom: "11%", right: "8%", size: "3px", delay: "1.6s" },
  { bottom: "8%", left: "62%", size: "2px", delay: "0.4s" },
  { top: "15%", left: "44%", size: "2px", delay: "2.1s" },
  { top: "26%", right: "7%", size: "3px", delay: "1.3s" },
  { top: "61%", left: "22%", size: "2px", delay: "0.7s" },
  { top: "69%", left: "72%", size: "4px", delay: "1.9s" },
  { bottom: "38%", right: "37%", size: "2px", delay: "0.3s" },
  { bottom: "29%", right: "16%", size: "3px", delay: "1.4s" },
  { bottom: "18%", left: "49%", size: "2px", delay: "2.3s" },
  { bottom: "10%", left: "28%", size: "3px", delay: "0.9s" }
];

function buildMediaStyle(item) {
  return {
    top: item.top,
    right: item.right,
    bottom: item.bottom,
    left: item.left,
    width: item.width,
    maxWidth: item.maxWidth,
    aspectRatio: item.aspectRatio,
    "--auth-depth-x": item.depthX,
    "--auth-depth-y": item.depthY
  };
}

export function AuthScreen({
  currentUser,
  loginError,
  loginForm,
  onBack,
  onChangeLoginForm,
  onGuestAction,
  onLogin
}) {
  const stageRef = useRef(null);
  const pointerX = useMotionValue(260);
  const pointerY = useMotionValue(220);
  const glowX = useSpring(pointerX, { stiffness: 120, damping: 20, mass: 0.8 });
  const glowY = useSpring(pointerY, { stiffness: 120, damping: 20, mass: 0.8 });
  const prefersReducedMotion = useReducedMotion();

  function updateParallax(clientX, clientY, currentTarget) {
    const rect = currentTarget.getBoundingClientRect();
    const relativeX = (clientX - rect.left) / rect.width - 0.5;
    const relativeY = (clientY - rect.top) / rect.height - 0.5;
    currentTarget.style.setProperty("--auth-parallax-x", `${relativeX * 34}px`);
    currentTarget.style.setProperty("--auth-parallax-y", `${relativeY * 26}px`);
    pointerX.set(clientX - rect.left - 210);
    pointerY.set(clientY - rect.top - 210);
  }

  function resetParallax(currentTarget) {
    currentTarget.style.setProperty("--auth-parallax-x", "0px");
    currentTarget.style.setProperty("--auth-parallax-y", "0px");
    pointerX.set(260);
    pointerY.set(220);
  }

  function handlePointerMove(event) {
    if (prefersReducedMotion) {
      return;
    }

    updateParallax(event.clientX, event.clientY, event.currentTarget);
  }

  function handlePointerLeave(event) {
    if (prefersReducedMotion) {
      return;
    }

    resetParallax(event.currentTarget);
  }

  return (
    <div className="auth-shell brand-shell">
      <section
        ref={stageRef}
        className="auth-editorial-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {!prefersReducedMotion ? (
          <motion.div
            className="auth-pointer-glow"
            style={{ x: glowX, y: glowY }}
            aria-hidden="true"
          />
        ) : null}

        <div className="auth-hero-mesh" aria-hidden="true" />
        <div className="auth-hero-noise" aria-hidden="true" />
        <div className="auth-star-dust" aria-hidden="true" />
        <div className="auth-hero-bloom auth-hero-bloom-a" aria-hidden="true" />
        <div className="auth-hero-bloom auth-hero-bloom-b" aria-hidden="true" />
        <div className="auth-hero-bloom auth-hero-bloom-c" aria-hidden="true" />
        <div className="auth-light-beam auth-light-beam-a" aria-hidden="true" />
        <div className="auth-light-beam auth-light-beam-b" aria-hidden="true" />
        <div className="auth-light-beam auth-light-beam-c" aria-hidden="true" />
        <div className="auth-hero-vignette" aria-hidden="true" />
        <div className="auth-particle-field" aria-hidden="true">
          {authParticles.map((particle, index) => (
            <span
              key={`auth-particle-${index}`}
              className="auth-particle-dot"
              style={{
                ...particle,
                width: particle.size,
                height: particle.size,
                animationDelay: particle.delay
              }}
            />
          ))}
        </div>

        <div className="auth-visual-field" aria-hidden="true">
          {authMediaItems.map((item, index) => (
            <motion.figure
              key={item.id}
              className={`auth-media-shell auth-layer-${item.layer}`}
              style={buildMediaStyle(item)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 26, scale: 0.97 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1], delay: item.delay }}
            >
              <motion.div
                className="auth-media-frame"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: [0, item.floatY, 0],
                        rotate: [item.rotation, item.rotation + item.floatRotate, item.rotation],
                        scale: [1, 1.012, 1]
                      }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: item.duration,
                        ease: "easeInOut",
                        repeat: Number.POSITIVE_INFINITY,
                        delay: item.delay + index * 0.04
                      }
                }
              >
                <img
                  src={item.image}
                  alt=""
                  loading={index < 2 ? "eager" : "lazy"}
                  fetchPriority={index < 2 ? "high" : "low"}
                  decoding="async"
                />
              </motion.div>
            </motion.figure>
          ))}
        </div>

        <div className="auth-focus-stage">
          <motion.section
            className="auth-editorial-copy"
            initial="hidden"
            animate="visible"
            variants={revealUpLarge}
            transition={transitionHero}
          >
            <div className="auth-brand-lockup">
              <img className="auth-brand-lockup-image" src={zhixuAssets.horizontal} alt="志序 ZHIXU AI" />
              <span className="auth-brand-dot" aria-hidden="true" />
              <span>AI 高考志愿顾问</span>
            </div>

            <h1>继续你的判断</h1>
            <h2>Return to the decision studio.</h2>
            <p>登录后继续顾问会话。</p>

            <div className="auth-copy-footer">
              {currentUser ? <span className="auth-presence-chip">已检测到登录状态</span> : null}
              <button className="text-link-btn auth-back-link" type="button" onClick={onBack}>
                返回首页
              </button>
            </div>
          </motion.section>

          <motion.section
            className="auth-access-card"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 22, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
          >
            <div className="auth-card-halo" aria-hidden="true" />
            <div className="auth-card-reflection" aria-hidden="true" />

            <div className="auth-panel-mark">
              <img className="auth-panel-logo" src={zhixuAssets.markPaper} alt="" aria-hidden="true" />
              <span className="brand-kicker">Member Access</span>
              <h3>进入顾问席位</h3>
            </div>

            <form className="auth-form-stack" onSubmit={onLogin}>
              <label>
                <span>账号</span>
                <input
                  autoComplete="username"
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
                  autoComplete="current-password"
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

              <button className="primary-btn magnetic-btn auth-submit-btn" type="submit">
                登录并进入
              </button>

              {loginError ? <p className="error-text auth-error-text">{loginError}</p> : null}
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
