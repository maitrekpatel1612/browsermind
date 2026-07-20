import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { browserManager } from "@/browser/BrowserManager";

export const handleDialogTool = tool(
  async ({ action, promptText }) => {
    try 
    {
        const last = browserManager.getLastDialog();
        const page = browserManager.getPage();

        if (!last) {
            return JSON.stringify({ message: "No dialog is currently pending. Dialogs are auto-accepted by default when they appear.",});
        }

        // Set up one-time override for the next dialog
        const handler = async (dialog: import("playwright").Dialog) => {
            if (action === "accept") await dialog.accept(promptText);
            else await dialog.dismiss();
            page.off("dialog", handler);
        };

        page.once("dialog", handler);

        return JSON.stringify({
            success: true,
            lastDialog : last,
            message : `Next dialog will be ${action}ed${promptText ? ` with text: "${promptText}"` : ""}.`,
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
    name: "handle_dialog",
    description:
      "Inspect the last browser dialog (alert/confirm/prompt) or configure how the next one is handled. By default all dialogs are auto-accepted. Use this tool to dismiss a dialog or provide text for a prompt() dialog.",
    schema: z.object({
      action: z.enum(["accept", "dismiss"]).optional().default("accept"),
      promptText: z
        .string()
        .optional()
        .describe("Text to type if the dialog is a prompt() box"),
    }),
  }
);