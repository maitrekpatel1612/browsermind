import type { Page } from "playwright";
import { randInt } from "@/browser/BrowserManager";

export function humanDelay(minMs: number = 80, maxMs: number = 250): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, randInt(minMs, maxMs)));
}

export async function humanMouseMove(page: Page, x: number, y: number): Promise<void> {
    const steps = Math.max(8, Math.min(25, Math.round(Math.hypot(x, y) / 50)));
    await page.mouse.move(x, y, { steps });
}

export async function humanType(
    page: Page,
    text: string,
    speed: "slow" | "normal" | "fast" = "normal"
): Promise<void> {
    const ranges = {
        slow: { min: 120, max: 220 },
        normal: { min: 45, max: 120 },
        fast: { min: 10, max: 35 },
    } as const;

    const timing = ranges[speed] ?? ranges.normal;

    for (const character of text) {
        await page.keyboard.type(character);
        await humanDelay(timing.min, timing.max);
    }
}


export const shortPause = () => humanDelay(100, 400);
export const mediumPause = () => humanDelay(500, 1200);
export const longPause = () => humanDelay(1500, 3000);