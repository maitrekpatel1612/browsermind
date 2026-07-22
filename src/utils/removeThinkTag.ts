export function removeThinkTag(input: string): string {

    if (!input) {
        return "";
    }

    return input
        .replace(/<\/?think>/gi, "") // Remove <think> and </think> tags
        .replace(/__TRANSFER_[A-Z_]+__/gi, "") // Remove any transfer tags
        .replace(/^\s*\+\s*/, "") // Remove leading '+' and any whitespace before it
        .trim(); // Trim leading and trailing whitespace
}