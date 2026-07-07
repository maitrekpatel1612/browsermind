import {ChatFireworks} from "@langchain/fireworks";
import {ChatCerebras} from "@langchain/cerebras";

type LLMType = "fireworks" | "cerebras" | "fireworks_minimax" | "fireworks_glm";

export class LLM {
    private static instance : Partial<Record<LLMType, any>> = {};

    //Private Constructor
    private constructor() {}   

    /**
     * Singleton method to get the instance of the LLM Class based on the specified type.
     * @param type The type of LLM to get an instance for. Can be "fireworks", "cerebras", "fireworks_minimax", or "fireworks_glm".
     * @returns An instance of the specified LLM type.
     */
    public static getInstance(type: LLMType): any {
        if (!LLM.instance[type]) {
            switch (type) {

                case "fireworks":
                    if(!process.env.FIREWORKS_API_KEY) {
                        throw new Error("FIREWORKS_API_KEY is not set in the environment variables.");
                    }
                    LLM.instance[type] = new ChatFireworks({
                        model : "accounts/fireworks/models/qwen-vl-30b-a3b-thinking",
                        temperature : 0.7,
                        apiKey: process.env.FIREWORKS_API_KEY,
                    });
                    break;

                    
                case "fireworks_minimax":
                    if(!process.env.FIREWORKS_API_KEY) {
                        throw new Error("FIREWORKS_API_KEY is not set in the environment variables.");
                    }
                    LLM.instance[type] = new ChatFireworks({
                        model : "accounts/fireworks/models/minimax-2p5",
                        temperature : 0.7,
                        apiKey: process.env.FIREWORKS_API_KEY,
                    });
                    break;


                case "cerebras":
                    if(!process.env.CEREBRAS_API_KEY) {
                        throw new Error("CEREBRAS_API_KEY is not set in the environment variables.");
                    }
                    LLM.instance[type] = new ChatCerebras({
                        model : "gemma-4-31b",
                        temperature : 0.7,
                        apiKey: process.env.CEREBRAS_API_KEY,
                    });
                    break;
                

                // case "fireworks_glm":
                //     if(!process.env.FIREWORKS_API_KEY) {
                //         throw new Error("FIREWORKS_API_KEY is not set in the environment variables.");
                //     }
                //     LLM.instance[type] = new ChatFireworks({
                //         model : "accounts/fireworks/models/glm-4",
                //         temperature : 0.7,
                //         apiKey: process.env.FIREWORKS_API_KEY,
                //     });
                //     break;


                default:
                    throw new Error(`Unsupported LLM type: ${type}`);
            }
        }
        return LLM.instance[type];
    }

}