import { END, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { readImageTool } from "@/tools/browser/visionTool";
import { takeScreenshotTool } from "@/tools/browser/screenShot";
import { LLM } from "@/llm/LLM";
import { createAgent, HumanMessage } from 'langchain';
import { removeThinkTag } from "@/utils/removeThinkTag";


// Coordinator
export const visionAgentNode = async (state: any, config: any) => {

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
        tools: [readImageTool, takeScreenshotTool],
        systemPrompt:
            `
        You are a Vision Agent that can analyze images and screenshots to extract information.
        Your sole responsibility is to take a screenshot and analyze image 

        Tools available to you:
        1. read_image: Use this tool to analyze images and extract information from them.
        2. take_screenshot: Use this tool to take a screenshot of the current webpage.

        Your output format shoule be like this :
        - page title
        - page 
        - screenshot summary returned by the read_image tool
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
            messages: [new AIMessage(`<message_from_vision_agent> ${aiResponse} </message_from_vision_agent>`)],
            fromNode: "visionAgentNode",
            nextNode: "BrowserAgentNode",
        },
        goto: "BrowserAgentNode"
    });
}