/**
 *  
 */

import {browserManager} from "@/browser/BrowserManager";
import {tool} from "@langchain/core/tools";
import {z} from "zod";

interface DOMNode{
    tag : string,
    role : string,
    name : string,
    value : string,
    placeholder: string,
    type : string,
    href : string,
    disabled : boolean,
    checked : boolean,
    selected : boolean,
    level : number,
    children : DOMNode[];
}

async function buildDOMTree(page : import("playwright").Page, rootSelector? : string) {
    const rawTree = await page.evaluate((sel) => {
        function getRole(el : Element) : string 
        {
            const explicit = el.getAttribute("role");
            if(explicit) return explicit;
            const tag = el.tagName.toLowerCase();
            const type = (el as HTMLInputElement).type?.toLowerCase() ?? "";

            const map : Record<string, string> = {
                "a" : "link",
                "button" : "button",
                "select" : "combobox",
                "nav" : "navigation",
                "main" : "main",
                "header" : "banner",
                "footer" : "contentinfo",
                "h1" : "heading",
                "h2" : "heading",
                "h3" : "heading",
                "h4" : "heading",
                "h5" : "heading",
                "h6" : "heading",
                "form" : "form",
                "textarea" : "textbox",
                "img" : "img",
                "ul" : "list",
                "ol" : "list",
                "li" : "listitem",
                "table" : "table",
                "tr" : "row",
                "td" : "cell",
                "th" : "columnheader",
                "iframe" : "document",
                "progress" : "progressbar",
                "details" : "group",
                "summary" : "button",
                "dialog" : "dialog",
                "section" : "region",
                "article" : "article",
                "aside" : "complementary"
            };

            if(tag === "input"){
                const typeMap : Record<string, string> = {
                    checkbox : "checkbox",
                    radio : "radio",
                    submit : "button",
                    button : "button",
                    search : "searchbox",
                    email : "textbox",
                    password : "textbox",
                    text : "textbox",
                    tel : "textbox",
                    number : "spinbutton",
                    range : "slider",
                }
                return typeMap[type] ?? "textbox";
            }

            return map[tag] ?? ""; 
        }

        function getName(el : Element) : string {
            return (
                el.getAttribute("aria-label") ||
                el.getAttribute("placeholder") ||
                el.getAttribute("title") ||
                el.getAttribute("alt") ||
                (el as HTMLElement).innerText?.trim().slice(0,60) ||
                el.getAttribute("name") ||
                ""
            );

        }


        function walkDOM(el : Element, depth : number) : object | null {
            const tag = el.tagName.toLowerCase();
            if(["script","style","noscript","meta","link"].includes(tag)) return null;

            // Skip invisible elements
            const style = window.getComputedStyle(el);
            if(style.display === "none" || style.visibility === "hidden" || (el as HTMLElement).hidden) {return null;}

            const role = getRole(el);
            const name = getName(el);
            const inp = el as HTMLInputElement;

            return {
                tag,
                role,
                name,
                value : inp.value ?? "",
                placeholder : inp.placeholder ?? "",
                type : inp.type ?? "",
                href : (el as HTMLAnchorElement).href ?? "",
                disabled : inp.disabled ?? false,
                checked : inp.checked ?? false,
                selected : (el as HTMLOptionElement).selected ?? false,
                level : depth,
                children : Array.from(el.children)
                    .map(child => walkDOM(child, depth + 1))
                    .filter(Boolean),
            }
        }

        const root = sel ? document.querySelector(sel) : document.body;
        if(!root) return null;
        return walkDOM(root,0);
         
    }, rootSelector ?? null) as DOMNode | null;
}

/** 
 * @------------------------------------------------------                                                             
 * Example output of Accessibility Tree: 
 * Reason to Use this tool : To provide a structured representation of the page's accessibility tree, 
 * and also reduce the amount of data sent to the LLM. 
 * The LLM can then use this structured representation to identify elements to interact with, 
 * rather than relying on raw HTML or visual cues.
 * 
 * @------------------------------------------------------                                                             
 * [navigation]
 *   [link] "Home" href="https://example.com"
 *   [link] "Contact Us" href="https://example.com/contact"
 * [main]
 *   [heading] "Welcome to Example"
 *   [paragraph] "This is an example page."
 *   [button] "Click Me"
 *   [checkbox] "Accept Terms" (checked)
 * 
 *  Use role/name to build selectors for click/type tools
 */
export const getAccessibilityTreeTool = tool(
    async ({region}) => {
        try{
            const page = browserManager.getPage();
            const url = page.url();
            const title = await page.title();
            const tree = await buildDOMTree(page, region);

            return [
                `Page: "${title}" (${url})`,
                "-".repeat(60),
                tree,
                "-".repeat(60),
                "Use role/name to build selectors for click/type tools",
            ].join("\n");

        }
        catch (err){
            return `Error: ${String(err)}`;
        }
    },
    {
        name: "get_accessibility_tree",
        description: "Get the accessibility tree of the current page. Optionally specify a CSS selector to get a subtree.",
        schema: z.object({
            region : z.string().optional().describe("CSS selector for a specific region of the page"),
        })
    }
)