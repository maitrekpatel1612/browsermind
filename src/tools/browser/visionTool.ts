import fetch from "node-fetch";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import "dotenv/config";

async function encodeImageToBase64String(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${url}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

function getMimeType(url: string): string {
    const lower = url.toLowerCase();

    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".bmp")) return "image/bmp";

    return "image/jpeg";
}

export const readImageTool = tool(
    async ({ imageUrl, prompt }) => {
        try {
            const apiKey = process.env.CEREBRAS_API_KEY;

            if (!apiKey) {
                throw new Error(
                    "CEREBRAS_API_KEY is not set in the environment variables."
                );
            }

            const base64Image = await encodeImageToBase64String(imageUrl);
            const mimeType = getMimeType(imageUrl);

            const client = new Cerebras({ apiKey });

            const response = await client.chat.completions.create({
                model: "gemma-4-31b",
                stream: false,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt ?? "Describe this image clearly and concisely.",
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
            });

            // Handle API error response
            if ("error" in response) {
                throw new Error(
                    response.error.message ??
                    "Unknown error returned by Cerebras."
                );
            }

            // Ensure choices exist
            if (!("choices" in response) || !response.choices?.length) {
                throw new Error("No choices returned by the model.");
            }

            const choice = response.choices[0];

            // Narrow from ChatCompletionResponse.Choice | ChatChunkResponse.Choice
            if (!("message" in choice)) {
                throw new Error(
                    "Received streaming response unexpectedly."
                );
            }

            const content = choice.message.content;

            if (!content) {
                throw new Error("Model returned an empty response.");
            }

            return JSON.stringify({
                success: true,
                summary: content,
            });
        } catch (error) {
            console.error("readImageTool Error:", error);

            return JSON.stringify({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    },
    {
        name: "read_image",
        description:
            "Read and analyze an image from a URL and return a textual summary.",
        schema: z.object({
            imageUrl: z
                .string()
                .describe("Publicly accessible image URL"),
            prompt: z
                .string()
                .optional()
                .describe("Optional custom instruction for image analysis"),
        }),
    }
);