import { END, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { LLM } from "@/llm/LLM";
import { createAgent, HumanMessage } from 'langchain';
import { webScrapperTool } from "@/tools/search/webTools";
import { removeThinkTag } from "@/utils/removeThinkTag";

// Coordinator
export const webScrapperAgentNode = async (state: any, config: any) => {

    const last = state.messages
        .filter((m: any) => m._getType() === "ai")
        .slice(-1)[0]; // Get the last AI message in the messages array

    if (!last) {
        throw new Error("No AI message found in the messages array.");
    }

    const cleanMessage = removeThinkTag(last?.content);

    const browserInput = ` Message from BrowserAgent on behalf of the user : ${cleanMessage}\n `;

    const model = LLM.getInstance("cerebras");

    const agent = createAgent({
        model: model,
        tools: [webScrapperTool],
        systemPrompt: `
        You are a Web Scrapper Agent that can scrape information from web pages.
        Your sole responsibility is to scrape information from web pages and return the relevant content.
        Tools available to you:
        1. scrape_url: Use this tool to scrape information from web pages.
        `
    });


    const agentOutput = await agent.invoke({
        messages: [
            new HumanMessage(browserInput)
        ]
    })

    const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;

    return new Command({
        update: {
            messages: [new AIMessage(`<message_from_web_scrapper_agent> ${aiResponse} </message_from_web_scrapper_agent>`)],
            fromNode: "webScrapperAgentNode",
            nextNode: "BrowserAgentNode"
        },
        goto: "BrowserAgentNode"
    });




}