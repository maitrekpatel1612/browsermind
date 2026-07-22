import { END, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { LLM } from "@/llm/LLM";
import { createAgent, HumanMessage } from 'langchain';
import { searchTool } from "@/tools/search/webTools";


// Coordinator
export const ResearchAgent = async (state: any, config: any) => {


    const last = state.messages
        .filter((m: any) => m._getType() === "ai")
        .slice(-1)[0]; // Get the last AI message in the messages array

    if (!last) {
        throw new Error("No AI message found in the messages array.");
    }

    const model = LLM.getInstance("cerebras");

    const agent = createAgent({
        model: model,
        tools: [searchTool],
        systemPrompt: `
        You are a Research Agent that can perform web searches to gather information.
        Tools available to you:
        1. web_search: Use this tool to perform web searches and gather information from the internet.        `,
    });


    const agentOutput = await agent.invoke({
        messages: [
            new HumanMessage(last?.content)
        ]
    })

    const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;

    return new Command({
        update: { messages: [new AIMessage(aiResponse)], nextNode: "BrowserAgentNode" },
        goto: "BrowserAgentNode"
    });
}