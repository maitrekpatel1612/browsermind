import { browserManager } from "./browser/BrowserManager";
import { detechCaptchaTool } from "./tools/browser/captchaTools";
import { clickTool } from "./tools/browser/clickTool";
import { dismissOverlaysTool } from "./tools/browser/dismissOverlaysTool";
import { fillFormTool } from "./tools/browser/fillFormTool";
import { getAccessibilityTreeTool } from "./tools/browser/getAccessibilityTreeTool";
import { getLinksTool } from "./tools/browser/getLinksTool";
import { waitForElementTool } from "./tools/browser/getPageInfoTool";
import { getPageTextTool } from "./tools/browser/getPageTextTool";
import { hoverTool } from "./tools/browser/hoverTool";
import { runJavaScriptTool } from "./tools/browser/javaScriptTool";
import { navigateTool } from "./tools/browser/navigateTool";
import { pressKeyTool } from "./tools/browser/pressKeyTool";
import { takeScreenshotTool } from "./tools/browser/screenShot";
import { scrollTool } from "./tools/browser/scrollTool";
import { selectOptionTool } from "./tools/browser/selectTool";
import { typeTool } from "./tools/browser/typeTool";
import { readImageTool } from "./tools/browser/visionTool";


interface TestResult {
    tool: string;
    success: boolean;
    duration: number;
    result?: unknown;
    error?: string;
}

const results: TestResult[] = [];

/**
 * Generic test runner
 */
async function test<T>(
    toolName: string,
    fn: () => Promise<T>
): Promise<void> {
    const start = performance.now();

    try {
        const result = await fn();

        let parsed = result;

        if (typeof result === "string") {
            try {
                parsed = JSON.parse(result);
            } catch { }
        }

        if (
            parsed &&
            typeof parsed === "object" &&
            "success" in parsed &&
            parsed.success === false
        ) {
            const detail =
                "message" in parsed && typeof parsed.message === "string"
                    ? parsed.message
                    : "error" in parsed && typeof parsed.error === "string"
                        ? parsed.error
                        : "Tool returned success:false";

            throw new Error(detail);
        }

        const duration = performance.now() - start;

        results.push({
            tool: toolName,
            success: true,
            duration,
            result,
        });

        console.log(`✅ ${toolName} (${duration.toFixed(0)} ms)`);

        if (typeof result === "string") {
            console.log(result);
        } else {
            console.dir(result, { depth: null, colors: true });
        }

        console.log("--------------------------------------------");
    } catch (err) {
        const duration = performance.now() - start;

        const message =
            err instanceof Error
                ? err.stack ?? err.message
                : String(err);

        results.push({
            tool: toolName,
            success: false,
            duration,
            error: message,
        });

        console.error(`❌ ${toolName} (${duration.toFixed(0)} ms)`);
        console.error(message);
        console.log("--------------------------------------------");
    }
}

function printSummary() {
    console.log("\n============================================");
    console.log("Test Summary");
    console.log("============================================");

    console.table(
        results.map((r) => ({
            Tool: r.tool,
            Status: r.success ? "PASS" : "FAIL",
            "Time (ms)": Math.round(r.duration),
        }))
    );

    const passed = results.filter((r) => r.success).length;
    const failed = results.length - passed;

    console.log(
        `Passed: ${passed}/${results.length} | Failed: ${failed}`
    );

    if (failed > 0) {
        console.log("\nFailed Tests:");

        results
            .filter((r) => !r.success)
            .forEach((r) => {
                console.log(`\n❌ ${r.tool}`);
                console.log(r.error);
            });
    }
}

