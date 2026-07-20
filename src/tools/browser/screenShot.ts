import { tool } from "@langchain/core/tools";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { browserManager } from "@/browser/BrowserManager";

function getDir() : string  {
    const dir = path.resolve(process.env.SCREENSHOT_DIR ?? "./screenshots");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

export const takeScreenshotTool = tool(
    async ({ fullPage, region , saveToFile, label }) => {
        try{
            const page = browserManager.getPage();
            const options : Parameters<typeof page.screenshot>[0] = { type : "png", fullPage : fullPage ?? false };
            if(region){
                options.clip = region;
                options.fullPage = false;
            }

            const buffer = await page.screenshot(options);
            const base64 = buffer.toString("base64");
            let filePath : string | undefined;

            if(saveToFile !== false)
            {
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const name = label ? `${label}_${timestamp}.png` : `screenshot_${timestamp}.png`;
                filePath = path.join(getDir(), name);
                fs.writeFileSync(filePath, buffer);
                console.log(`[Screenshot] saved to ${filePath}`);
            }

            return JSON.stringify({
                success : true,
                base64,
                filePath,
                sizeKB : Math.round(buffer.length / 1024),
                url : page.url(),
                message : `Screenshot captured(${Math.round(buffer.length / 1024)} KB) .Pass base64 to analyze_screenshot for vision`,
            });

        }
        catch (err){
            return JSON.stringify({ success : false ,error : String(err)});
        }
    },
    {
        name: "take_screenshot",
        description: "Capture a browser screenshot . Returns base64 PNG data. Use when accessibility tree is insufficient (canvas,custom elements, etc.).",
        schema: z.object({
            fullPage: z.boolean().optional().default(false).describe("Capture the entire page. If false, captures the viewport."),
            region: z.object({x: z.number(), y: z.number(), width: z.number(), height: z.number()}).optional(),
            saveToFile: z.boolean().optional().default(true),
            label: z.string().optional().describe("Filename prefix for saved screenshots."),
        }),
    }
)