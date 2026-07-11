import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { advisorModeOptions } from "../../config.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";
import {
  revealSoft,
  revealUp,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/advisor.css";

function AdvisorOrb() {
  return (
    <div className="advisor-studio-orb" aria-hidden="true">
      <span className="advisor-studio-orb-ring advisor-studio-orb-ring-a" />
      <span className="advisor-studio-orb-ring advisor-studio-orb-ring-b" />
      <span className="advisor-studio-orb-ring advisor-studio-orb-ring-c" />
      <span className="advisor-studio-orb-core" />
      <span className="advisor-studio-orb-particle advisor-studio-orb-particle-a" />
      <span className="advisor-studio-orb-particle advisor-studio-orb-particle-b" />
      <span className="advisor-studio-orb-particle advisor-studio-orb-particle-c" />
    </div>
  );
}

function FoldPanel({ index, title, action, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`advisor-fold-panel ${open ? "is-open" : ""}`}>
      <header className="advisor-fold-head">
        <button type="button" className="advisor-fold-toggle" onClick={() => setOpen((value) => !value)}>
          <span>{String(index).padStart(2, "0")}</span>
          <strong>{title}</strong>
        </button>
        {action ? <div className="advisor-fold-action">{action}</div> : null}
      </header>
      {open ? <div className="advisor-fold-body">{children}</div> : null}
    </section>
  );
}

