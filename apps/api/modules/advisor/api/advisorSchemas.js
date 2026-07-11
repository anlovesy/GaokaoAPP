import { z } from "zod";

export const advisorChatSchema = z.object({
  provider: z.string().optional().default("auto"),
  advisorMode: z.enum(["xuefeng", "gentle"]).optional().default("xuefeng"),
  sessionId: z.string().optional().nullable(),
  planningContext: z.any().optional().nullable(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});
