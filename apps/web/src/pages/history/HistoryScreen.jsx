import { motion, useReducedMotion } from "framer-motion";
import { formatDateTime } from "../../app/utils.js";
import {
  revealSoft,
  revealUp,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/history.css";

function HistoryEmptyState({ guestMode, onAuthClick, onBackToWorkspace }) {
  return (
    <section className="history-empty-panel history-panel-surface">
      <div className="history-empty-orb" aria-hidden="true">
        <span className="history-empty-ring history-empty-ring-a" />
        <span className="history-empty-ring history-empty-ring-b" />
        <span className="history-empty-core" />
      </div>

      <span className="history-eyebrow">Version Vault</span>
      <h2>还没有可恢复的历史方案</h2>
      <p>
        当新的志愿方案被写入后，这里会自动保存每一次关键判断，方便你回看、对比，并在需要时恢复到更稳妥的版本。
      </p>

      <div className="history-empty-actions">
        <button className="history-secondary-button" type="button" onClick={onBackToWorkspace}>
          返回工作台
        </button>
        {guestMode ? (
          <button className="history-primary-button" type="button" onClick={onAuthClick}>
            登录解锁完整历史
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function HistoryScreen({
  currentResult,
  currentUser,
  guestMode,
  historyData,
  onAuthClick,
  onBackToWorkspace,
  onRestorePlan,
  topAccessory
}) {
  const prefersReducedMotion = useReducedMotion();
  const plans = historyData?.plans || [];
  const latestPlan = plans[0] || null;

  const summaryItems = [
    {
      label: "Current Session",
      value: guestMode ? "游客模式" : currentUser?.username || "成员会话",
      note: guestMode ? "当前仍处于体验态" : "已接入正式账户上下文"
    },
    {
      label: "Saved Versions",
      value: String(plans.length).padStart(2, "0"),
      note: plans.length ? "所有关键判断都会被保留" : "等待第一版方案写入"
    },
    {
      label: "Current Workspace",
      value: currentResult?.applicationPlan?.length ? "已有正式方案" : "暂未生成",
      note: currentResult?.applicationPlan?.length
        ? "工作台已经有可继续推进的版本"
        : "建议先回到工作台完成第一轮分析"
    }
  ];

  return (
    <div className="history-os-shell">
      <div className="history-background-grid" aria-hidden="true" />

      <motion.div
        className="history-os"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <section className="history-hero history-panel-surface">
          <motion.header
            className="history-header-bar"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealUp}
            transition={transitionGentle}
          >
            <div className="history-header-copy">
              <span className="history-eyebrow">History Vault</span>
              <h1>保留每一次判断版本</h1>
              <p>这里只做回看、对比与恢复，让每一轮 AI 决策都能被追溯，而不是重新开始。</p>
            </div>

            <div className="history-header-actions">
              <button className="history-secondary-button" type="button" onClick={onBackToWorkspace}>
                返回工作台
              </button>
              {guestMode ? (
                <button className="history-primary-button" type="button" onClick={onAuthClick}>
                  登录解锁完整历史
                </button>
              ) : null}
              {topAccessory}
            </div>
          </motion.header>

          <div className="history-hero-grid">
            <motion.section
              className="history-overview-panel"
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              variants={prefersReducedMotion ? undefined : staggerDense}
            >
              <div className="history-overview-copy">
                <span className="history-eyebrow">Recovery Timeline</span>
                <h2>
                  {latestPlan
                    ? "最近一版决策已经进入可恢复状态"
                    : "历史空间正在等待第一版方案写入"}
                </h2>
                <p>
                  {latestPlan
                    ? latestPlan.result?.summary?.overview ||
                      latestPlan.result?.summary?.strategy ||
                      "你可以直接恢复最近一版方案，或继续向下对比不同版本之间的判断差异。"
                    : "一旦工作台生成正式方案，这里就会成为你的版本仓库，保存关键判断与恢复节点。"}
                </p>
              </div>

              <div className="history-summary-grid">
                {summaryItems.map((item) => (
                  <motion.article
                    key={item.label}
                    className="history-summary-card"
                    variants={prefersReducedMotion ? undefined : staggerItem}
                    whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }}
                    transition={transitionGentle}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            <motion.aside
              className="history-recovery-panel"
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              variants={prefersReducedMotion ? undefined : revealSoft}
              transition={{ ...transitionGentle, delay: 0.1 }}
            >
              <div className="history-orb-field" aria-hidden="true">
                <span className="history-orb-ring history-orb-ring-a" />
                <span className="history-orb-ring history-orb-ring-b" />
                <span className="history-orb-core" />
                <span className="history-orb-particle history-orb-particle-a" />
                <span className="history-orb-particle history-orb-particle-b" />
              </div>

              <div className="history-recovery-copy">
                <span className="history-eyebrow">Restore Ready</span>
                <strong>{latestPlan ? "最新方案可一键恢复" : "等待可恢复版本"}</strong>
                <p>{latestPlan ? formatDateTime(latestPlan.createdAt) : "当方案生成后，这里会显示最近版本时间。"}</p>
              </div>
            </motion.aside>
          </div>
        </section>

        {plans.length ? (
          <motion.section
            className="history-timeline-panel history-panel-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.08 }}
          >
            <div className="history-section-head">
              <div>
                <span className="history-eyebrow">Version Timeline</span>
                <h3>历史方案版本</h3>
              </div>
              <span className="history-status-pill">{String(plans.length).padStart(2, "0")} Versions</span>
            </div>

            <div className="history-version-track">
              {plans.map((item, index) => (
                <motion.article
                  key={item.id || `${item.createdAt}-${index}`}
                  className={`history-version-card ${index === 0 ? "is-latest" : ""}`}
                  whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.008 }}
                  transition={transitionGentle}
                >
                  <div className="history-version-index">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                  </div>

                  <div className="history-version-main">
                    <div className="history-version-meta">
                      <span>Version {String(index + 1).padStart(2, "0")}</span>
                      <strong>{formatDateTime(item.createdAt)}</strong>
                    </div>

                    <div className="history-version-copy">
                      <h4>
                        {item.province || "未知省份"} · {item.score || "--"} 分 · {item.rank || "--"} 位
                      </h4>
                      <p>
                        {item.result?.summary?.overview ||
                          item.result?.summary?.strategy ||
                          "这一版历史方案可用于回看、对比与恢复。"}
                      </p>
                    </div>

                    <div className="history-version-facts">
                      <article>
                        <span>Track</span>
                        <strong>{item.track || "待补全"}</strong>
                      </article>
                      <article>
                        <span>Schools</span>
                        <strong>
                          {String(
                            item.result?.applicationPlan?.reduce(
                              (sum, tier) => sum + (tier.schools?.length || 0),
                              0
                            ) || 0
                          ).padStart(2, "0")}
                        </strong>
                      </article>
                      <article>
                        <span>Status</span>
                        <strong>{index === 0 ? "Latest" : "Archived"}</strong>
                      </article>
                    </div>
                  </div>

                  <div className="history-version-actions">
                    <button
                      className="history-primary-button"
                      type="button"
                      onClick={() => onRestorePlan(item)}
                    >
                      恢复方案
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        ) : (
          <HistoryEmptyState
            guestMode={guestMode}
            onAuthClick={onAuthClick}
            onBackToWorkspace={onBackToWorkspace}
          />
        )}
      </motion.div>
    </div>
  );
}
