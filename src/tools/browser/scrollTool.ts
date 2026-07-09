import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";
import { humanDelay } from "../utils/humanBehavior";

export const scrollTool = tool(
  async ({ direction, amount, selector }) => {
    try 
    {
        const page = browserManager.getPage();
        const px = (amount ?? 3) * 400; // 1 unit ≈ 400px

        if (selector) 
        {
            await page.locator(selector).first().evaluate(
            (el, { dir, pixels }) => 
            {
                el.scrollBy({
                    top: dir === "down" ? pixels : dir === "up" ? -pixels : 0,
                    left: dir === "right" ? pixels : dir === "left" ? -pixels : 0,
                });
            },{ dir: direction, pixels: px });
        } 
        else 
        {
            await page.evaluate(
                ({ dir, pixels }) => 
                {
                    window.scrollBy({
                        top: dir === "down" ? pixels : dir === "up" ? -pixels : 0,
                        left: dir === "right" ? pixels : dir === "left" ? -pixels : 0,
                    });
                },
                { dir: direction, pixels: px }
            );
        }

        await humanDelay(400, 800);

        const pos = await page.evaluate(() => ({
            x: window.scrollX,
            y: window.scrollY,
            maxY: document.documentElement.scrollHeight - window.innerHeight,
        }));

        return JSON.stringify({
            success: true,
            position: pos,
            message: `Scrolled ${direction} ~${px}px. Position: (${pos.x}, ${pos.y})`,
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
    name: "scroll",
    description:
      "Scroll the page or a specific scrollable element. Use to reveal below-fold content, load lazy items, or",
    schema: z.object({
      direction: z.enum(["down", "up", "left", "right"]),
      amount: z
        .number()
        .optional()
        .default(3)
        .describe("Scroll units (1 unit ≈ 400px). Default 3 ≈ one viewport."),
      selector: z
        .string()
        .optional()
        .describe(
          "CSS selector of scrollable container. Leave empty for window."
        ),
    }),
  }
);