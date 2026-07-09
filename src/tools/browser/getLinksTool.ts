import {browserManager} from "@/browser/BrowserManager";
import {tool} from "@langchain/core/tools";
import {z} from "zod";

export const getLinksTool = tool(
    async ({filter}) => {
        try
        {
            const page = browserManager.getPage();
            
            const links = await page.evaluate(() =>
                Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({text: (a as HTMLAnchorElement).textContent?.trim() ?? "", href: (a as HTMLAnchorElement).href}))
                    .filter(link => link.href.startsWith("http") && link.text)
                    .slice(0,50) // Limit to first 50 links to avoid overwhelming the output
            )

            const filteredLinks = filter
                ? links.filter(link => link.text.toLowerCase().includes(filter.toLowerCase()) || link.href.toLowerCase().includes(filter.toLowerCase()))
                : links;

        } 
        catch (err){ 
            return JSON.stringify({error : String(err)});
        }
    },
    {
        name : "get_links",
        description : "Get all links on the page. Optionally filter by a URL substring.",
        schema : z.object({
            filter : z.string().optional().describe("Filter links by text or URL containing this string"),
        })
    }
)