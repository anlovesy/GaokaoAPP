import { useEffect, useRef } from "react";
import { advisorModeOptions } from "../../config.js";
import { ChatTranscript } from "../../components/advisor/ChatTranscript.jsx";

function AdvisorWorkbenchV2({
  activeQuickQuestions,
  advisorConfig,
  advisorMode,
  chatEnabled,
  chatInput,
  chatLoading,
  chatMessages,
  contextHighlights,
  dataStatus,
  formState,
  hasPlanningContext,
  onAuthClick,
  onClose,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  providers,
  setChatInput,
  soulQuestions
}) {
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages]);

  return (
    <section className="workspace-chat surface-card advisor-dialog advisor-dialog-v2">
      <div className="advisor-dialog-topbar advisor-dialog-topbar-hero">
        <div>
          <p className="section-kicker">AI Agent Workspace</p>
          <h2>聊天式 AI 志愿顾问</h2>
          <p className="workspace-subtitle">
            这里是独立顾问工作区。左侧负责判断框架和追问入口，右侧专门用来持续聊透学校、专业、城市、就业和风险。
          </p>
          <div className="advisor-workbench-strip">
            <span className="soft-chip">判断先行</span>
            <span className="soft-chip">连续追问</span>
            <span className="soft-chip">广东优先</span>
          </div>
        </div>

        <div className="advisor-dialog-actions">
          <span className="summary-tag">{advisorConfig.shortLabel}</span>
          <button className="secondary-btn" type="button" onClick={onResetSession}>
            新会话
          </button>
          <button className="ghost-btn" type="button" onClick={onClose}>
            返回工作台
          </button>
        </div>
      </div>

      <div className="advisor-stage">
        <aside className="advisor-rail">
          <div className="advisor-presence advisor-presence-locked">
            <div className="presence-copy">
              <span className="presence-badge">{advisorConfig.badge}</span>
              <h3>{advisorMode === "xuefeng" ? "先给判断，再讲道理" : "先帮你理顺，再陪你细化"}</h3>
              <p>{advisorConfig.opening}</p>
            </div>

            <div className="advisor-presence-points">
              <span>看当前志愿表，不空谈</span>
              <span>先判断，再解释利弊</span>
              <span>最后给你下一步动作</span>
            </div>

            <div className="mode-switcher">
              {advisorModeOptions.map((item) => {
                const active = advisorMode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`mode-card ${active ? "active" : ""}`}
                    onClick={() => onModeChange(item.value)}
                  >
                    <strong>{item.label}</strong>
                    <p>{item.tone}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="prompt-section">
            <div className="prompt-card">
              <strong>现在最适合先问</strong>
              <div className="chip-grid">
                {activeQuickQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip prompt-chip"
                    onClick={() => onSendChat(item)}
                    disabled={chatLoading || !chatEnabled}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="prompt-card">
              <strong>顾问会继续追问这些关键点</strong>
              <div className="chip-grid">
                {soulQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip soul-chip"
                    onClick={() => onSendChat(item)}
                    disabled={chatLoading || !chatEnabled}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chat-meta advisor-meta-stack">
            <span className="soft-chip">
              模型：
              {providers.find((item) => item.id === formState.aiProvider)?.label ||
                (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider)}
            </span>
            <span className="soft-chip">
              数据：
              {dataStatus?.imported ? "已导入真实结构数据" : "内置演示数据 + 规则模型"}
            </span>
            <span className="soft-chip">
              记忆：
              {chatEnabled ? "连续问答已开启" : "游客模式未开放"}
            </span>
          </div>

          <article className="advisor-guidance-card">
            <strong>建议你这样用</strong>
            <p>先把当前方案发给顾问，再围绕“学校和专业谁优先”“只留广东要牺牲什么”“哪些专业组最危险”这三类问题往下追问，效率最高。</p>
          </article>

          <article className="advisor-guidance-card advisor-guidance-card-strong">
            <strong>高质量追问模板</strong>
            <p>直接问“把保底里最稳的 3 个挑出来”“只留广东后把整张表重排”“告诉我哪几个专业组最容易坑我”，顾问会更快进入实战状态。</p>
          </article>

          <div className="advisor-context-panel">
            <div className="section-head compact">
              <div>
                <p className="section-kicker">Planner Memory</p>
                <h3>当前志愿上下文</h3>
              </div>
              <button
                className="ghost-btn compact"
                type="button"
                onClick={onSendPlanningContext}
                disabled={chatLoading || !chatEnabled || !hasPlanningContext}
              >
                一键发给顾问
              </button>
            </div>

            <div className="advisor-context-grid">
              {contextHighlights.map((item) => (
                <article key={item.label} className="advisor-context-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <div className="advisor-conversation">
          <div className="advisor-conversation-head">
            <div>
              <p className="section-kicker">Live Conversation</p>
              <h3>主对话区</h3>
              <p className="workspace-subtitle">这里负责连续追问、解释理由、重排方案。尽量把问题说具体，顾问会更像真人老师一样接着往下聊。</p>
            </div>
            <div className="conversation-tools">
              <span className="summary-tag">{chatEnabled ? "可连续追问" : "登录后解锁完整对话"}</span>
              <button className="ghost-btn compact" type="button" onClick={onResetSession}>
                清空会话
              </button>
            </div>
          </div>

          <div className="advisor-conversation-status">
            <span className="presence-badge">{advisorConfig.badge}</span>
            <p>{chatEnabled ? "顾问会结合当前志愿表、最近聊天记录和你的这次追问，继续往下拆学校、专业、城市与风险。" : "登录后可开启完整上下文记忆、连续追问和历史记录恢复。"}</p>
          </div>

          <ChatTranscript
            advisorBadge={advisorConfig.badge}
            chatLoading={chatLoading}
            className="advisor-chat-box-v2"
            messages={chatMessages}
            scrollRef={chatScrollRef}
            typingLabel="顾问正在沿着这轮上下文继续拆解..."
          />

          <div className="chat-input-panel advisor-input-panel advisor-input-panel-v2">
            <div className="input-tip">
              {chatEnabled
                ? "继续追问时，顾问会沿用当前志愿方案和最近上下文，不会重新从头回答。"
                : "游客模式不开放连续聊天，登录后可解锁 AI 连续追问、历史记录和上下文记忆。"}
            </div>

            <textarea
              ref={overlayInputRef}
              rows="5"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={
                chatEnabled
                  ? "例如：把保底院校里最稳的 3 个单独挑出来，告诉我为什么稳，再顺便说说有没有调剂风险。"
                  : "登录后可在这里继续追问志愿顺序、专业选择、城市取舍与风险控制。"
              }
              disabled={!chatEnabled}
            />

            <div className="chat-action-row">
              <button
                className="primary-btn"
                type="button"
                onClick={() => onSendChat()}
                disabled={chatLoading || !chatEnabled}
              >
                {chatLoading ? "顾问思考中..." : "发送追问"}
              </button>
              {!chatEnabled ? (
                <button className="secondary-btn" type="button" onClick={onAuthClick}>
                  登录解锁顾问
                </button>
              ) : null}
            </div>
          </div>
        </div>
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
  dataStatus,
  formState,
  hasPlanningContext,
  onAuthClick,
  onBackToWorkspace,
  onModeChange,
  onResetSession,
  onSendChat,
  onSendPlanningContext,
  overlayInputRef,
  providers,
  setChatInput,
  soulQuestions
}) {
  return (
    <div className="advisor-page-shell">
      <div className="advisor-shell advisor-shell-page">
        <AdvisorWorkbenchV2
          activeQuickQuestions={activeQuickQuestions}
          advisorConfig={advisorConfig}
          advisorMode={advisorMode}
          chatEnabled={chatEnabled}
          chatInput={chatInput}
          chatLoading={chatLoading}
          chatMessages={chatMessages}
          contextHighlights={advisorContextHighlights}
          dataStatus={dataStatus}
          formState={formState}
          hasPlanningContext={hasPlanningContext}
          onAuthClick={onAuthClick}
          onClose={onBackToWorkspace}
          onModeChange={onModeChange}
          onResetSession={onResetSession}
          onSendChat={onSendChat}
          onSendPlanningContext={onSendPlanningContext}
          overlayInputRef={overlayInputRef}
          providers={providers}
          setChatInput={setChatInput}
          soulQuestions={soulQuestions}
        />
      </div>
    </div>
  );
}
