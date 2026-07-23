

export function getNextNode(fullContent: string) {
    if (fullContent.includes("__TRANSFER_VISION_AGENT__")) {
        return {
            nextNode: "visionAgentNode",
            shouldHandoff: true
        }
    }
    else if (fullContent.includes("__TRANSFER_JS_AGENT__")) {
        return {
            nextNode: "javaScriptAgentNode",
            shouldHandoff: true
        }
    }

    else if (fullContent.includes("__TRANSFER_WEB_SCRAPPER_AGENT__")) {
        return {
            nextNode: "webScrapperAgentNode",
            shouldHandoff: true
        }
    }

    else if (fullContent.includes("__TRANSFER_NAVIGATION_AGENT__")) {
        return {
            nextNode: "navigationAgentNode",
            shouldHandoff: true
        }
    }

    else if (fullContent.includes("__TRANSFER_RESEARCHER_AGENT__")) {
        return {
            nextNode: "researchAgentNode",
            shouldHandoff: true
        }
    }


    else {
        return {
            nextNode: "",
            shouldHandoff: false
        }
    }
}