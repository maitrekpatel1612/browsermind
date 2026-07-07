import { graph } from '@/graph/agent-collaboration';
import {Request, Response} from 'express';

export const postChatStream = async (req: Request, res: Response) => {
    try {
        const {message, userId} = req.body;
        if (!message || !userId) {
            return res.status(400).json({ ok: false, error: 'Missing message or userId in request body.' });
        }

        // streaming response headers
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transformq');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        
        //Send Server Sent Event (SSE) to the client
        const sendSSE = (event : string, data : any) => {
            res.write(`event: ${event}\ndata : ${JSON.stringify(data)}\n\n`);
            (res as any).flush?.();
        };

        //If exisitingThreadId is provided, continue the existing thread, else start a new thread
        const input : any = {messages : [{role : "user" , content : message}] , userId};

        const config = {
            streamMode : "custom" as const,
            subgraphs : true,
            recursionLimit : 400,
            configurable : {}

        }

        const graphStream = await graph.stream(input, config);

        //Chat History Tools
        let streamingText = ``;
        let thinkingBuffer = ``;
        let inThinking = false;

        try{
            
            for await (const [namespace , chunk] of graphStream) {

                if((chunk as any).manager_name || (chunk as any).content)
                {
                    const content = (chunk as any).content;
                    const parts = content.split(/(<think>|<\/think>)/);

                    parts.forEach((part : string) => {
                        if(part === "<think>") {
                            inThinking = true;
                        }
                        else if(part === "</think>") {
                            inThinking = false;
                        }
                        else if (part.length > 0) {
                            if(inThinking) {
                                thinkingBuffer += part;
                                sendSSE("thinking", {thinking : part});
                            }
                            else {
                                streamingText += part;
                                sendSSE("message", {message : part});
                            }
                        }
                    })
                }
            }

            //Write to chat history
            sendSSE("end", {ok : true});
            res.end();
        }
        catch(error : any)
        {
            console.error('Streaming Error', (error as Error));
            sendSSE("error", {error : (error as Error).message});
            res.end();
        }

    } catch (err : any) {
        console.error('Router Error', err);
        if(!res.headersSent) {
            res.status(500).json({ ok : false , error : err.message });
        }
    }
}