import { END, Command } from "@langchain/langgraph";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { BrowserAgent } from "@/browser-agent/BrowserAgents";
import { getNextNode } from "@/utils/getNextNode";
import { typeTool } from "@/tools/browser/typeTool";


export const BrowserAgentNode = async (state: any, config: any) => {
    const { userId } = state;

    const humanMessages = (state.messages ?? [])
        .filter((m: any) => m?._getType?.() === "human");

    const lastHumanMessage = humanMessages[humanMessages.length - 1];

    if (!lastHumanMessage) {
        throw new Error("No human message found in the messages array.");
    }

    const { streamBrowserAgent } = await BrowserAgent();

    const chatHistory = [

        new HumanMessage(`
            <user_instructions>
            
                <active_web_page>
                    This is the current open page or tab : ${state.activeWebPage}
                </active_web_page>

                <navigator_agent_message>
                    ${lastHumanMessage?.content}

                    <website_page_info?
                        ${state.pageInfo}
                    </website_page_info>

                    <website_accessibility_tree>
                        ${state.pageStructure}
                    </website_accessibility_tree>

                </navigator_agent_message>
            </user_instructions>
        `)
    ];


    console.log("Before streamBrowserAgent");

    const { fullContent } = await streamBrowserAgent(chatHistory, config);

    console.log("After streamBrowserAgent");
    console.log("FULL CONTENT:", fullContent);


    const { shouldHandoff, nextNode } = getNextNode(fullContent);

    //TODO: Work on the System prompt of the Browser

    // Transfer to another agent if needed [Handoff Pattern]
    if (shouldHandoff) {
        return new Command({
            update: { messages: [new AIMessage(fullContent)], nextNode: nextNode },
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