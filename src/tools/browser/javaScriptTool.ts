import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {browserManager} from "@/browser/BrowserManager";

export const runJavaScriptTool = tool(
  async ({ code, arg }) => {
    try {
         
        const page = browserManager.getPage();
        const fn = new Function("return " + code);
        const result = await page.evaluate(fn(), arg);
        return JSON.stringify({
          success: true,
          result: typeof result === "object" ? JSON.stringify(result) : String(result ?? ""),
        });

    } catch (err) {
      return JSON.stringify({
        success: false,
        error: String(err),
      });
    }
  },
  {
    name: "run_javascript",
    description:
      "Execute JavaScript in the browser page context and return the result. Use as an escape hatch when DOM tools can't access data : reading values, extracting text, or interacting with elements. The code must be a function expression (arrow function or function) that returns a serializable value. An optional argument can be passed to the function.",
    schema: z.object({
      code: z
        .string()
        .describe(
          "A JS function expression (arrow fn or function) to evaluate in page context. Must return a serializable value. Example: '(arg) => { return document.title; }'"
        ),
      arg: z
        .unknown()
        .optional()
        .describe(
          "Optional serializable argument passed to the function."
        ),
    }),
  }
);