import { browserManager } from "@/browser/BrowserManager";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getLinksTool = tool(
    async ({ filter }) => {
        try {
            const page = browserManager.getPage();

            const links = await page.evaluate(() =>
                Array.from(document.querySelectorAll("a[href]"))
                    .map((a) => ({
                        text: (a as HTMLAnchorElement).textContent?.trim() ?? "",
                        href: (a as HTMLAnchorElement).href,
                    }))
                    .filter((link) => link.href.startsWith("http") && link.text)
                    .slice(0, 50)
            );

            const filteredLinks = filter
                ? links.filter(
                    (link) =>
                        link.text.toLowerCase().includes(filter.toLowerCase()) ||
                        link.href.toLowerCase().includes(filter.toLowerCase())
                )
                : links;

            // Print in console
            return JSON.stringify({
                success: true,
                count: filteredLinks.length,
                links: filteredLinks,
            });
        } catch (err) {
            return JSON.stringify({
                success: false,
                error: String(err),
            });
        }
    },
    {
        name: "get_links",
        description:
            "Get all links on the current page. Optionally filter by link text or URL.",
        schema: z.object({
            filter: z
                .string()
                .optional()
                .describe("Filter links by text or URL"),
        }),
    }
);