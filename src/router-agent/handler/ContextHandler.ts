import { UserData } from "@/app/types/user-types";
import { docEmbedding } from "@/router-agent/pipelines/embedding";
import { MemoryHandler } from "./MemoryHandler";
import { Document } from "@langchain/core/documents";
import { estimateTokens } from "@/router-agent/tools/tokenCounter";
import { compressSTMTool } from "../tools/compressSTMTool";
import { memoryRoot } from "..";

export class ContextHandler {
    private memory: MemoryHandler;
    private modelContextLimit: number;
    private userData: UserData;

    constructor(memoryHandler: MemoryHandler, modelContextLimit: number, userData: UserData) {
        this.memory = memoryHandler;
        this.modelContextLimit = modelContextLimit;
        this.userData = userData;

    }

    async assemble(userQuery: string, options = {}) {
        const userId = this.userData.userId;
        const systemPrompt = await this.memory.readMemoryFiles(`SYSTEM-${userId}.md`);
        const userProfile = await this.memory.readMemoryFiles(`MEMORY-${userId}.md`);
        const todayLog = await this.memory.readToday(new Date());


        const fixedLayers = [
            `# System Layer\n${systemPrompt}`,
            `# Profile Layer\n${userProfile}`,
            `# Recent STM Layer\n${todayLog}`,
        ]

        const contextForAnotherAgent = [
            `# Profile Layer\n${userProfile}`,
            `# Recent STM Layer\n${todayLog}`
        ].join("\n\n")

        const fixedText = fixedLayers.join("\n\n");
        const finalPrompt = `${fixedText}\n\n# New Input\n${userQuery}`;
        const numberofTokens = estimateTokens(finalPrompt);

        if (numberofTokens > this.modelContextLimit) {

            // Compress the STM layer to reduce token count
            console.log(`=========================  Compaction : Starting [STM Layer] =========================`);
            const compressedData = await compressSTMTool.invoke({ message: finalPrompt }) as string;


            const now = new Date();
            // logToArchive may not be declared on MemoryHandler's type; cast to any to allow runtime call
            await this.memory.logToArchive("Assistant", compressedData, now);


            await Promise.all([
                docEmbedding({
                    userId: this.userData.userId,
                    allDocs: [
                        new Document({
                            pageContent: compressedData, metadata: {
                                title: `User Daily Log Summary`
                            }
                        })
                    ]
                }),

                this.memory.emptyFileContent()
            ])

            console.log(`=========================  Compaction : Completed [STM Layer] =========================`);
        }

        return {
            contextForAnotherAgent,
            prompt: finalPrompt,
            diagonostics: {
                estimatedTokens: numberofTokens,
            }
        }
    }
}