function AdvisorWorkspace({
  activeQuickQuestions,
  advisorConfig,
  advisorMode,
  chatEnabled,
  chatInput,
  chatLoading,
  chatMessages,
  contextHighlights,
  hasPlanningContext,
  onAuthClick,
  onBackToWorkspace,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  setChatInput,
  topAccessory
}) {
  const prefersReducedMotion = useReducedMotion();
  const chatScrollRef = useRef(null);

  const activeModeLabel =
    advisorModeOptions.find((item) => item.value === advisorMode)?.label || advisorMode;

  const summaryItems = useMemo(
    () => [
      { label: "Mode", value: activeModeLabel },
      { label: "Context", value: hasPlanningContext ? "已附加" : "未附加" },
      { label: "Messages", value: String(chatMessages.length).padStart(2, "0") }
    ],
    [activeModeLabel, chatMessages.length, hasPlanningContext]
  );

  const currentSuggestion =
    activeQuickQuestions[0] || "先判断城市与专业的优先级，再决定这一层是否继续上探。";
  const memoryItems = contextHighlights.slice(0, 3);
  const recentMessages = chatMessages.slice(-2);

  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages, chatLoading]);

  return (
    <section className="advisor-os-shell">
      <div className="advisor-background-grid" aria-hidden="true" />

      <motion.div
        className="advisor-os"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <header className="advisor-topbar advisor-panel-surface">
          <motion.div
            className="advisor-topbar-copy"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealUp}
            transition={transitionGentle}
          >
            <span className="advisor-eyebrow">AI Copilot Studio</span>
            <h1>继续追问</h1>
            <p>让这一轮判断持续推进，而不是重新从头开始。</p>
          </motion.div>

          <div className="advisor-topbar-actions">
            <button className="advisor-secondary-button" type="button" onClick={onBackToWorkspace}>
              返回工作台
            </button>
            <button className="advisor-secondary-button" type="button" onClick={onResetSession}>
              新建会话
            </button>
            {!chatEnabled ? (
              <button className="advisor-primary-button" type="button" onClick={onAuthClick}>
                登录解锁
              </button>
            ) : null}
            {topAccessory}
          </div>
        </header>

        <div className="advisor-studio-layout">
          <motion.aside
            className="advisor-side-rail advisor-panel-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <div className="advisor-side-summary">
              <span className="advisor-eyebrow">Mode Layer</span>
              <h2>顾问视角</h2>
              <p>切换推理方式，但保持同一条判断路径连续推进。</p>

              <div className="advisor-summary-grid">
                {summaryItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </div>

            <div className="advisor-mode-grid">
              {advisorModeOptions.map((item) => (
                <motion.button
                  key={item.value}
                  type="button"
                  className={`advisor-mode-chip ${advisorMode === item.value ? "active" : ""}`}
                  variants={prefersReducedMotion ? undefined : staggerItem}
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  transition={transitionGentle}
                  onClick={() => onModeChange(item.value)}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>

            <section className="advisor-memory-panel">
              <div className="advisor-memory-head">
                <span className="advisor-eyebrow">Memory</span>
                <button
                  className="advisor-text-link"
                  type="button"
                  onClick={onSendPlanningContext}
                  disabled={chatLoading || !chatEnabled || !hasPlanningContext}
                >
                  附上当前方案
                </button>
              </div>

              <div className="advisor-memory-grid">
                {memoryItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="advisor-rail-note">
              <span className="advisor-eyebrow">Current Thread</span>
              <strong>{currentSuggestion}</strong>
              <p>
                {hasPlanningContext
                  ? "当前志愿方案已经接入上下文，接下来更适合继续问学校、专业与取舍。"
                  : "建议先把当前方案附加进来，再继续追问，会更接近真正连续的判断。"}
              </p>
            </section>
          </motion.aside>

          <motion.main
            className="advisor-main-stage advisor-panel-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.08 }}
          >
            <section className="advisor-hero-panel">
              <div className="advisor-hero-copy">
                <span className="advisor-eyebrow">Current Thinking</span>
                <h2>AI Advisor is Thinking...</h2>
                <p>综合分数、位次、城市和专业偏好，持续生成下一轮判断。</p>
              </div>

              <div className="advisor-hero-visual">
                <AdvisorOrb />
              </div>
            </section>

            <div className="advisor-panel-grid">
              <FoldPanel
                index={1}
                title="Current Focus"
                action={<span className="advisor-mini-pill">{advisorConfig.badge}</span>}
              >
                <strong className="advisor-focus-text">{currentSuggestion}</strong>
                <p>
                  {hasPlanningContext
                    ? "当前方案已经作为上下文接入，AI 会沿着同一条判断路径继续推进。"
                    : "建议先附上当前方案，再继续追问学校、专业与城市取舍。"}
                </p>
              </FoldPanel>

              <FoldPanel
                index={2}
                title="AI Thinking"
                action={<span className="advisor-mini-pill">{chatEnabled ? "会话已解锁" : "体验态"}</span>}
              >
                <div className="advisor-thinking-metrics">
                  {summaryItems.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </FoldPanel>

              <FoldPanel index={3} title="Suggestions">
                <div className="advisor-suggestion-list">
                  {activeQuickQuestions.slice(0, 4).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSendChat(item)}
                      disabled={chatLoading || !chatEnabled}
                    >
                      <span>{item}</span>
                      <em>{"->"}</em>
                    </button>
                  ))}
                </div>
              </FoldPanel>

              <FoldPanel index={4} title="History">
                <div className="advisor-history-list">
                  {recentMessages.map((message, index) => (
                    <article key={message.id || `${message.role}-${index}`}>
                      <span />
                      <div>
                        <strong>{message.role === "user" ? "你" : advisorConfig.badge}</strong>
                        <p>{message.content || ""}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </FoldPanel>

              <FoldPanel index={5} title="Quick Actions">
                <div className="advisor-action-list">
                  <button type="button" onClick={onResetSession}>
                    重置会话
                  </button>
                  <button
                    type="button"
                    onClick={onSendPlanningContext}
                    disabled={chatLoading || !chatEnabled || !hasPlanningContext}
                  >
                    附上当前方案
                  </button>
                  <button type="button" onClick={onBackToWorkspace}>
                    返回工作台
                  </button>
                </div>
              </FoldPanel>
            </div>

            <section className={`advisor-conversation-panel ${chatEnabled ? "is-chat" : "is-guest"}`}>
              {chatEnabled ? (
                <ChatTranscript
                  advisorBadge={advisorConfig.badge}
                  chatLoading={chatLoading}
                  className="advisor-chat-transcript"
                  messages={chatMessages}
                  scrollRef={chatScrollRef}
                  typingLabel="正在整理你的下一轮判断..."
                />
              ) : (
                <div className="advisor-guest-panel">
                  <div className="advisor-guest-copy">
                    <span className="advisor-eyebrow">Unlock Session</span>
                    <strong>登录后继续沿用当前志愿上下文，完整保留对话与判断轨迹。</strong>
                    <p>现在的体验态只展示结构，正式对话、保存与持续追问会在登录后完整开放。</p>
                  </div>

                  <button className="advisor-primary-button" type="button" onClick={onAuthClick}>
                    登录解锁
                  </button>
                </div>
              )}
            </section>
          </motion.main>
        </div>

        <div className="advisor-input-dock advisor-panel-surface">
          <textarea
            ref={overlayInputRef}
            rows={chatEnabled ? 3 : 2}
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={chatEnabled ? "继续追问学校、专业、城市与风险" : "登录后继续完整对话"}
            disabled={!chatEnabled}
          />

          <div className="advisor-input-actions">
            <button
              className="advisor-primary-button"
              type="button"
              onClick={() => onSendChat()}
              disabled={chatLoading || !chatEnabled}
            >
              {chatLoading ? "思考中..." : "发送"}
            </button>
            {!chatEnabled ? (
              <button className="advisor-secondary-button" type="button" onClick={onAuthClick}>
                登录解锁
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function AdvisorScreen({
  activeQuickQuestions,
  advisorConfig,
  advisorContextHighlights,
  advisorMode,
  chatEnabled,
  chatInput,
  chatLoading,
  chatMessages,
  hasPlanningContext,
  onAuthClick,
  onBackToWorkspace,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  setChatInput,
  topAccessory
}) {
  return (
    <AdvisorWorkspace
      activeQuickQuestions={activeQuickQuestions}
      advisorConfig={advisorConfig}
      advisorMode={advisorMode}
      chatEnabled={chatEnabled}
      chatInput={chatInput}
      chatLoading={chatLoading}
      chatMessages={chatMessages}
      contextHighlights={advisorContextHighlights}
      hasPlanningContext={hasPlanningContext}
      onAuthClick={onAuthClick}
      onBackToWorkspace={onBackToWorkspace}
      onModeChange={onModeChange}
      onResetSession={onResetSession}
      onSendChat={onSendChat}
      onSendPlanningContext={onSendPlanningContext}
      overlayInputRef={overlayInputRef}
      setChatInput={setChatInput}
      topAccessory={topAccessory}
    />
  );
}
