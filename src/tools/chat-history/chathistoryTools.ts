import fs from "fs";
import path from "path";
import { z } from "zod";
import { tool } from "@langchain/core/tools";


const ROOT = process.cwd();
export const CHAT_HISTORY_DIR = path.join(ROOT, "public", "chat_history"); // Means that the chat history will be stored in the public/chat_history directory of the project

// Ensure the chat history directory exists
if (!fs.existsSync(CHAT_HISTORY_DIR)) {
    fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
}

export const HISTORY_FILE = path.join(CHAT_HISTORY_DIR, "chat-history.json");

export const messageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "ai"]),
    userId: z.string(),
    threadId: z.string(),
    content: z.string(),
    thinking: z.string().optional(),
    hitl: z.object({
        status: z.boolean(),
        action: z.object({
            id: z.string().optional(),
            interruptId: z.string().optional(),
            tool_name: z.string().optional(),
            tool_description: z.string().optional(),
            args: z.any().optional(),
            numberOfActionRequest: z.any().optional(),
        }).optional(),
    }).optional(),
});


export const writeToChatHistoryTool = tool(
    async ({ messages }) => {
        try {

            let history: any[] = [];

            // Load old history if exists
            if (fs.existsSync(HISTORY_FILE)) {
                const oldHistory = fs.readFileSync(HISTORY_FILE, "utf-8");
                history = JSON.parse(oldHistory);
            }

            // Append new messages
            history.push(...messages);

            // Save updated history back to the file
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");

            //  Return the ID of the first message in the batch for reference
            if (messages.length > 0) {
                return { chatHistoryId: messages[0]?.id }
            }
            else {
                return { chatHistoryId: undefined }
            }

        }
        catch (error) {
            console.error("Failed to write into chat history:", error);
        }
    },
    {
        name: "WriteToChatHistory",
        description: "Write conversation to chat-history",
        schema: z.object({
            messages: z.array(messageSchema).describe("The messages to be written to the chat history."),
        })
    }
)



export const readChatHistoryTool = tool(
    async ({ userId, threadId }) => {
        try {
            if (!fs.existsSync(HISTORY_FILE)) {
                return "[]";
            }

            // Read the chat history from the file
            const historyData = fs.readFileSync(HISTORY_FILE, "utf-8");
            const history = JSON.parse(historyData);

            // Filter messages based on userId and threadId
            const filteredMessages = history.filter((item: any) => {
                if (userId && threadId) {
                    return item.userId === userId && item.threadId === threadId;
                }

                return item.userId === userId && item.threadId === threadId;
            });

            return JSON.stringify(filteredMessages);
        }
        catch (error) {
            console.error("Failed to read chat history.", error);
            return "[]";
        }
    },
    {
        name: "readChatHistory",
        description: "Read conversation from chat-history based on userId and threadId",
        schema: z.object({
            userId: z.string().describe("The userId for which the chat history is to be read."),
            threadId: z.string().describe("The threadId for which the chat history is to be read."),
        })
    }
)