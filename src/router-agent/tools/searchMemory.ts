import { tool } from "@langchain/core/tools";
import { z } from "zod";
import path from "path";
import { queryVectorDB } from "@/router-agent/pipelines/retriever";
import { bm25Retriever, formatDocumentsAsString } from "../pipelines/bm25Retriever";
import { customLLMExtractor } from "../custom-extractor/LLMExtractor";
import { MemoryHandler } from "../handler/MemoryHandler";

export const searchMemoryTool = tool(
    async ({ query }, config) => {

        const userId = config.configurable?.userId;

        const memoryRoot = path.resolve(process.cwd(), "public", "memory");
        const memoryStr = new MemoryHandler(memoryRoot, { userId });

        let relevantLongTermMemory = '';

        // Fetch data from vertory dbs (pinecone and bm25)
        const archiveLog = await memoryStr.readArchiveFile();

        const vectorData = await queryVectorDB({ userId: userId, query })

        const docToString = formatDocumentsAsString(vectorData?.retrievedDocs);

        relevantLongTermMemory += `\n\n#<data_retrieved_from_vector_db> \n${docToString}\n\n<data_retrieved_from_vector_db>#`;

        if (archiveLog.exist) {
            const bm25Data = await bm25Retriever(archiveLog?.data as string, query)
            relevantLongTermMemory += `\n\n#<data_retrieved_from_daily_log_archive> ${bm25Data}</data_retrieved_from_daily_log_archive>#`;
        }


        const filteredData = (await customLLMExtractor(relevantLongTermMemory, query)) as string | undefined;

        const longTermMemory = `# Relevent Long Term Memory Layer\n ${filteredData ?? "No relevant long-term memories found."}`

        return `${longTermMemory}`;

    },
    {
        name: "search_memory",
        description: "Searches the long-term memory for relevant information based on the provided query.",
        schema: z.object({
            query: z.string().describe("The query to search in the long-term memory."),
        }),
    }
)