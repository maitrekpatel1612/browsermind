import path from "node:path";
import { searchMemoryTool } from "../router-agent/tools/searchMemory";
import { createAgent, createMiddleware, HumanMessage } from "langchain"
import { toolMonitoringMiddleware } from "@/app/middleware/toolMonitoring"
import { MemoryHandler } from "./handler/MemoryHandler";
import { writeMemory } from "./tools/WriteMemory";
import { ContextHandler } from "./handler/ContextHandler";
import { MEMORY_BASE_SYSTEM_PROMPT } from "./prompt/MemorySystemPrompt";
import { delegateAgentTool1 } from "./tools/delegateTool";


export const memoryRoot = path.resolve(process.cwd(), "public", "memory");

/**
 * Memory Augmented Agent
 */

export async function MemoryAugmentedAgent({
    model = "",
    modelContextLimit = 500, // Tokens = 0.5k
    userId = "",
} = {}) 

{
    const memo = new MemoryHandler(memoryRoot, { userId });

    await memo.init();

    const context = new ContextHandler(memo, modelContextLimit, { userId });

    const { writeMemoryTool } = writeMemory(memoryRoot, { userId });

    const agent = createAgent({
        model,
        tools: [searchMemoryTool, writeMemoryTool, delegateAgentTool1],
        systemPrompt: MEMORY_BASE_SYSTEM_PROMPT,
        middleware: [toolMonitoringMiddleware],

    })

    async function streamAgent(userInput: string, config: any) {

        const startTime = Date.now();
        await memo.logInteraction("User", userInput, new Date());

        const assembled = await context.assemble(userInput, {});

        let fullContent = "";
        const toolsUsed: string[] = [];

        for await (const chunk of await agent.stream
            (
                { messages: [{ role: "user", content: assembled?.prompt }] },
                {
                    streamMode: "updates",
                    configurable: { userId, thread_id: `thread_id_${userId}` },
                }
            )) {

            const updates = chunk?.tools?.messages
            const req = chunk?.model_request?.messages;


            if (updates && updates.length > 0) {

                if (updates[0].name === "search_memory" || updates[0].name === "delegate_agent") {
                    fullContent += `<think>${updates[0].content}</think>`;

                    config.writer({
                        manager_name: "memoryManager",
                        content: `<think>${updates[0].content}</think>`,
                    })
                }
            }


            if (req && req.length > 0) {

                const aiMsg = req[0];
                const content = aiMsg?.content ?? "";

                const hasToolCalls = (aiMsg as any)?.tool_calls && (aiMsg as any)?.tool_calls.length > 0;

                if (hasToolCalls) {

                    //AI Thinking
                    config.writer({
                        manager_name: "memoryManager",
                        content: `<think>${content}</think>`,
                    })
                }
                else {
                    fullContent += content;

                    config.writer({
                        manager_name: "memoryManager",
                        content,
                    })
                }
            }
        }

        await memo.logInteraction("Assistant", fullContent, new Date());
        return {
            fullContent,
            contextForAnotherAgent: assembled.contextForAnotherAgent,
        }
    }

    return { streamAgent }
}