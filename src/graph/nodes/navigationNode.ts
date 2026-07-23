import { END, Command } from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import { browserManager } from "@/browser/BrowserManager";
import { dismissOverlaysTool } from "@/tools/browser/dismissOverlaysTool";
import { getPageInfoTool } from "@/tools/browser/getPageInfoTool";
import { navigateTool } from "@/tools/browser/navigateTool";
import { getAccessibilityTreeTool } from "@/tools/browser/getAccessibilityTreeTool";
import { LLM } from "@/llm/LLM";
import { z } from "zod";
import { removeThinkTag } from "@/utils/removeThinkTag";

// Coordinator
export const navigationAgentNode = async (state: any, config: any) => {

    let browserInput = "";
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage._getType() === "human") {
        browserInput = lastMessage.content; //Initial user input from the human
    }
    else {
        // BrowserAgent delegated back to NavigationAgent
        browserInput =
            `Message from the BrowserAgent on behalf of the user:\n` + removeThinkTag(lastMessage.content);
    }

    const { weblink, userRequest, valid } = await getURL(`${browserInput}`);
    console.log({
        browserInput, weblink, userRequest
    })

    if (valid) {


        // Lauch Browser if not already launched
        await browserManager.launchBrowser();

        const url = browserManager.isLaunched() ? browserManager.getPage().url() : "-";
        console.log(`[navigationAgentNode] Browser Launched: ${browserManager.isLaunched()} | Current URL: ${url} | Navigating to: ${weblink}`);
        // Navigate tool
        await navigateTool.invoke({
            url: weblink,
            waitUntil: "load"
        })

        // DimssiOverlays Tool
        await dismissOverlaysTool.invoke({ force: false });

        // Full Accessibility Tree
        const [pageInfo, pageStructure] = await Promise.all([
            getPageInfoTool.invoke({}),
            getAccessibilityTreeTool.invoke({})
        ]);


        // wait for element (for SPA)


        return new Command({
            update: {
                pageStructure: `Here is the accessibility tree of the page ${weblink} : \n\n\ ${pageStructure}`,
                pageInfo: pageInfo,
                activeWebPage: weblink,
                messages: [
                    new HumanMessage(`
                    The navigator agent has visited this page ${weblink} and has retrieved the page information and accessibility tree.
                    You as the browser agent handle the interaction.
                    Use the accessibility tree as a map, here's the on going user input

                    <on_going_user_input>
                    ${userRequest}
                    </on_going_user_input>
                `)
                ],
                nextNode: "BrowserAgentNode"
            },
            goto: "BrowserAgentNode"
        })

    }
    else {

        return new Command({
            update: {
                pageStructure: null,
                pageInfo: null,
                messages: [
                    new AIMessage(`
                        Please provide a valid URL 
                    `)
                ],
                nextNode: "END"
            },
            goto: END
        })

    }
}


async function getURL(userInput: string) {

    const model = LLM.getInstance("cerebras");
    const structuredLLM = model.withStructuredOutput(
        z.object({
            link: z.string().describe("Direct URL to navigate to"),
            userRequest: z.string().describe("User request that will be passed to the interaction Browser Agent"),
            remainingTask: z.string()
        })
    )


    const result = await structuredLLM.invoke([
        new SystemMessage(
            `
            You are a web navigation agent.

            Your task is to determine the single best URL and user request that should be return to the browser agent.
            Rules: 
            - Return only one URL and the userRequest
            - Do not return any text other than the URL in the "link" field.
            - Ensure the URL is valid and includes the protocol https://
            `
        ),
        new HumanMessage(userInput)
    ])


    const valid = isValidURL(result?.link);
    if (valid) {
        return {
            valid,
            userRequest: result?.userRequest,
            weblink: result?.link
        }
    }
    else {
        return {
            valid,
            weblink: result?.link
        }
    }

}

function isValidURL(url: string): boolean {
    try {
        const parsed = new URL(url);
        return (parsed.protocol === "http:" || parsed.protocol === "https:")
    }
    catch {
        return false;
    }
}