import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { advisorModeOptions } from "../../config.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";
import { revealUp, transitionGentle } from "../../motion/presets.js";

function SummaryChips({ items }) {
  return (
    <div className="advisor-summary-chips">
      {items.map((item) => (
        <article key={item.label} className="advisor-summary-chip">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function AdvisorWorkbench({
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
  onClose,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  setChatInput
}) {
  const chatScrollRef = useRef(null);

  const activeModeLabel =
    advisorModeOptions.find((item) => item.value === advisorMode)?.label || advisorMode;

  const summaryItems = useMemo(
    () => [
      {
        label: "当前模式",
        value: activeModeLabel
      },
      {
        label: "上下文",
        value: hasPlanningContext ? "已连接" : "未附加"
      },
      {
        label: "消息数",
        value: String(chatMessages.length).padStart(2, "0")
      }
    ],
    [activeModeLabel, chatMessages.length, hasPlanningContext]
  );

  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages, chatLoading]);

  return (
    <section className="advisor-experience-shell">
      <div className="advisor-experience-glow advisor-experience-glow-a" aria-hidden="true" />
      <div className="advisor-experience-glow advisor-experience-glow-b" aria-hidden="true" />

      <motion.header
        className="advisor-premium-head"
        initial="hidden"
        animate="visible"
        variants={revealUp}
        transition={transitionGentle}
      >
        <div className="advisor-premium-copy">
          <span className="brand-kicker">AI ADVISOR</span>
          <h1>继续追问</h1>
          <p>让一次判断继续深入，而不是重新开始。</p>
        </div>

        <div className="advisor-premium-actions">
          <SummaryChips items={summaryItems} />
          <div className="advisor-head-actions">
            <button className="text-link-btn" type="button" onClick={onClose}>
              返回工作台
            </button>
            <button className="text-link-btn" type="button" onClick={onResetSession}>
              新会话
            </button>
          </div>
        </div>
      </motion.header>

      <div className="advisor-experience-grid">
        <motion.aside
          className="advisor-mode-rail advisor-experience-panel"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.52, delay: 0.06 }}
        >
          <section className="advisor-rail-section advisor-rail-section-intro">
            <span className="brand-kicker">MODE</span>
            <h2>顾问模式</h2>
            <p>切换不同的判断视角，但保留同一段连续对话。</p>
          </section>

          <section className="advisor-rail-section">
            <div className="advisor-mode-stack">
              {advisorModeOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`advisor-mode-button ${advisorMode === item.value ? "active" : ""}`}
                  onClick={() => onModeChange(item.value)}
                >
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="advisor-rail-section">
            <div className="advisor-rail-title">
              <span className="brand-kicker">MEMORY</span>
              <button
                className="text-link-btn"
                type="button"
                onClick={onSendPlanningContext}
                disabled={chatLoading || !chatEnabled || !hasPlanningContext}
              >
                附上当前方案
              </button>
            </div>

            <div className="advisor-context-minimal advisor-memory-grid">
              {contextHighlights.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="advisor-rail-section">
            <span className="brand-kicker">PROMPTS</span>
            <div className="advisor-prompt-cloud">
              {activeQuickQuestions.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="editorial-chip prompt-chip"
                  onClick={() => onSendChat(item)}
                  disabled={chatLoading || !chatEnabled}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        </motion.aside>

        <motion.section
          className="advisor-conversation-stage advisor-experience-panel"
          initial="hidden"
          animate="visible"
          variants={revealUp}
          transition={{ duration: 0.52, delay: 0.12 }}
        >
          <div className="advisor-stage-head">
            <div className="advisor-stage-identity">
              <span className="advisor-stage-badge">{advisorConfig.badge}</span>
              <span className="advisor-stage-status">
                {chatEnabled ? "会话已解锁" : "登录后继续完整对话"}
              </span>
            </div>

            {!chatEnabled ? (
              <button className="text-link-btn" type="button" onClick={onAuthClick}>
                登录解锁
              </button>
            ) : null}
          </div>

          <div className="advisor-conversation-hero">
            <span className="brand-kicker">CONVERSATION</span>
            <h2>把问题问深一点</h2>
            <p>围绕学校、专业、城市与风险继续追问。</p>
          </div>

          <ChatTranscript
            advisorBadge={advisorConfig.badge}
            chatLoading={chatLoading}
            className="advisor-chat-stage"
            messages={chatMessages}
            scrollRef={chatScrollRef}
            typingLabel="正在整理你的下一步判断..."
          />

          <div className="advisor-input-stage">
            <textarea
              ref={overlayInputRef}
              rows="5"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={chatEnabled ? "继续追问学校、专业、城市与风险" : "登录后继续完整对话"}
              disabled={!chatEnabled}
            />

            <div className="advisor-input-actions">
              <button
                className="primary-btn magnetic-btn"
                type="button"
                onClick={() => onSendChat()}
                disabled={chatLoading || !chatEnabled}
              >
                {chatLoading ? "思考中..." : "发送"}
              </button>
            </div>
          </div>
        </motion.section>
      </div>
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
  formState,
  hasPlanningContext,
  onAuthClick,
  onBackToWorkspace,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  setChatInput
}) {
  return (
    <div className="advisor-page-shell brand-shell">
      <div className="advisor-page-layout">
        <AdvisorWorkbench
          activeQuickQuestions={activeQuickQuestions}
          advisorConfig={advisorConfig}
          advisorMode={advisorMode}
          chatEnabled={chatEnabled}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatMessages={chatMessages}
          contextHighlights={advisorContextHighlights}
          formState={formState}
          hasPlanningContext={hasPlanningContext}
          onAuthClick={onAuthClick}
          onClose={onBackToWorkspace}
          onModeChange={onModeChange}
          onResetSession={onResetSession}
          onSendChat={onSendChat}
          onSendPlanningContext={onSendPlanningContext}
          overlayInputRef={overlayInputRef}
          setChatInput={setChatInput}
        />
      </div>
    </div>
  );
}
