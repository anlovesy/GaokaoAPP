export function mergeChatMessages(historyMessages = [], incomingMessages = []) {
  const normalizedHistory = normalizeMessages(historyMessages);
  const normalizedIncoming = normalizeMessages(incomingMessages);

  if (!normalizedHistory.length) {
    return trimMessagesForStorage(normalizedIncoming, 18);
  }

  if (!normalizedIncoming.length) {
    return trimMessagesForStorage(normalizedHistory, 18);
  }

  if (startsWithMessageTrail(normalizedIncoming, normalizedHistory)) {
    return trimMessagesForStorage(normalizedIncoming, 18);
  }

  if (startsWithMessageTrail(normalizedHistory, normalizedIncoming)) {
    return trimMessagesForStorage(normalizedHistory, 18);
  }

  const merged = [...normalizedHistory];
  normalizedIncoming.forEach((message) => {
    const last = merged[merged.length - 1];
    if (last?.role === message.role && last?.content === message.content) {
      return;
    }

    merged.push(message);
  });

  return trimMessagesForStorage(merged, 18);
}

export function trimMessagesForStorage(messages, maxItems = 20) {
  const normalized = normalizeMessages(messages);
  return normalized.slice(-maxItems);
}

export function normalizeMessages(messages) {
  return Array.isArray(messages)
    ? messages.filter((message) => message?.role && message?.content)
    : [];
}

function startsWithMessageTrail(candidateMessages, prefixMessages) {
  if (prefixMessages.length > candidateMessages.length) {
    return false;
  }

  return prefixMessages.every((message, index) => {
    const candidate = candidateMessages[index];
    return candidate?.role === message?.role && candidate?.content === message?.content;
  });
}
