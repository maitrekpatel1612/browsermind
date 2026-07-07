import {END, START, StateGraph, Annotation, MessagesAnnotation, Command} from "@langchain/langgraph";
import {AIMessage} from "@langchain/core/messages";
import {BrowserAgent} from "@/browser-agent/BrowserAgents";

// Define Graph State for Agent Collaboration
const StateAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    userId : Annotation(),
    nextNode : Annotation(),
})

// Coordinator
const BrowserAgentNode = async (state : any, config : any) => {
    const {userId} = state;

    const last = state.messages.filter((m : any) => m._getType() === "human").slice(-1)[0]; // Means : Get the last human message in the messages array
    if(!last) {
        throw new Error("No human message found in the messages array.");
    }

    const {streamBrowserAgent} = await BrowserAgent();
    const {fullContent} = await streamBrowserAgent(last?.content , config)

    return new Command({
        update : {messages : [new AIMessage(fullContent)], nextNode : END},
        goto : END
    })
}

// Workflow Graph
const workflow = new StateGraph(StateAnnotation)
    .addNode("BrowserAgent", BrowserAgentNode)
    .addEdge(START, "BrowserAgent")
    .addEdge("BrowserAgent", END)

// Compile Graph
export const graph = workflow.compile();