import type { Page } from "playwright";

export function humanDelay(minMs: number = 80, maxMs: number = 250): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
}

export const shortPause = () => humanDelay(100, 400);

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
