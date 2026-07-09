  /**
 * #1 iframe.tool.ts — switch into/out of iframes
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";

export const switchFrameTool = tool(
  async ({ selectorOrUrl }) => {
    try {
      const page = browserManager.getPage();

      // List available frames
      const frames = page.frames().map((f, i) => ({
        index: i,
        url: f.url(),
        name: f.name(),
      }));

      if (!selectorOrUrl) {
        return JSON.stringify({
          frames,
          message: "Pass selectorOrUrl to switch to a frame.",
        });
      }

      const ok = await browserManager.switchToFrame(selectorOrUrl);

      if (ok) {
        return JSON.stringify({
          success: true,
          message: `Switched to iframe: ${selectorOrUrl}. All subsequent tool calls will target this frame.`,
        });
      }

      return JSON.stringify({
        success: false,
        availableFrames: frames,
        error: `No frame matched "${selectorOrUrl}"`,
      });
    } catch (err) {
      return JSON.stringify({
        success: false,
        error: String(err),
      });
    }
  },
  {
    name: "switch_frame",
    description:
      "Switch context into an iframe (e.g. payment forms, login popups, embedded widgets). Pass the iframe's CSS selector or a substring of its src URL. Omit to list available frames.",
    schema: z.object({
      selectorOrUrl: z
        .string()
        .optional()
        .describe(
          "CSS selector of <iframe> or substring of its src URL. Omit to list available frames."
        ),
    }),
  }
);

export const switchToMainFrameTool = tool(
    async () => {
        browserManager.switchToMainFrame();
        return JSON.stringify({ success : true, message : "Switched to main page frame."});
    },
    {
        name: "switch_to_main_frame",
        description: "Switch context back to the main page frame after being inside an iframe.",
        schema: z.object({}),
    }
)

export const switchTabTool = tool(
  async ({ index }) => {
    try {
      const pages = browserManager.getAllPages();

      if (index === undefined) {
        const tabs = pages.map((p, i) => ({
          index: i,
          url: p.url(),
          active: i === browserManager.getActivePageIndex(),
        }));

        return JSON.stringify({
          tabs,
          message: "Pass index to switch to a tab.",
        });
      }

      const ok = await browserManager.switchToTab(index);

      if (ok) {
        const url = browserManager.getAllPages()[index]?.url();

        return JSON.stringify({
          success: true,
          message: `Switched to tab ${index}: ${url}`,
        });
      }

      return JSON.stringify({
        success: false,
        error: `Tab index ${index} does not exist (${pages.length} tabs open)`,
      });
    } catch (err) {
      return JSON.stringify({
        success: false,
        error: String(err),
      });
    }
  },
  {
    name: "switch_tab",
    description:
      "Switch between open browser tabs. Call with no argument to list all tabs. Pass index to activate a tab.",
    schema: z.object({
      index: z
        .number()
        .optional()
        .describe("0-based tab index. Omit to list all open tabs."),
    }),
  }
);