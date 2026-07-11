import {
  extractConversationSignals,
  extractPreferenceMemory,
  extractStableProfileMemory,
  extractWorkspaceMemory
} from "./memoryExtractor.js";
import { buildConversationSummary, buildMemorySummary } from "./summaryCompressor.js";

export class MemoryEngine {
  build({ payload, latestSession = null, mergedMessages = [], recentHistory = [] } = {}) {
    const planningContext = payload?.planningContext || null;
    const profile = extractStableProfileMemory(planningContext);
    const preferences = extractPreferenceMemory(planningContext);
    const workspace = extractWorkspaceMemory(planningContext);
    const conversation = extractConversationSignals({
      mergedMessages,
      recentHistory,
      latestSession,
      planningContext
    });

    const snapshot = {
      version: "memory-engine-v1",
      profile,
      preferences,
      workspace,
      conversation
    };

    return {
      ...snapshot,
      summary: buildMemorySummary(snapshot),
      conversationSummary: buildConversationSummary(snapshot)
    };
  }
}

export function createMemoryEngine() {
  return new MemoryEngine();
}
