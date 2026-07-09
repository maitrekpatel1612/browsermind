import {browserManager} from "@/browser/BrowserManager";
import {humanDelay} from "@/utils/mediumPause";
import {tool} from "@langchain/core/tools";
import {z} from "zod";

// Common dismiss button patterns (ordered most → least specific)
const DISMISS_SELECTORS = [
  // Cookie consents
  "button[id*='accept']",
  "button[class*='accept']",
  "button[data-testid*='accept']",
  "#onetrust-accept-btn-handler",
  "#accept-recommended-btn-handler",
  ".css-dismiss",
  "[aria-label*='Accept cookies']",
  "[aria-label*='accept cookies']",
  "button[id*='cookie']",

  // Generic close buttons
  "button[aria-label='Close']",
  "button[aria-label='close']",
  "button[aria-label='Dismiss']",
  "button[data-dismiss]",
  "[class*='modal-close']",
  "[class*='close-button']",
  "[class*='dismiss']",
  "[class*='popup-close']",

  // Newsletter popups
  "[class*='newsletter'] button[class*='close']",
  "[id*='newsletter'] button[class*='close']",

  // Age verification — skip (those need interaction)
];


export const dismissOverlaysTool = tool(
    async ({ force }) => {
        try {
            const page = browserManager.getPage();
            const dismissed : string[] = [];

            for (const selector of DISMISS_SELECTORS) {
                try{
                    const el = page.locator(selector).first();
                    const visible = await el.isVisible({ timeout : 500});

                    if(visible)
                    {
                        await el.click({timeout : 1000});
                        await humanDelay(300, 600); // Wait a bit for the overlay to disappear
                        dismissed.push(selector);
                        if (!force) break; // Only dismiss one per call unless forced
                    }
                }
                catch(e) {
                    // Ignore errors for selectors that don't match or aren't visible
                }
            }


            if(dismissed.length === 0){
                return JSON.stringify({success : true, dismissed: [], message : "No overlays found"});
            }

            return JSON.stringify({success : true, dismissed, message : `Dismissed ${dismissed.length} overlay(s) : ${dismissed.join(", ")}`});
        } 
        catch (err) {
            return JSON.stringify({ success: false, error: String(err) });
        }
    },
    {
        name: "dismiss_overlays",
        description: "Dismiss cookie banners, modals, and other overlays that may block interaction with the page. This tool attempts to click on common dismiss buttons.",
        schema: z.object({
            force : z.boolean().optional().default(false).describe("Dismiss all overlays in one pass (default : stop after first successful dismiss)"),
        })
    }
);