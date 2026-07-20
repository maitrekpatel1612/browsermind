 /**
  * Detech CAPTCHA and Pause for Human
  */

import {tool} from "@langchain/core/tools";
import {z} from "zod";
import readline from "readline";
import {browserManager} from "@/browser/BrowserManager";

const CAPTCHA_SIGNALS = [
  // URL patterns
  { type: "url", pattern: /captcha|validateCaptcha|challenge|blocked|bot-detection/i },

  // Page title patterns
  { type: "title", pattern: /captcha|bot check|security check|just a moment|ddos/i },

  // DOM text patterns
  { type: "text", pattern: /prove you're human|robot check|verify you are|i.m not a robot|security challenge/i },
];

async function detectCaptcha(): Promise<{ detected: boolean; reason?: string }> {
    const page = browserManager.getPage();
    const url = page.url();
    const title = (await page.title()).toLowerCase();

    // URL & title checks
    for (const { type, pattern } of CAPTCHA_SIGNALS) {
        if (type === "url" && pattern.test(url)) {
            return {
                detected: true,
                reason: `URL contains CAPTCHA signal: ${url}`,
            };
        }

        if (type === "title" && pattern.test(title)) {
            return {
                detected: true,
                reason: `Page title suggests CAPTCHA: "${title}"`,
            };
        }
    }

    // DOM checks
    const result = await page.evaluate((signals) => {
        const text = document.body.innerText.toLowerCase();

        const selectors = [
            "iframe[src*='recaptcha']",
            "iframe[src*='hcaptcha']",
            ".g-recaptcha",
            ".h-captcha",
            "#captcha",
            "[id*='captcha']",
            "[class*='captcha']",
            "[name*='captcha']",
            "[data-sitekey]",
        ];

        if (selectors.some(selector => document.querySelector(selector))) {
            return {
                detected: true,
                reason: "CAPTCHA DOM element found",
            };
        }

        for (const signal of signals) {
            if (signal.type === "text" && signal.pattern.source) {
                const regex = new RegExp(signal.pattern.source, "i");
                if (regex.test(text)) {
                    return {
                        detected: true,
                        reason: `Matched CAPTCHA text: ${regex.source}`,
                    };
                }
            }
        }

        return {
            detected: false,
        };
    }, CAPTCHA_SIGNALS);

    return result;
}

export const detechCaptchaTool = tool(
    async ({waitForHuman}) => {
        try{
            const result = await detectCaptcha();

            if(!result.detected){
                return JSON.stringify({ captchaDetected : false, message : "No CAPTCHA detected."});
            }

            console.log("\n !!! CAPTCHA Detected:", result.reason);
            console.log("Screenshot will be taken for you to see the CAPTCHA...\n");

            //Take Screenshot for context
            const page = browserManager.getPage();
            const buf = await page.screenshot({type : "png"});
            const b64 = buf.toString("base64");

            if(!waitForHuman){
                return JSON.stringify({ captchaDetected : true, message : "CAPTCHA detected. Set waitForHuman=true to pause for human intervention.", reason : result.reason, screenshot : b64});
            }
        }
        catch (error){
            return JSON.stringify({ success : false, error : String(error)});
        }
    },
    {
        name: "detect_captcha",
        description: "Detech if a CAPTCHA is blocking the page (reCAPTCHA, hCAPTCHA, Amazon Bot Check, Cloudflare Challenge).If a CAPTCHA is detected, the tool will pause and wait for human intervention (waitForHuman=true) to pause. The user can solve the CAPTCHA manually in the browser. The tool will resume once the CAPTCHA is solved and then press enter to continue.",
        schema : z.object({
            waitForHuman : z.boolean().optional().default(false)
            .describe("Pause and Wait for Human to Solve the CAPTCHA before continuing"),
        })
    }
)