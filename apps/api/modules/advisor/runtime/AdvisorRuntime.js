import { mergeChatMessages, trimMessagesForStorage } from "./messageThread.js";

export class AdvisorRuntime {
  constructor({
    loadLatestSession,
    loadChatHistory,
    citationFormatter,
    contextBuilder,
    intentRecognizer,
    memoryEngine,
    planner,
    personaEngine,
    responsePolicyEngine,
    reflectionEngine,
    toolRouter,
    generateReply,
    saveSessionHistory,
    saveHistory
  }) {
    this.loadLatestSession = loadLatestSession;
    this.loadChatHistory = loadChatHistory;
    this.citationFormatter = citationFormatter;
    this.contextBuilder = contextBuilder;
    this.intentRecognizer = intentRecognizer;
    this.memoryEngine = memoryEngine;
    this.planner = planner;
    this.personaEngine = personaEngine;
    this.responsePolicyEngine = responsePolicyEngine;
    this.reflectionEngine = reflectionEngine;
    this.toolRouter = toolRouter;
    this.generateReply = generateReply;
    this.saveSessionHistory = saveSessionHistory;
    this.saveHistory = saveHistory;
  }

  async handleChatTurn({ payload, access }) {
    const latestSession = this.loadLatestSession({
      userId: access.user?.id,
      sessionId: payload.sessionId,
      isAdmin: access.isAdmin
    });
    const recentHistory = this.loadChatHistory
      ? this.loadChatHistory({
          limit: 3,
          userId: access.user?.id,
          isAdmin: access.isAdmin
        })
      : [];

    const mergedMessages = mergeChatMessages(latestSession?.messages, payload.messages);
    const memorySnapshot = this.memoryEngine
      ? this.memoryEngine.build({
          payload,
          latestSession,
          mergedMessages,
          recentHistory
        })
      : null;
    const contextPacket = this.contextBuilder.build({
      payload,
      latestSession,
      mergedMessages,
      recentHistory,
      memorySnapshot
    });
    const intentResult = this.intentRecognizer
      ? this.intentRecognizer.recognize({
          mergedMessages,
          contextPacket,
          memorySnapshot
        })
      : null;
    const executionPlan = this.planner
      ? this.planner.plan({
          intentResult,
          contextPacket,
          memorySnapshot
        })
      : null;
    const toolExecution = this.toolRouter
      ? this.toolRouter.execute({
          executionPlan,
          contextPacket,
          memorySnapshot,
          payload
        })
      : null;
    const responsePolicy = this.responsePolicyEngine
      ? this.responsePolicyEngine.build({
          advisorMode: payload.advisorMode,
          intentResult,
          executionPlan,
          toolExecution,
          contextPacket,
          memorySnapshot
        })
      : null;
    const persona = this.personaEngine.build({
      advisorMode: payload.advisorMode,
      contextPacket
    });
    const reply = await this.generateReply({
      ...payload,
      preferredProvider: payload.provider,
      messages: mergedMessages,
      planningContext: payload.planningContext,
      systemPromptOverride: mergeNarratives(persona.systemPrompt, responsePolicy?.systemPrompt),
      planningNarrativeOverride: mergeNarratives(
        contextPacket.planningNarrative,
        executionPlan?.narrative,
        toolExecution?.narrative,
        responsePolicy?.narrative
      ),
      recentMessagesOverride: contextPacket.recentMessages,
      currentUserMessageOverride: contextPacket.currentUserMessage,
      previousAssistantContentOverride: contextPacket.previousAssistantContent,
      responsePolicyOverride: responsePolicy,
      contextPacketOverride: contextPacket,
      intentResultOverride: intentResult,
      executionPlanOverride: executionPlan,
      toolExecutionOverride: toolExecution,
      memorySnapshotOverride: memorySnapshot
    });
    const formattedCitationBundle = this.citationFormatter
      ? this.citationFormatter.format({
          citations: toolExecution?.citations || []
        })
      : {
          version: "disabled",
          citations: toolExecution?.citations || [],
          summary: []
        };
    const reflectionResult = this.reflectionEngine
      ? this.reflectionEngine.review({
          reply: reply.reply,
          intentResult,
          executionPlan,
          toolExecution,
          formattedCitations: formattedCitationBundle,
          contextPacket,
          memorySnapshot
        })
      : null;

    const persistedMessages = trimMessagesForStorage(
      [...mergedMessages, { role: "assistant", content: reply.reply }],
      20
    );

    if (payload.sessionId) {
      this.saveSessionHistory({
        userId: access.user?.id,
        sessionId: payload.sessionId,
        provider: payload.provider,
        messages: persistedMessages,
        replyText: reply.reply
      });
    } else {
      this.saveHistory({
        userId: access.user?.id,
        provider: payload.provider,
        messages: persistedMessages,
        replyText: reply.reply
      });
    }

    return {
      ...reply,
      meta: {
        ...(reply.meta || {}),
        runtime: "advisor-runtime-v1",
        executionMode: "legacy-compatible",
        personaMode: persona.profile.mode,
        contextVersion: "context-builder-v2",
        memoryVersion: memorySnapshot?.version || "disabled",
        intentVersion: intentResult?.version || "disabled",
        plannerVersion: executionPlan?.version || "disabled",
        toolRouterVersion: toolExecution?.version || "disabled",
        responsePolicyVersion: responsePolicy?.version || "disabled",
        entityResolverVersion: toolExecution?.entities?.version || "disabled",
        citationFormatterVersion: formattedCitationBundle?.version || "disabled",
        reflectionVersion: reflectionResult?.version || "disabled",
        primaryIntent: intentResult?.primaryIntent || "general_follow_up",
        clarificationNeeded: executionPlan?.clarificationNeeded || false,
        responseFocus: responsePolicy?.focus || null,
        responseEvidenceStrength: responsePolicy?.evidenceProfile?.strength || "unknown",
        plannedTools: executionPlan?.plannedTools || [],
        entities: toolExecution?.entities || createEmptyEntityMeta(),
        toolInvocations: toolExecution?.invocations || [],
        citations: formattedCitationBundle?.citations || [],
        citationSummary: formattedCitationBundle?.summary || [],
        reflection: reflectionResult
      }
    };
  }
}

function mergeNarratives(...narratives) {
  return narratives.filter(Boolean).join("\n\n");
}

function createEmptyEntityMeta() {
  return {
    version: "disabled",
    universities: [],
    majors: [],
    policyTopics: [],
    primaryUniversity: null,
    primaryMajor: null
  };
}
