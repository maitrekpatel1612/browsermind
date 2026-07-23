import { createAgent, HumanMessage } from 'langchain';
import { BASE_SYSTEM_PROMPT } from './prompt/prompt';
import { LLM } from '@/llm/LLM';
import { searchTools } from '@/tools/search/webTools';
import { toolMonitoringMiddleware } from '@/app/middleware/toolMonitoring';
import { delegateAgentTool2 } from '@/tools/browser/delegateTool';
import { clickTool } from '@/tools/browser/clickTool';
import { hoverTool } from '@/tools/browser/hoverTool';
import { typeTool } from '@/tools/browser/typeTool';
import { fillFormTool } from '@/tools/browser/fillFormTool';
import { pressKeyTool } from '@/tools/browser/pressKeyTool';
import { scrollTool } from '@/tools/browser/scrollTool';
import { selectOptionTool } from '@/tools/browser/selectTool';
import { switchFrameTool, switchTabTool, switchToMainFrameTool } from '@/tools/browser/iframeTool';
import { getPageTextTool } from '@/tools/browser/getPageTextTool';
import { getPageInfoTool } from '@/tools/browser/getPageInfoTool';
import { AIMessage } from '@langchain/core/messages';

export async function BrowserAgent() {
    // Create LLM Instance 
    const llm = LLM.getInstance("cerebras");

    const agent = createAgent({
        model: llm,
        tools: [
            // Search Tools
            // ...searchTools,
            delegateAgentTool2,
            // BrowserTools
            clickTool,
            hoverTool,
            typeTool,
            fillFormTool,
            pressKeyTool,
            scrollTool,
            selectOptionTool,

            // Frame
            switchFrameTool,
            switchToMainFrameTool,
            switchTabTool,

            // Text
            getPageTextTool,
            getPageInfoTool,

        ],
        systemPrompt: BASE_SYSTEM_PROMPT,
        middleware: [toolMonitoringMiddleware]
    });


    async function invokeBrowserAgent(userInput: string) {
        const agentOutput = await agent.invoke(
            {
                messages: [
                    new HumanMessage(userInput),
                ]
            }
        );

        const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;
        return aiResponse;
    }


    //TODO : Change here
    async function streamBrowserAgent(chatHistory: any[], config: any) {

        let fullContent = "";


        for await (const chunk of await agent.stream
            (
                // { messages : [ {role : "user" , content : chatHistory} ],},
                { messages: [...chatHistory] },
                { streamMode: "updates", configurable: {} }
            )) {
            console.dir(chunk, { depth: null });

            // const updates = chunk?.tools?.messages
            // const req = chunk?.model_request?.messages;

            // if (updates && updates.length > 0) {
            //     // Tool Result

            //     if (updates[0].name === "delegate_agent") {

            //         fullContent += updates[0]?.content;
            //         config.writer({
            //             manager_name: "BrowserAgent",
            //             content: '<think>' + updates[0]?.content + '</think>',
            //         })
            //     }

            //     if (req && req.length > 0) {
            //         const aiMsg = req[0];
            //         const content = aiMsg?.content ?? "";
            //         const hasToolCalls = (aiMsg as any)?.tool_calls && (aiMsg as any)?.tool_calls.length > 0;

            //         if (hasToolCalls) {
            //             // Tool Calls : AI Thinking
            //             config.writer({
            //                 manager_name: "BrowserAgent",
            //                 content: '<think>' + content + '</think>',
            //             });
            //         }
            //         else {
            //             // AI Response
            //             fullContent += content;
            //             config.writer({
            //                 manager_name: "BrowserAgent",
            //                 content: content,
            //             });
            //         }
            //     }
            // }

            const updates = chunk?.tools?.messages;
            const req = chunk?.model_request?.messages;

            // ---------------- Tool Updates ----------------

            if (updates && updates.length > 0) {
                // Emit each tool update to the stream and console for debugging
                for (const u of updates) {
                    try {
                        const toolPayload = {
                            name: u.name,
                            content: u.content,
                            args: (u as any).args ?? u.lc_kwargs?.args ?? null,
                            status: (u as any).status ?? null,
                        };

                        console.log(`Tool Completed Successfully=====================\n${JSON.stringify(toolPayload)}`);

                        // Surface tool events into the graph stream so the controller/browser can consume them
                        config.writer({
                            manager_name: "BrowserAgent",
                            content: `<tool name="${u.name}">${typeof u.content === 'string' ? u.content : JSON.stringify(u.content)}</tool>`,
                        });

                        // Aggregate text responses (if any)
                        if (typeof u.content === "string") {
                            fullContent += u.content;
                        }
                    }
                    catch (e) {
                        console.error('Error emitting tool update', e);
                    }
                }
            }

            // ---------------- Model Response ----------------

            if (req && req.length > 0) {
                // There can be multiple model messages; surface them individually
                for (const aiMsgRaw of req) {
                    const aiMsg = aiMsgRaw as AIMessage;
                    const content = aiMsg.content ?? "";
                    const hasToolCalls = aiMsg.tool_calls && aiMsg.tool_calls.length > 0;

                    // Emit model-level events for debugging
                    try {
                        config.writer({
                            manager_name: "BrowserAgent",
                            content: `<model name="${aiMsg.name ?? 'model'}">${hasToolCalls ? '<has_tool_calls/>' : ''}${content}</model>`,
                        });
                    }
                    catch (e) {
                        console.error('Error emitting model update', e);
                    }

                    if (hasToolCalls) {
                        // keep thinking markers when the model is invoking tools
                        config.writer({
                            manager_name: "BrowserAgent",
                            content: `<think>${content}</think>`,
                        });
                    } else {
                        fullContent += content;
                        config.writer({
                            manager_name: "BrowserAgent",
                            content,
                        });
                    }
                }
            }
        }

        return { fullContent };
    }

    return { invokeBrowserAgent, streamBrowserAgent };
}

