import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";
import { shortPause } from "@/utils/humanBehaviour";
import { withRetry } from "@/utils/withRetry";

export const selectOptionTool = tool(
    async ({ selector, ariaLabel, value, label, index }) => {
        return withRetry(async () => {
            const page = browserManager.getPage();
            await shortPause();

            const locator = ariaLabel
                ? page.getByLabel(ariaLabel).first()
                : selector ? page.locator(selector).first() : null


            if (!locator)
                return JSON.stringify({
                    success: false,
                    error: "Provide selector or ariaLabel",
                });

            await locator.scrollIntoViewIfNeeded({ timeout: 3000 });

            const opts: Record<string, string | number> = {};

            if (value !== undefined) opts.value = value;
            if (label !== undefined) opts.label = label;
            if (index !== undefined) opts.index = index;

            const selected = await locator.selectOption(
                opts as Parameters<typeof locator.selectOption>[0]
            );

            await shortPause();

            return JSON.stringify({
                success: true,
                selected,
                message: `Selected: ${JSON.stringify(selected)}`,
            });


        }, { attempts: 3 }).catch((e: Error) =>
            JSON.stringify({
                success: false,
                error: String(e),
            }));
    },
    {
        name: "select_option",
        description: "Select an option from a <select> dropdown by value, visible label text, or 0-based index.",
        schema: z.object({
            selector: z.string().optional().describe("CSS selector of <select>"),
            ariaLabel: z.string().optional().describe("aria-label of <select> (preferred)"),
            value: z.string().optional().describe("Option value attribute"),
            label: z.string().optional().describe("Option visible text"),
            index: z.number().optional().describe("0-based index"),
        }),
    }
);