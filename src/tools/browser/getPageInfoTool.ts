import { browserManager } from "@/browser/BrowserManager";
import { tool } from "@langchain/core/tools";
import { text } from "stream/iter";
import { z } from "zod";

export const getPageInfoTool = tool(
    async () => {
        try {
            const page = browserManager.getPage();
            const metaDescription = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);
            return JSON.stringify({
                url: page.url(),
                title: await page.title(),
                metaDescription: metaDescription,
            });
        }
        catch (err) {
            const msg = String(err);
            console.error('[get_page_info] error:', msg);
            // If the browser/page was closed, try to relaunch once to recover session
            if (msg.includes('Target page') || msg.includes('browser has been closed')) {
                try {
                    console.log('[get_page_info] detected closed browser — attempting relaunch');
                    await browserManager.closeBrowser().catch(() => { });
                    await browserManager.launchBrowser();
                    return JSON.stringify({ error: msg, recovered: true });
                }
                catch (e) {
                    console.error('[get_page_info] relaunch failed', String(e));
                }
            }
            return JSON.stringify({ error: msg })
        }
    },
    {
        name: "get_page_info",
        description: "Get the current page's URL, title, and meta description. Use to confirm navigation completed successfully.",
        schema: z.object({})
    }
)

export const waitForElementTool = tool(
    async ({ selector, text, state, timeout, urlContains }) => {
        try {
            const page = browserManager.getPage();
            const ms = (timeout ?? 10) * 1000;

            // SPA Navigation : Wait for URL Changes
            if (urlContains) {
                await page.waitForURL(`**${urlContains}**`, { timeout: ms });
                return JSON.stringify({ success: true, message: `URL now contains "${urlContains}": ${page.url()}` });
            }

            if (text) {
                await page.waitForFunction(t => document.body.textContent?.includes(t), text, { timeout: ms });
                return JSON.stringify({ success: true, message: `Text "${text}" found on page.` });
            }

            if (selector) {
                await page.waitForSelector(selector, { state: (state ?? "visible") as "visible" | "hidden" | "attached" | "detached", timeout: ms });
                return JSON.stringify({ success: true, message: `Selector "${selector}" is now ${state ?? "visible"}.` });
            }

            return JSON.stringify({ success: false, error: "Provide selector, text, or urlContains" });
        }
        catch (err) {
            return JSON.stringify({ success: false, error: `Timeout : ${String(err).slice(0, 100)}` });
        }
    },
    {
        name: "wait_for_element",
        description: "Wait for an element/URL changes. Use after clicks that trigger navigation or async loading, urlContains is best for SPA Route Changes. Useful for SPA navigation or dynamic content.",
        schema: z.object({
            selector: z.string().optional().describe("CSS selector to wait for"),
            text: z.string().optional().describe("Text to appear anywhere on page"),
            urlContains: z.string().optional().describe("Wait for URL to contain this string (best for SPA navigation)"),
            state: z.enum(["visible", "hidden", "attached", "detached"]).optional().default("visible").describe("State of the element to wait for"),
            timeout: z.number().optional().default(10).describe("Max Seconds to wait (10s default)"),
        })
    }
)