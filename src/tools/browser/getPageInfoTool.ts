import {browserManager} from "@/browser/BrowserManager";
import {tool} from "@langchain/core/tools";
import {z} from "zod";

export const getPageInfoTool = tool(
        async () => 
        {
                try{
                    const page = browserManager.getPage();
                    const metaDescription = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);
                    return JSON.stringify({
                        url: page.url(),
                        title: await page.title(),
                        metaDescription: metaDescription,
                    });
                }
                catch (err) {
                    return JSON.stringify({error : String(err)})
                }
        },
        {
            name: "get_page_info",
            description: "Get the current page's URL, title, and meta description. Use to confirm navigation completed successfully.",
            schema: z.object({})
        }
)