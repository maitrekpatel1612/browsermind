import { END, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { LLM } from "@/llm/LLM";
import { createAgent, HumanMessage } from 'langchain';
import { detechCaptchaTool } from "@/tools/browser/captchaTools";
import { runJavaScriptTool } from "@/tools/browser/javaScriptTool";
import { handleDialogTool } from "@/tools/browser/dialogTool";
import { removeThinkTag } from "@/utils/removeThinkTag";


// Coordinator
export const javaScriptAgentNode = async (state: any, config: any) => {

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
        tools: [detechCaptchaTool, runJavaScriptTool, handleDialogTool],
        systemPrompt: `
        You are a Web Navigation Agent collaborating with another agent.
        Your goal is to complete the user's task efficiently and accurately.

        Rules:
        - Observe the current page before taking actions.
        - Prefer the simplest action that moves toward the goal.
        - User available tools when necessary.
        - Detect and handle dialogs before continuing.
        - Check for CAPTCHAs and report them when encountered.
        - Execute Javascript only when it is required to inspect or interact with the page.
        - Do not make assumptions about the page content; rely on the information available on the page.
        - If an action fails, analyze the reason and try an alternative approach.
        - Keep trach of progress and avoid repeating the same failed actions.
        - When the task is completed , clearly report the result.
        - If user input, authentication, payment, or human verification is required, stop and explain what is needed.
        - Never invent information of make assumptions about the page content or user intent. Only act based on the information available on the page.

        Tools available to you:
        1. detect_captcha: Use this tool to detect if a CAPTCHA is present on the page.
        2. run_javascript: Use this tool to execute JavaScript code on the page.
        3. handle_dialog: Use this tool to handle any dialogs that may appear on the page.
        `,
    });


    const agentOutput = await agent.invoke({
        messages: [
            new HumanMessage(browserInput)
        ]
    })

    const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;

    return new Command({
        update: {
            messages: [new AIMessage(`<message_from_javaScript_agent> ${aiResponse} </message_from_javaScript_agent>`)],
            fromNode: "javaScriptAgentNode",
            nextNode: "BrowserAgentNode"
        },
        goto: "BrowserAgentNode"
    });



}