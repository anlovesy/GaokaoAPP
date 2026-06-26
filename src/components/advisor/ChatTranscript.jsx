import { formatChatTimestamp } from "../../app/utils.js";

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
      {messages.map((message, index) => (
        <div
          key={message.id || `${message.role}-${index}`}
          className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}
        >
          <div className="chat-message-head">
            <strong>{message.role === "user" ? "你" : advisorBadge}</strong>
            <span>{formatChatTimestamp(message.timestamp)}</span>
          </div>
          <p>{message.content}</p>
        </div>
      ))}

      {chatLoading ? (
        <div className="chat-message assistant typing">
          <div className="chat-message-head">
            <strong>{advisorBadge}</strong>
            <span>思考中</span>
          </div>
          <div className="chat-typing" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>{typingLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
