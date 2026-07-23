import { END, START, StateGraph, Annotation, MessagesAnnotation, Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { BrowserAgent } from "@/browser-agent/BrowserAgents";
import { navigationAgentNode } from "./nodes/navigationNode";
import { BrowserAgentNode } from "./nodes/BrowserAgent";
import { javaScriptAgentNode } from "./nodes/jsAgentNode";
import { visionAgentNode } from "./nodes/visionAgents";
import { webScrapperAgentNode } from "./nodes/webScrapperAgent";
import { routerAgentNode } from "./nodes/routerAgent";
import { researchAgentNode } from "./nodes/ResearchAgent";

// Define Graph State for Agent Collaboration
const StateAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    userId: Annotation(),
    nextNode: Annotation(),
    pageStructure: Annotation(),
    pageInfo: Annotation(),
    activeWebPage: Annotation(),
    fromNode: Annotation(),
    contextForAnotherAgent: Annotation(),
})



// Workflow Graph
const workflow = new StateGraph(StateAnnotation)
    .addNode("routerAgentNode", routerAgentNode)
    .addNode("navigationAgentNode", navigationAgentNode)
    .addNode("BrowserAgentNode", BrowserAgentNode)
    .addNode("visionAgentNode", visionAgentNode)
    .addNode("javaScriptAgentNode", javaScriptAgentNode)
    .addNode("webScrapperAgentNode", webScrapperAgentNode)
    .addNode("researchAgentNode", researchAgentNode)

    .addEdge(START, "routerAgentNode")
    .addConditionalEdges("routerAgentNode", (state) => {
        if (state.nextNode === "navigationAgentNode") {
            return "navigationAgentNode";
        }
        if (state.nextNode === "researchAgentNode") {
            return "researchAgentNode";
        }
        return END;
    })
    // .addEdge(START, "navigationAgentNode")
    .addEdge("navigationAgentNode", "BrowserAgentNode")
    .addConditionalEdges("BrowserAgentNode", (state) => {

        if (state.nextNode === "visionAgentNode") {
            return "visionAgentNode";
        }
        if (state.nextNode === "javaScriptAgentNode") {
            return "javaScriptAgentNode";
        }
        if (state.nextNode === "webScrapperAgentNode") {
            return "webScrapperAgentNode";
        }
        if (state.nextNode === "navigationAgentNode") {
            return "navigationAgentNode";
        }

        return END;
    })
    .addEdge("BrowserAgentNode", END)

// Compile Graph
export const graph = workflow.compile();