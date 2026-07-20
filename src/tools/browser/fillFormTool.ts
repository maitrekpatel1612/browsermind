import { browserManager } from "@/browser/BrowserManager";
import { humanType } from "@/utils/humanBehaviour";
import { humanDelay, shortPause } from "@/utils/mediumPause";
import { tool } from "@langchain/core/tools";
import { z } from "zod";


export const fillFormTool = tool(

    async ({ fields, submitAfter }) => {
        const page = browserManager.getPage();
        const results: { field: string; status: string; error?: string }[] = [];

        for (const { label, value, type } of fields) {
            try {
                // Try aria-label first, then placeholder, then CSS selector
                let locator =
                    (await page.getByLabel(label, { exact: false }).count()) > 0
                        ? page.getByLabel(label, { exact: false }).first()
                        : (await page.getByPlaceholder(label, { exact: false }).count()) > 0
                            ? page.getByPlaceholder(label, { exact: false }).first()
                            : page.locator(label).first(); // treat as selector fallback


                await locator.scrollIntoViewIfNeeded({ timeout: 3000 });

                if (type === 'select') {
                    await locator.selectOption({ label: value });
                }
                else if (type === 'checkbox') {
                    const checked = await locator.isChecked();
                    const shouldCheck = value.toLowerCase() === 'true';
                    if (checked !== shouldCheck) {
                        await locator.click();
                        await shortPause();
                        await page.keyboard.press('Control+a');
                        await humanDelay(50, 100);
                        await humanType(page, value, "normal");
                    }
                }
                await shortPause();
                results.push({ field: label, status: "filled" });
            }
            catch (error) {
                results.push({ field: label, status: "failed", error: String(error).slice(0, 80) });
            }
        }
        if (submitAfter) {
            try {
                await page.keyboard.press("Enter");
                results.push({ field: "__submit__", status: "Enter Pressed" });
            }
            catch { }
        }

        const failed = results.filter(r => r.status === "failed");
        return JSON.stringify({
            success: failed.length === 0,
            results,
            message: `Filled ${results.length - failed.length}/${results.length} fields. ${failed.length ? `Failed fields: ${failed.map(f => f.field).join(", ")}` : "All fields filled successfully."}`
        })
    },
    {
        name: "fill_form",
        description: "Fill an entire form automatically in one too call. Much more efficient then calling Click + Type for each field. ",
        schema: z.object({
            fields: z.array(z.object({
                label: z.string().describe("Field's aria label, placeholder text , or CSS Selector"),
                value: z.string().describe("Value to enter, For checkbox : 'true/false'. For select visible option text"),
                type: z.enum(['text', 'checkbox', 'select']).optional().default('text'),
            })).describe("List of fields to fill"),
            submitAfter: z.boolean().optional().default(false).describe("Press Enter after filling all fields"),
        }),
    }

)