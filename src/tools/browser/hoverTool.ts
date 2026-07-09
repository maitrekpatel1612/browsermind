import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";
import { humanMouseMove, humanDelay } from "../utils/humanBehavior";

export const hoverTool = tool(
  async ({ selector, text, ariaLabel, x, y, waitMs }) => 
    {
        try 
        {
            const page = browserManager.getPage();

            if (ariaLabel) {
                await page.getByLabel(ariaLabel).first().hover();
            } else if (text) {
                await page.getByText(text, { exact: false }).first().hover();
            } else if (selector) {
                await page.locator(selector).first().hover();
            } else if (x !== undefined && y !== undefined) {
                await humanMouseMove(page, x, y);
            } else {
                return JSON.stringify({
                    success: false,
                    error: "Provide selector, text, ariaLabel, or coordinates",
                });
            }

            await humanDelay((waitMs ?? 400), (waitMs ?? 400) + 400);

            return JSON.stringify({
                success: true,
                message: "Hovered. Dropdown/tooltip should now be visible — call get "
            });
        } 
        catch (err) 
        {
            return JSON.stringify({
                success: false,
                error: String(err),
            });
        }
  },
  {
    name: "hover",
    description:
      "Hover over an element to reveal tooltips, dropdown menus, or hover-triggered content on a webpage.",
    schema: z.object({
      selector: z.string().optional().describe("CSS selector"),
      text: z.string().optional().describe("Visible text content"),
      ariaLabel: z.string().optional().describe("aria-label"),
      x: z.number().optional().describe("X coordinate"),
      y: z.number().optional().describe("Y coordinate"),
      waitMs: z
        .number()
        .optional()
        .default(400)
        .describe("ms to hold hover (default 400)"),
    }),
  }
);