async function runTest(): Promise<void> {
    console.log("============================================");
    console.log("|| Target : https://playwright.dev   ||");
    console.log("============================================");

    try {
        await browserManager.launchBrowser();

        // ==========================================================
        console.log("\n------- 1. Navigation -------");
        // ==========================================================

        await test("navigate -> homepage", () =>
            navigateTool.invoke({
                url: "https://maitrekpatel.in",
                waitUntil: "load",
            })
        );

        // ==========================================================
        console.log("\n------- 2. Dismiss Overlays -------");
        // ==========================================================

        await test("dismiss_overlays", () =>
            dismissOverlaysTool.invoke({
                force: true,
            })
        );

        // ==========================================================
        console.log("\n------- 3. Accessibility Tree -------");
        // ==========================================================

        // await test("get_accessibility_tree", () =>
        //     getAccessibilityTreeTool.invoke({ region : "textarea"})
        // );
        await test("get_accessibility_tree", () =>
            getAccessibilityTreeTool.invoke({ region: "main" }) //& region : < It can be any CSS selector, XPath, or accessibility role. If not provided, the entire page is captured.>
        );

        // // Full page test (first 400 chars)
        // await test("get_page_text (full, maxChars = 400)", () =>
        //     getPageTextTool.invoke({ maxChars: 400 })
        // );

        // // Get All links 
        // await test("get_all_links (all)", () =>
        //     getLinksTool.invoke({})
        // );

        // // Filtered links test
        // await test("get_links (filter = 'posts')", () =>
        //     getLinksTool.invoke({ filter: "posts" })
        // );

        // // ==========================================================
        // console.log("\n------- 4. Click & Hover -------");
        // // ==========================================================

        // // Hover test
        // await test("hover (text = 'Node JS)", () =>
        //     hoverTool.invoke({ text: "Node.js", waitMs: 100 })
        // );

        // // Click Archive nav link by visible text -> navigates to /archives
        // await test("click (text = 'Node.js')", () =>
        //     clickTool.invoke({ text: "Node.js" })
        // );

        // // Wait for URL to contain "archives" (SPA style nav configuration)
        // await test("wait_for_element (urlContains = 'Node.js')", () =>
        //     waitForElementTool.invoke({ urlContains: "docs/intro", timeout: 1 })
        // )

        // // Navigate back to homepage
        // await test("navigate -> homepage (for scroll tests)", () =>
        //     navigateTool.invoke({ url: "https://playwright.dev" })
        // );

        // // Scroll down 3 units (~ 1200px) - reveals more blog posts
        // await test("scroll (down, amount = 3)", () =>
        //     scrollTool.invoke({ direction: "down", amount: 3 })
        // );

        // // Scroll down more - test max scroll detection (should stop at bottom of page)
        // await test("scroll (down, amount = 5)", () =>
        //     scrollTool.invoke({ direction: "down", amount: 5 })
        // );

        // // Scroll back up to top
        // await test("scroll (up, amount = 10)", () =>
        //     scrollTool.invoke({ direction: "up", amount: 10 })
        // );

        //==========================================================
        console.log("\n------- 5. Type & Keyboard -------");
        // ==========================================================
        // await test("type_text (search-'reinforcement learning')", () =>
        //     typeTool.invoke({
        //         text: "reinforcement learning",
        //         selector: "#searchInput",
        //         clearFirst: true,
        //         speed: "fast",
        //         dismissAutocomplete: "none",
        //     })
        // );

        // await test("fill_form (search='attention mechanism')", () =>
        //     fillFormTool.invoke({
        //         fields: [
        //             {
        //                 label: "#searchInput",
        //                 value: "attention mechanism",
        //                 type: "text",
        //             }
        //         ],
        //         submitAfter: false,
        //     })
        // );

        // await test("press_key tool(Control+k)", () =>
        //     pressKeyTool.invoke({ key: "Control+K", repeat: 1 })
        // );

        // await test("run_javascript (document.title)", () =>
        //     runJavaScriptTool.invoke({ code: "() => document.title;" })
        // );

        // // Detech Captcha - Static Blog, No captcha expected, but this is a good test of the detection logic
        // await test("detect_captcha", () =>
        //     detechCaptchaTool.invoke({ waitForHuman: false })
        // );

        //Take Screenshot for context
        // await test("take_screenshot", () =>
        //     takeScreenshotTool.invoke({})
        // );

        //Read Image tool
        // await test("read_image", () =>
        //     readImageTool.invoke({
        //         imageUrl: "http://localhost:5000/assets/screenshots/screenshot_2026-07-20T19-35-21-752Z.png",

        //     })
        // );

        //==========================================================
        console.log("\n------- 6. Graceful Failure Cases  -------");
        // ==========================================================

        // select_option - no <select> on this site, must fail gracefully
        // await test("select_option (no <select> on page)", () =>
        //     selectOptionTool.invoke({
        //         selector: "select",
        //         label: "Computer Science",
        //     })
        // );







    } finally {
        printSummary();
        await browserManager.closeBrowser();
    }
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});

