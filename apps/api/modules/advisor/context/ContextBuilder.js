export class ContextBuilder {
  build({
    payload,
    latestSession = null,
    mergedMessages = [],
    recentHistory = [],
    memorySnapshot = null
  }) {
    const currentUserMessage =
      [...mergedMessages].reverse().find((message) => message.role === "user")?.content || "";
    const previousAssistantContent =
      [...mergedMessages]
        .slice(0, -1)
        .reverse()
        .find((message) => message.role === "assistant")?.content || "";

    const profile = extractProfileSnapshot(payload?.planningContext);
    const workspace = extractWorkspaceSnapshot(payload?.planningContext);
    const session = extractSessionSnapshot({
      payload,
      latestSession,
      mergedMessages,
      currentUserMessage
    });
    const history = extractHistorySnapshot(recentHistory);

    const planningNarrative = buildPlanningNarrative({
      profile,
      workspace,
      session,
      history,
      memory: memorySnapshot
    });

    return {
      profile,
      workspace,
      session,
      history,
      memory: memorySnapshot,
      currentUserMessage,
      previousAssistantContent,
      recentMessages: mergedMessages.slice(-12),
      planningNarrative
    };
  }
}

export function createContextBuilder() {
  return new ContextBuilder();
}

function extractProfileSnapshot(planningContext) {
  const profile = planningContext?.profile || {};
  return {
    province: profile.province || "",
    track: profile.track || "",
    score: Number(profile.score || 0) || 0,
    rank: Number(profile.rank || 0) || 0,
    selectedSubjects: Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : [],
    candidateType: profile.candidateType || "",
    riskLabel: profile.riskLabel || ""
  };
}

function extractWorkspaceSnapshot(planningContext) {
  const applicationPlan = Array.isArray(planningContext?.applicationPlan)
    ? planningContext.applicationPlan
    : [];
  const topRush = applicationPlan?.[0]?.schools?.[0] || null;
  const topSteady = applicationPlan?.[1]?.schools?.[0] || null;
  const topSafe = applicationPlan?.[2]?.schools?.[0] || null;

  return {
    hasPlan: applicationPlan.length > 0,
    diagnosis: planningContext?.diagnosis || null,
    summary: planningContext?.summary || null,
    topRush,
    topSteady,
    topSafe,
    tierCounts: applicationPlan.map((tier) => ({
      tierClass: tier?.tierClass || "",
      tierLabel: tier?.tierLabel || "",
      count: Array.isArray(tier?.schools) ? tier.schools.length : 0
    }))
  };
}

function extractSessionSnapshot({ payload, latestSession, mergedMessages, currentUserMessage }) {
  const latestStoredMessages = Array.isArray(latestSession?.messages) ? latestSession.messages : [];
  const isFollowUp = mergedMessages.length > 2 || latestStoredMessages.length > 2;

  return {
    sessionId: payload?.sessionId || "",
    isFollowUp,
    latestStoredMessageCount: latestStoredMessages.length,
    mergedMessageCount: mergedMessages.length,
    currentUserMessage,
    lastAssistantPreview:
      [...mergedMessages]
        .slice(0, -1)
        .reverse()
        .find((message) => message.role === "assistant")
        ?.content?.slice(0, 120) || ""
  };
}

function extractHistorySnapshot(recentHistory = []) {
  const recentSessions = recentHistory.slice(0, 3).map((item) => ({
    sessionId: item.sessionId || "",
    createdAt: item.createdAt || "",
    lastReplyPreview: String(item.replyText || "").slice(0, 120)
  }));

  return {
    recentSessions
  };
}

function buildPlanningNarrative({ profile, workspace, session, history, memory }) {
  const blocks = [];
  const memoryNarrative = buildMemoryNarrative(memory);

  if (workspace.hasPlan) {
    blocks.push("以下是当前 Advisor 的工作台上下文，请优先基于这些信息回答。");
    if (memoryNarrative) {
      blocks.push(memoryNarrative);
    }
    blocks.push(
      JSON.stringify(
        {
          profile,
          workspace: {
            summary: workspace.summary,
            diagnosis: workspace.diagnosis,
            topRush: workspace.topRush,
            topSteady: workspace.topSteady,
            topSafe: workspace.topSafe,
            tierCounts: workspace.tierCounts
          },
          session: {
            isFollowUp: session.isFollowUp,
            mergedMessageCount: session.mergedMessageCount,
            currentUserMessage: session.currentUserMessage,
            lastAssistantPreview: session.lastAssistantPreview
          },
          history,
          memory: memory
            ? {
                version: memory.version,
                profile: memory.profile,
                preferences: memory.preferences,
                conversation: {
                  recentTopicKeys: memory.conversation?.recentTopicKeys || [],
                  isFollowUp: memory.conversation?.isFollowUp || false
                }
              }
            : null
        },
        null,
        2
      )
    );
    return blocks.join("\n");
  }

  return [
    "当前没有已生成的正式志愿方案，请根据用户提问给出一般性志愿建议。",
    memoryNarrative,
    JSON.stringify(
      {
        profile,
        session: {
          isFollowUp: session.isFollowUp,
          mergedMessageCount: session.mergedMessageCount,
          currentUserMessage: session.currentUserMessage
        },
        history,
        memory: memory
          ? {
              version: memory.version,
              profile: memory.profile,
              preferences: memory.preferences,
              conversation: {
                recentTopicKeys: memory.conversation?.recentTopicKeys || [],
                isFollowUp: memory.conversation?.isFollowUp || false
              }
            }
          : null
      },
      null,
      2
    )
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMemoryNarrative(memory) {
  if (!memory) {
    return "";
  }

  return [memory.summary, memory.conversationSummary].filter(Boolean).join("\n");
}
