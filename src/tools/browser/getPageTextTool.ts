import { browserManager } from "@/browser/BrowserManager";
import { shortPause } from "@/utils/humanBehaviour";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getPageTextTool = tool(
    async ({ selector, maxChars }) => {
        try {
            const page = browserManager.getPage();
            let text: string;
            if (selector) {
                text = await page.locator(selector).first().innerText();
            }
            else {
                text = await page.evaluate(() => {
                    const c = document.body.cloneNode(true) as HTMLElement;
                    // Remove script and style elements
                    c.querySelectorAll('script, style,noscript').forEach(el => el.remove());
                    return c.innerText;
                })
            }

            text = text.replace(/\s+/g, ' ').trim(); // Normalize whitespace
            const limit = maxChars ?? 4000;
            return text.length > limit ? `${text.slice(0, limit)}\n...[truncated ${text.length - limit} chars]` : text;

        } catch (err) {
            const msg = String(err);
            console.error('[get_page_text] error:', msg);
            if (msg.includes('Target page') || msg.includes('browser has been closed')) {
                try {
                    console.log('[get_page_text] detected closed browser — attempting relaunch');
                    await browserManager.closeBrowser().catch(() => { });
                    await browserManager.launchBrowser();
                    return `Error: ${msg} (recovered=true)`;
                }
                catch (e) {
                    console.error('[get_page_text] relaunch failed', String(e));
                }
            }
            return `Error: ${msg}`;
        }
    },
    {
        name: "get_page_text",
        description: "Extract visible text from page or specific element. Use to read prices, confirmation messages, etc.",
        schema: z.object({
            selector: z.string().optional().describe("CSS selector for specific element. Empty = full page."),
            maxChars: z.number().optional().default(4000),
        }),
    }
);



