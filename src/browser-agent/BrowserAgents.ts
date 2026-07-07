import {createAgent , HumanMessage} from 'langchain';
import { BASE_SYSTEM_PROMPT } from './prompt/prompt';
import { LLM } from '@/llm/LLM';
import { searchTools } from '@/tools/webTools';
import { toolMonitoringMiddleware } from '@/app/middleware/toolMonitoring';

export async function BrowserAgent() 
{
    // Create LLM Instance 
    const llm = LLM.getInstance("cerebras");

    const agent = createAgent({
        model : llm,
        tools : [...searchTools],
        systemPrompt : BASE_SYSTEM_PROMPT, 
        middleware : [toolMonitoringMiddleware]
    });


    async function invokeBrowserAgent(userInput : string)
    {
        const agentOutput = await agent.invoke(
            {
                messages : [
                    new HumanMessage(userInput),
                ]
            }
        );

        const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;
        return aiResponse;
    }

    async function streamBrowserAgent(userInput : string, config : any)
    {
        
        let fullContent = "";
        for await (const chunk of await agent.stream
        (
            { messages : [ {role : "user" , content : userInput} ],},
            { streamMode : "updates" , configurable : {} }
        )) {
            const updates = chunk?.tools?.messages
            const req = chunk?.model_request?.messages;

            if(updates && updates.length > 0)
            {
                // Tool Result
            }

            if(req && req.length > 0)
            {
                const aiMsg = req[0];
                const content = aiMsg?.content ?? "";
                const hasToolCalls = (aiMsg as any)?.tool_calls && (aiMsg as any)?.tool_calls.length > 0;

                if(hasToolCalls)
                {
                    // Tool Calls : AI Thinking
                    config.writer({
                        manager_name : "BrowserAgent",
                        content : '<think>' + content + '</think>',


                    });
                }
                else
                {
                    // AI Response
                    fullContent += content;
                    config.writer({
                        manager_name : "BrowserAgent",
                        content : content,
                    });
                }


            }
        }



        return {fullContent}
    }

    return { invokeBrowserAgent, streamBrowserAgent };
}

