import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";
import { config } from "process";

const AGENTS = [
    'navigationAgent',
    'visionAgent',
    'javascriptAgent',
    'webscrapperAgent'
]

export const delegateAgentTool = tool(
    async ({ context, agent_name }, config) => {
        try {
            if (agent_name === "navigationAgent") {
                return `<think> __TRANSFER_NAVIGATION_AGENT__ + ${context} </think>`;
            }
            else if (agent_name === "visionAgent") {
                return `<think> __TRANSFER_VISION_AGENT__ + ${context} </think>`;
            }
            else if (agent_name === "webscrapperAgent") {
                return `<think> __TRANSFER_WEB_SCRAPPER_AGENT__ + ${context} </think>`;
            }
            else if (agent_name === "javascriptAgent") {
                return `<think> __TRANSFER_JS_AGENT__ + ${context} </think>`;
            }

        }
        catch (error) {
            return JSON.stringify({
                error: "to delegate a task, you should pass as agent_name:slack_agent, navigator_agent, vision_agent, javascript_agent, web_scrapper_agent and context: the context of the task to be delegated."
            })
        }
    },
    {
        name: "delegate_agent",
        description: `Delegate a task to a specific agent. You should return this to the user to as final response to initiate tranfer 
        eg. 
        <think> __TRANSFER__ + 
        The user wants you to check the example folder for the multi agent builder skill. They noticed that in some examples,
        where the icon prop is missing from tool objects that are passed to agents.
        </think>
        Note that you must have to follow this response format:
        <think> __TRANSFER__ + context
        </think>

        Available agents to delegate tasks to: ${AGENTS.join(", ")}

        `,
        schema: z.object({
            context: z.string().describe("The context of the task to be delegated."),
            agent_name: z.enum(AGENTS).describe("The name of the agent to delegate the task to."),
        })
    }
)