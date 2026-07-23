export function removeThinkTag(input: string): string {

    if (!input) {
        return "";
    }

    return input
        .replace(/<\/?think>/gi, "") // Remove <think> and </think> tags
        .replace(/__TRANSFER_NAVIGATION_AGENT__/gi, "")
        .replace(/__TRANSFER_VISION_AGENT__/gi, "")
        .replace(/__TRANSFER_WEB_SCRAPPER_AGENT__/gi, "")
        .replace(/__TRANSFER_RESEARCHER_AGENT__/gi, "")
        .replace(/__TRANSFER_JS_AGENT__/gi, "")
        .replace(/^\s*\+\s*/, "") // Remove leading '+' and any whitespace before it
        .trim(); // Trim leading and trailing whitespace
}