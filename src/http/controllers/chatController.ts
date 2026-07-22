import { graph } from '@/graph/agent-collaboration';
import { Request, Response } from 'express';
import { writeToChatHistoryTool } from '@/tools/chat-history/chathistoryTools';
import { HumanMessage } from '@langchain/core/messages';
import { uuidv7 } from "uuidv7";

export const postChatStream = async (req: Request, res: Response) => {
    try {
        // const { message, userId } = req.body;
        // if (!message || !userId) {
        //     return res.status(400).json({ ok: false, error: 'Missing message or userId in request body.' });
        // }

        /**
         * Testing : userId = "0001" and message = "Hello, how are you?"
         */

        const userId = "0001";
        const message = "Hello, how are you?";

        // streaming response headers
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transformq');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        //Send Server Sent Event (SSE) to the client
        const sendSSE = (event: string, data: any) => {
            res.write(`event: ${event}\ndata : ${JSON.stringify(data)}\n\n`);
            (res as any).flush?.();
        };

        /**
         * Testing input : 
         */
        const testInput = `
            visit:https://lilianweng.github.io/ 
            Visit the FAQ Page and tell me the email that we should use to report errors
        `;


        //If exisitingThreadId is provided, continue the existing thread, else start a new thread
        // const input: any = { messages: [{ role: "user", content: message }], userId };
        const input = { messages: [new HumanMessage(testInput)], userId };


        const config = {
            streamMode: "custom" as const,
            subgraphs: true,
            recursionLimit: 400,
            configurable: {}

        }

        const graphStream = await graph.stream(input, config);

        // Write to chat history [User Message]
        writeToChatHistoryTool.invoke({
            messages: [{
                id: uuidv7(),
                role: "user",
                content: message,
                userId: userId,
                threadId: uuidv7(),
                hitl: {
                    status: false,
                }
            }]
        }).catch((error: Error) => {
            console.error("History Write Error", error.message);
        });


        //Chat History Tools
        let streamingText = ``;
        let thinkingBuffer = ``;
        let inThinking = false;

        try {
            let lastNamespace = '';

            for await (const [namespace, chunk] of graphStream) {

                console.log("========== STREAM ==========");
                console.log("Namespace:", namespace);
                console.dir(chunk, { depth: null });

                // Emit agent lifecycle events when namespace changes
                const nsString = Array.isArray(namespace) ? namespace.join('.') : String(namespace || '');
                if (nsString !== lastNamespace) {
                    sendSSE('agent', { from: lastNamespace || null, to: nsString || null });
                    console.log(`[Agent] transitioned from '${lastNamespace}' to '${nsString}'`);
                    lastNamespace = nsString;
                }

                if ((chunk as any).manager_name || (chunk as any).content) {
                    const content = (chunk as any).content;

                    // Normalize and log raw content to the browser for transparency
                    sendSSE("raw", { namespace, raw: content });

                    // Handle structured tool/model tags we emit from BrowserAgent
                    const toolTagMatch = typeof content === 'string' && content.match(/^<tool name="([^\"]+)">([\s\S]*)<\/tool>$/);
                    const modelTagMatch = typeof content === 'string' && content.match(/^<model name="([^\"]+)">([\s\S]*)<\/model>$/);
                    const thinkTagMatch = typeof content === 'string' && content.match(/^<think>([\s\S]*)<\/think>$/);

                    if (toolTagMatch) {
                        const [, toolName, toolContent] = toolTagMatch;
                        sendSSE("tool", { tool: toolName, content: toolContent });
                        streamingText += toolContent;
                    }
                    else if (modelTagMatch) {
                        const [, modelName, modelContent] = modelTagMatch;
                        sendSSE("model", { model: modelName, content: modelContent });
                        streamingText += modelContent.replace(/<has_tool_calls\/>/, '');
                    }
                    else if (thinkTagMatch) {
                        const [, thinkContent] = thinkTagMatch;
                        thinkingBuffer += thinkContent;
                        sendSSE("thinking", { thinking: thinkContent });
                    }
                    else if (typeof content === 'string') {
                        // Fallback: split on think markers if present
                        const parts = content.split(/(<think>|<\/think>)/);

                        parts.forEach((part: string) => {
                            if (part === "<think>") {
                                inThinking = true;
                            }
                            else if (part === "</think>") {
                                inThinking = false;
                            }
                            else if (part.length > 0) {
                                if (inThinking) {
                                    thinkingBuffer += part;
                                    sendSSE("thinking", { thinking: part });
                                }
                                else {
                                    streamingText += part;
                                    sendSSE("message", { message: part });
                                }
                            }
                        })
                    }
                    else {
                        // unknown chunk type — forward raw
                        sendSSE("unknown", { data: content });
                    }
                }
            }

            //Write to chat history [AI Message]
            writeToChatHistoryTool.invoke({
                messages: [{
                    id: uuidv7(),
                    role: "ai",
                    thinking: thinkingBuffer,
                    content: streamingText,
                    userId: userId,
                    threadId: uuidv7(),
                    hitl: {
                        status: false,
                    }
                }]
            }).catch((error: Error) => {
                console.error("History Write Error", error.message);
            });

            // End the stream
            sendSSE("end", { ok: true });
            res.end();
        }
        catch (error: any) {
            console.error('Streaming Error', (error as Error));
            sendSSE("error", { error: (error as Error).message });
            res.end();
        }

    } catch (err: any) {
        console.error('Router Error', err);
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
}