import { END, Command } from "@langchain/langgraph";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { BrowserAgent } from "@/browser-agent/BrowserAgents";
import { getNextNode } from "@/utils/getNextNode";
import { MemoryAugmentedAgent } from "@/router-agent";
import { LLM } from "@/llm/LLM";

export const routerAgentNode = async (state: any, config: any) => {
    const { userId } = state;

    const lastHumanMessage = (state.messages ?? [])
        .filter((m: any) => m?._getType?.() === "human")
        .slice(-1)[0];

    if (!lastHumanMessage) {
        throw new Error("No human message found in the messages array.");
    }

    console.log("Before streamAgent");

    const { streamAgent } = await MemoryAugmentedAgent({
        model: LLM.getInstance("cerebras"),
    });

    const { fullContent, contextForAnotherAgent } = await streamAgent(lastHumanMessage?.content, config);

    console.log("After streamAgent");
    console.log("FULL CONTENT:", fullContent);


    const { shouldHandoff, nextNode } = getNextNode(fullContent);


    // Transfer to another agent if needed [Handoff Pattern]
    if (shouldHandoff) {
        return new Command({
            update: { messages: [new AIMessage(fullContent)], nextNode: nextNode, contextForAnotherAgent: contextForAnotherAgent },
            goto: nextNode,
        });
    }
    console.log({
        fullContent,
        shouldHandoff,
        nextNode,
    });
    // If no handoff is needed, return the final response to the user
    return new Command({
        update: { messages: [new AIMessage(fullContent)], nextNode: END },
        goto: END
    })

}