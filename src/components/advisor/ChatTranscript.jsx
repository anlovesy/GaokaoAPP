import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { formatChatTimestamp } from "../../app/utils.js";
import { messageReveal } from "../../motion/presets.js";

export function ChatTranscript({
  advisorBadge,
  chatLoading,
  className = "",
  messages,
  scrollRef = null,
  typingLabel
}) {
  return (
    <div className={`chat-box advisor-chat-box ${className}`.trim()} ref={scrollRef}>
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const sourceLabel = [message.provider, message.model].filter(Boolean).join(" / ");
        const speakerLabel = isUser ? "你" : advisorBadge;
        const avatarLabel = isUser ? "你" : "AI";

        return (
          <motion.article
            key={message.id || `${message.role}-${index}`}
            className={`chat-message-shell ${isUser ? "user" : "assistant"}`}
            variants={messageReveal}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={`chat-message-avatar ${isUser ? "user" : "assistant"}`}>
              <span>{avatarLabel}</span>
            </div>

            <div className={`chat-message-card ${isUser ? "user" : "assistant"}`}>
              <div className="chat-message-meta">
                <div className="chat-message-author">
                  <strong>{speakerLabel}</strong>
                  <span>{formatChatTimestamp(message.timestamp)}</span>
                </div>

                {sourceLabel ? (
                  <div className="chat-source-card">
                    <span>模型</span>
                    <strong>{sourceLabel}</strong>
                  </div>
                ) : null}
              </div>

              <div className={`chat-message ${isUser ? "user" : "assistant"}`}>
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ""}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.article>
        );
      })}

      {chatLoading ? (
        <motion.article
          className="chat-message-shell assistant typing"
          variants={messageReveal}
          initial="hidden"
          animate="visible"
        >
          <div className="chat-message-avatar assistant">
            <span>AI</span>
          </div>

          <div className="chat-message-card assistant typing">
            <div className="chat-message-meta">
              <div className="chat-message-author">
                <strong>{advisorBadge}</strong>
                <span>思考中</span>
              </div>
            </div>

            <div className="chat-message assistant typing">
              <div className="chat-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>{typingLabel}</p>
            </div>
          </div>
        </motion.article>
      ) : null}
    </div>
  );
}
