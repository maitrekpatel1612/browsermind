import {browserManager} from "@/browser/BrowserManager";
import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {humanDelay , shortPause} from "@/utils/humanBehaviour";
import { withRetry } from "@/utils/withRetry";
import {Page} from "playwright";


async function scrollIntoView(page : import("playwright").Page, locator : import("playwright").Locator) {
    try {
        await locator.scrollIntoViewIfNeeded({timeout : 3000});
    } catch {}
}

async function resolveAndClick(
    page: import("playwright").Page,
    params: {
        selector?: string;
        text?: string;
        ariaLabel?: string;
        role?: string;
        x?: number;
        y?: number;
        button?: "left" | "right" | "middle";
        doubleClick?: boolean;
    }
): Promise<{ success: boolean; strategy: string; error?: string }> {
    const { selector, text, ariaLabel, role, x, y, button = "left", doubleClick = false } = params;
    const clickOpts = { button, clickCount: doubleClick ? 2 : 1 };

    // # 1 Aria label
    if(ariaLabel){ 
        try{
            const loc = page.getByLabel(ariaLabel).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return { success: true, strategy : `aria-label="${ariaLabel}"` };
        }
        catch{
            // Ignore errors for selectors that don't match or aren't visible
        }
    }

    // # 2 Role + name
    if(role){
        try{
            const nameOpt = ariaLabel ?? text;
            const loc = nameOpt
                ? page.getByRole(role as Parameters<typeof page.getByRole>[0], {name : nameOpt, exact : false}).first()
                : page.getByRole(role as Parameters<typeof page.getByRole>[0]).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return { success: true, strategy : `role="${role}"${nameOpt ? ` + name="${nameOpt}"` : ""}` };
        }
        catch {}
    }

    // # 3 Visible text
    if(text){
        try{
            const loc = page.getByText(text, { exact: false }).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return { success: true, strategy : `text="${text}"` };
        }
        catch {}
    }

    return { success: false, strategy : "all", error : "No matching element. Try get_accessibility_tree or find_element" };
}

export const clickTool = tool(
    async ({ selector, text, ariaLabel, role, x, y, button, doubleClick }) => {
        return withRetry(async () => {
            const page = browserManager.getPage();
            await shortPause(); // Wait a bit before clicking to avoid issues with overlays

            const result = await resolveAndClick(page, { 
                selector, text, ariaLabel, role, x, y, 
                button : button as "left" | "right" | "middle", 
                doubleClick 
            });

            await shortPause();
            if(result.success){
                return JSON.stringify({success: true, strategy : result.strategy, currentUrl : page.url()});
            }

            return JSON.stringify({success : false, error : result.error})
        }, { attempts : 3, baseDelay : 600}).catch((e : Error) => JSON.stringify({success : false, error : String(e)}));
    },
    {
        name: "click",
        description: "Click a page element. Automatically scrolls element into view first. Strategy priority: ariaLabel > role + name > visible text. If no element found, use get_accessibility_tree to find role/name.",
        schema: z.object({
            selector: z.string().optional().describe("CSS selector"),
            text: z.string().optional().describe("Visible text content"),
            ariaLabel: z.string().optional().describe("aria-label attribute"),
            role: z.string().optional().describe("ARIA role from accessibility tree"),
            x: z.number().optional().describe("X pixel coordinate (vision fallback)"),
            y: z.number().optional().describe("Y pixel coordinate (vision fallback)"),
            button: z.enum(["left", "right", "middle"]).optional().default("left"),
            doubleClick: z.boolean().optional().default(false),
        }),
    }
);

function baseDelay(): Promise<unknown> {
    throw new Error("Function not implemented.");
}
