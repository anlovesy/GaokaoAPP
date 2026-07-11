import { getPersonaProfile, getSharedGuardrails } from "./personaProfiles.js";

export class PersonaEngine {
  build({ advisorMode = "xuefeng", contextPacket = null } = {}) {
    const profile = getPersonaProfile(advisorMode);
    const contextHints = [];

    if (contextPacket?.workspace?.hasPlan) {
      contextHints.push("当前已有正式志愿方案，请优先围绕这张表回答。");
    }

    if (contextPacket?.session?.isFollowUp) {
      contextHints.push("当前是连续追问场景，必须顺着上一轮继续往下说，不要重新起题。");
    }

    if (contextPacket?.profile?.province || contextPacket?.profile?.track) {
      contextHints.push(
        `当前用户画像锚点：${[
          contextPacket?.profile?.province,
          contextPacket?.profile?.track,
          contextPacket?.profile?.score ? `${contextPacket.profile.score}分` : "",
          contextPacket?.profile?.rank ? `位次${contextPacket.profile.rank}` : ""
        ]
          .filter(Boolean)
          .join(" / ")}。`
      );
    }

    if (contextPacket?.memory?.summary) {
      contextHints.push(`已提取到的稳定记忆：${contextPacket.memory.summary}`);
    }

    if (contextPacket?.memory?.conversationSummary) {
      contextHints.push(`连续对话摘要：${contextPacket.memory.conversationSummary}`);
    }

    const sections = [
      ...getSharedGuardrails(),
      `当前人格模式：${profile.label}。`,
      `人格特征：${profile.traits.join("；")}。`,
      ...profile.instructions,
      ...contextHints
    ];

    return {
      profile,
      systemPrompt: sections.join("\n")
    };
  }
}

export function createPersonaEngine() {
  return new PersonaEngine();
}
