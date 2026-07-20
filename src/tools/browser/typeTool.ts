import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";
import { humanType, shortPause, humanDelay } from "@/utils/humanBehaviour";

export const typeTool = tool(
    async ({
        text,
        selector,
        ariaLabel,
        clearFirst,
        speed,
        pressEnterAfter,
        dismissAutocomplete,
    }) => {
        try {
            const page = browserManager.getPage();

            // Focus the input field based on provided selector or aria-label
            if (ariaLabel) {
                await page.getByLabel(ariaLabel).first().click();
                await shortPause();
                // If ariaLabel is not provided, use selector which means the user wants to focus on a specific input field using a CSS selector
            } else if (selector) {
                await page.locator(selector).first().click();
                await shortPause();
            }
            // If neither ariaLabel nor selector is provided, assume the user wants to type into the currently focused input field
            if (clearFirst) {
                await page.keyboard.press("Control+a");
                await shortPause();
                await page.keyboard.press("Delete");
                await shortPause();
            }

            await humanType(page, text, (speed as "slow" | "normal" | "fast") ?? "normal");

            //Autocompete handling
            if (dismissAutocomplete === "escape") {
                await humanDelay(200, 400);
                await page.keyboard.press("Escape");
                await humanDelay(100, 200);
            }
            else if (dismissAutocomplete === "select_first") {
                await humanDelay(400, 700);
                await page.keyboard.press("ArrowDown");
                await humanDelay(100, 200);
                await page.keyboard.press("Enter");
            }

            if (pressEnterAfter) {
                await shortPause();
                await page.keyboard.press("Enter");
            }

            return JSON.stringify({
                success: true,
                typed: text,
                message: `Typed "${text}" (${text.length} chars) ${pressEnterAfter ? " + Enter" : ""}`,
            })
        }
        catch (err) {
            return JSON.stringify({
                success: false,
                error: String(err),
            })
        }
    },
    {
        name: "type_text",
        description:
            "Type text into the focused or specified input with human-like speed. Use dismissAutocomplete to handle browser autocomplete dropdowns - 'escape dismisses', 'select_first selects the first suggestion'.",

        schema: z.object({
            text: z.string().describe("Text to type"),
            selector: z.string().optional().describe("CSS selector of input to focus"),
            ariaLabel: z.string().optional().describe("aria-label of input to focus (preferred)"),
            clearFirst: z.boolean().optional().default(true),
            speed: z.enum(["slow", "normal", "fast"]).optional().default("normal"),
            pressEnterAfter: z.boolean().optional().default(false),
            dismissAutocomplete: z.enum(["none", "escape", "select_first"]).optional().default("none").describe("How to handle autocomplete dropdowns that appear while typing"),
        }),
    }
);