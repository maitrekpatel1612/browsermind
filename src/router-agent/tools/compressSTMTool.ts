import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { LLM } from "@/llm/LLM";

const llm = LLM.getInstance("cerebras");

const SYSTEM_PROMPT = `
You are a Memory Compression Agent.
Your task is to compress a full daily chat log into a clean, durable compact summary that captures the essence of the conversation.

Rules:
- Remove all internal reasoning tracees such as <think> blocks.
- Ignore system prompts , tool calls, and assistant planning text.
- Extract only meaningful conversational content.
- Remove timestamps and formatting noise.
- Do NOT rewrite the conversation as dialogue.
- Do NOT add new information.
- Preserve stable user facts.
- Keep summary concise (max 250 words) while retaining essential context.

Output Format (strictly adhere to this format):

# Daily Log Summary
Data: {data}
Status: Compressed

## Overview
{1-2 sentence high-level description}

## Key Facts Extracted
- {fact 1}
- {fact 2}
- {fact 3}

## Conversation Summary
{Short narrative summary of the meaningful events and interactions}

!Strictly, Do not include anything outside this format. 
`;


/**
 * summarize_message(message)
 * Take a long message (or concatenated messages) and produce
 * a compact summary suitable for long-term memory
 */

export const compressSTMTool = tool(
    async ({ message }) => {
        const res = await llm.invoke([
            new SystemMessage(SYSTEM_PROMPT),
            new HumanMessage(message)
        ])
        return res?.content || "No content returned from LLM";
    },
    {
        name: "summarize_message",
        description: "compress memory of a long message into a compact summary",
        schema: z.object({
            message: z
                .string()
                .describe("Raw text or concatenated messages to be summarized.")
        })
    }
)