import { browserManager } from "@/browser/BrowserManager";
import { humanDelay } from "@/utils/humanBehaviour";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const pressKeyTool = tool(
  async ({ key, repeat }) => 
    {
        try 
        {
            
            const page = browserManager.getPage();
            const times = repeat ?? 1;
            
            // Press the key the specified number of times with a small delay in between
            for (let i = 0; i < times; i++) {
                await page.keyboard.press(key);
                if (times > 1) await humanDelay(80, 150);
            }

            await page.waitForTimeout(1000); // Wait for any resulting actions to complete
            return JSON.stringify({
                success: true,
                message: `Pressed "${key}"${times > 1 ? ` × ${times}` : ""}`,
            });
        } 
        catch (err) 
        {
            return JSON.stringify({success: false, error: String(err)});
        }
  },
  {
    name: "press_key",
    description:
      "Press a keyboard key or combo. Use for: Enter, Tab, Escape, ArrowDown/Up, Backspace, PageDown, Control+a, etc. Useful for dropdowns, forms, and navigation.",
    schema: z.object({
      key: z
        .string()
        .describe(
          "Playwright key name: 'Enter', 'Tab', 'Escape', 'ArrowDown', 'Control+a', etc."
        ),
      repeat: z
        .number()
        .optional()
        .default(1)
        .describe(
          "Times to press (useful for ArrowDown on custom dropdowns)"
        ),
    }),
  }
);