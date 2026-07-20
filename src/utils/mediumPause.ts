import {randInt} from "@/browser/BrowserManager";

export function humanDelay(minMs : number = 80, maxMs : number = 250) : Promise<void> {
    return new Promise(resolve => setTimeout(resolve, randInt(minMs, maxMs)));
}

export const shortPause = () => humanDelay(100, 400);
export const mediumPause = () => humanDelay(500, 1200);
export const longPause = () => humanDelay(1500, 3000);