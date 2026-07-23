import { UserData } from "@/app/types/user-types";
import { appendFile } from "@/utils/fsUtils";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import path from "path";

export function writeMemory(memoryRoot: string, userData: UserData) {

    const writeMemoryTool = tool(
        async ({ content }) => {

            const now = new Date();
            const time = now.toTimeString().slice(0, 8);
            const memoryContent = `## [Time: ${time}] ${content}\n\n`;

            try {
                const memoryRoot = path.resolve(process.cwd(), "public", "memory");
                return appendFile(memoryRoot, `MEMORY-${userData.userId}.md`, memoryContent);
            }
            catch (error) {
                return JSON.stringify({ message: "file your typing to read doesn't exist" })
            }
        },
        {
            name: "write_memory",
            description: `
                This tool allows you to write into the Long-Term Memory MEMORY.md 
                Append a new insight about the user to their MEMORY-{userId}.md profile file.
                Use for new preferences, goals, patterns, or domain knowledge discovered in the conversation.
            `,
            schema: z.object({
                content: z.string().describe("The content to be written to the long-term memory."),
            })
        }
    )
    return { writeMemoryTool };
}