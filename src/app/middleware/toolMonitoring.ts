import {tool, createAgent, createMiddleware, Tool} from "langchain";
import errorMap from "zod/v3/locales/en.cjs";

export const toolMonitoringMiddleware = createMiddleware({
    name: "toolMonitoringMiddleware",
    wrapToolCall : async (request, handler) => {
        console.log(`Executing tool =================: ${request.toolCall.name}`);
        console.log(`Arguments=====================: ${JSON.stringify(request.toolCall.args)}`);

        try{
            const result = await handler(request);
            console.log("Tool Completed Successfully=====================");
            return result;
        }
        catch(err)
        {
            console.error(`Tool Execution Failed=====================: ${err}`);
            throw err;
        }
    },
})
