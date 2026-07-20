import { browserManager } from "@/browser/BrowserManager";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Page } from "playwright";

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface DOMNode {
    id: number;
    tag: string;
    role: string;
    name: string;
    value?: string;
    placeholder?: string;
    type?: string;
    href?: string;
    disabled?: boolean;
    checked?: boolean;
    selected?: boolean;
    clickable: boolean;
    editable: boolean;
    focusable: boolean;
    visible: boolean;
    selector: string;
    xpath: string;
    bbox?: BoundingBox;
    level: number;
    children: DOMNode[];
}

async function buildDOMTree(page: Page, rootSelector?: string): Promise<DOMNode | null> {
    return page.evaluate((selector) => {
        // Type definitions inside evaluate
        interface BoundingBox {
            x: number;
            y: number;
            width: number;
            height: number;
        }

        interface DOMNode {
            id: number;
            tag: string;
            role: string;
            name: string;
            value?: string;
            placeholder?: string;
            type?: string;
            href?: string;
            disabled?: boolean;
            checked?: boolean;
            selected?: boolean;
            clickable: boolean;
            editable: boolean;
            focusable: boolean;
            visible: boolean;
            selector: string;
            xpath: string;
            bbox?: BoundingBox;
            level: number;
            children: DOMNode[];
        }

        let nextId = 1;

        const INPUT_ROLE_MAP: Record<string, string> = {
            text: "textbox",
            email: "textbox",
            password: "textbox",
            tel: "textbox",
            url: "textbox",
            search: "searchbox",
            number: "spinbutton",
            checkbox: "checkbox",
            radio: "radio",
            submit: "button",
            button: "button",
            reset: "button",
            file: "button",
            range: "slider",
            color: "textbox",
            date: "textbox"
        };

        const ROLE_MAP: Record<string, string> = {
            a: "link",
            button: "button",
            nav: "navigation",
            main: "main",
            header: "banner",
            footer: "contentinfo",
            section: "region",
            article: "article",
            aside: "complementary",
            form: "form",
            h1: "heading",
            h2: "heading",
            h3: "heading",
            h4: "heading",
            h5: "heading",
            h6: "heading",
            img: "img",
            textarea: "textbox",
            select: "select",
            table: "table",
            tr: "row",
            td: "cell",
            th: "columnheader",
            ul: "list",
            ol: "list",
            li: "listitem",
            dialog: "dialog",
            progress: "progressbar",
            iframe: "document",
            details: "group",
            summary: "button"
        };

        const SKIP_TAGS = new Set([
            "script", "style", "noscript", "meta",
            "link", "svg", "path", "defs", "template"
        ]);

        const INTERACTIVE_INPUT_TYPES = new Set([
            "button", "submit", "checkbox", "radio", "file"
        ]);

        function getRole(el: Element): string {
            const explicit = el.getAttribute("role");
            if (explicit) return explicit;

            const tag = el.tagName.toLowerCase();

            if (tag === "input") {
                const type = (el.getAttribute("type") ?? "text").toLowerCase();
                return INPUT_ROLE_MAP[type] ?? "textbox";
            }

            return ROLE_MAP[tag] ?? "";
        }

        function getAccessibleName(el: Element): string {
            const ariaLabel = el.getAttribute("aria-label")?.trim();
            if (ariaLabel) return ariaLabel;

            const labelledBy = el.getAttribute("aria-labelledby");
            if (labelledBy) {
                const names = labelledBy
                    .split(/\s+/)
                    .map(id => document.getElementById(id))
                    .filter((e): e is HTMLElement => e !== null)
                    .map(e => e.textContent?.trim() ?? "")
                    .filter(Boolean);
                if (names.length) return names.join(" ");
            }

            const id = (el as HTMLElement).id;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label?.textContent?.trim()) {
                    return label.textContent.trim();
                }
            }

            if (el instanceof HTMLInputElement && el.labels?.length) {
                return Array.from(el.labels)
                    .map(l => l.textContent?.trim() ?? "")
                    .join(" ")
                    .trim();
            }

            const attrs = ["placeholder", "alt", "title", "name"] as const;
            for (const attr of attrs) {
                const value = el.getAttribute(attr);
                if (value) return value;
            }

            const text = (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim();
            return text ? text.slice(0, 80) : "";
        }

        function isVisible(el: HTMLElement): boolean {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" ||
                style.opacity === "0" || el.hidden) {
                return false;
            }

            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        function getCssSelector(el: Element): string {
            const htmlEl = el as HTMLElement;
            if (htmlEl.id) {
                return `#${CSS.escape(htmlEl.id)}`;
            }

            const path: string[] = [];
            let current: Element | null = el;

            while (current && current !== document.body) {
                const tag = current.tagName.toLowerCase();
                let selector = tag;

                if (current.classList.length > 0) {
                    selector += "." + Array.from(current.classList)
                        .slice(0, 2)
                        .map(cls => CSS.escape(cls))
                        .join(".");
                }

                const parent: Element | null = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(
                        (child): child is Element => child.tagName === current!.tagName
                    );

                    if (siblings.length > 1) {
                        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
                    }
                }

                path.unshift(selector);
                current = parent;
            }

            return path.join(" > ");
        }

        function getXPath(el: Element): string {
            const parts: string[] = [];
            let current: Element | null = el;

            while (current && current.nodeType === Node.ELEMENT_NODE) {
                let index = 1;
                let sibling = current.previousElementSibling;

                while (sibling) {
                    if (sibling.tagName === current.tagName) index++;
                    sibling = sibling.previousElementSibling;
                }

                parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
                current = current.parentElement;
            }

            return "/" + parts.join("/");
        }

        function isClickable(el: HTMLElement): boolean {
            if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) {
                return true;
            }

            if (el instanceof HTMLInputElement &&
                INTERACTIVE_INPUT_TYPES.has(el.type)) {
                return true;
            }

            return !!(el.onclick || el.hasAttribute("onclick") ||
                el.getAttribute("role") === "button");
        }

        function isEditable(el: HTMLElement): boolean {
            return el instanceof HTMLInputElement ||
                el instanceof HTMLTextAreaElement ||
                el instanceof HTMLSelectElement ||
                el.isContentEditable;
        }

        function isFocusable(el: HTMLElement): boolean {
            return el.tabIndex >= 0 || isClickable(el) || isEditable(el);
        }

        function shouldKeepNode(role: string, name: string, tag: string, children: DOMNode[]): boolean {
            if (children.length > 0) return true;
            if (name) return true;
            if (role) return true;

            return ["input", "button", "a", "textarea", "select", "img"].includes(tag);
        }

        function getBoundingBox(el: HTMLElement): BoundingBox {
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }

        function walkDOM(el: Element, depth: number): DOMNode | null {
            const tag = el.tagName.toLowerCase();

            if (SKIP_TAGS.has(tag)) return null;

            const htmlEl = el as HTMLElement;
            if (!isVisible(htmlEl)) return null;

            const children: DOMNode[] = [];
            for (const child of Array.from(el.children)) {
                const node = walkDOM(child, depth + 1);
                if (node) children.push(node);
            }

            const role = getRole(el);
            const name = getAccessibleName(el);

            if (!shouldKeepNode(role, name, tag, children)) {
                if (children.length === 1) return children[0];
                if (children.length > 1) {
                    return {
                        id: -1,
                        tag: "",
                        role: "",
                        name: "",
                        clickable: false,
                        editable: false,
                        focusable: false,
                        visible: true,
                        selector: "",
                        xpath: "",
                        level: depth,
                        children
                    };
                }
                return null;
            }

            const node: DOMNode = {
                id: nextId++,
                tag,
                role,
                name,
                clickable: isClickable(htmlEl),
                editable: isEditable(htmlEl),
                focusable: isFocusable(htmlEl),
                visible: true,
                selector: getCssSelector(el),
                xpath: getXPath(el),
                bbox: getBoundingBox(htmlEl),
                level: depth,
                children
            };

            // Add element-specific properties
            if ("value" in el && (el as HTMLInputElement).value) {
                node.value = (el as HTMLInputElement).value;
            }
            if ("placeholder" in el && (el as HTMLInputElement).placeholder) {
                node.placeholder = (el as HTMLInputElement).placeholder;
            }
            if (el instanceof HTMLInputElement && el.type) {
                node.type = el.type;
            }
            if (el instanceof HTMLAnchorElement && el.href) {
                node.href = el.href;
            }
            if ("disabled" in el && (el as HTMLInputElement).disabled) {
                node.disabled = (el as HTMLInputElement).disabled;
            }
            if ("checked" in el && (el as HTMLInputElement).checked) {
                node.checked = (el as HTMLInputElement).checked;
            }
            if ("selected" in el && (el as HTMLOptionElement).selected) {
                node.selected = (el as HTMLOptionElement).selected;
            }

            return node;
        }

        const root = selector ? document.querySelector(selector) : document.body;
        return root ? walkDOM(root, 0) : null;
    }, rootSelector ?? null);
}

function pruneTree(node: DOMNode | null): DOMNode | null {
    if (!node) return null;

    const meaningfulRoles = new Set([
        "button", "link", "textbox", "searchbox", "checkbox", "radio",
        "switch", "combobox", "listbox", "option", "menuitem", "tab",
        "heading", "navigation", "main", "banner", "contentinfo",
        "form", "dialog", "alert", "region", "list", "listitem",
        "table", "row", "cell", "columnheader", "img"
    ]);

    const structuralTags = new Set([
        "body", "div", "span", "section", "article", "header", "footer", "main", "nav"
    ]);

    const children = node.children
        .map(pruneTree)
        .filter((c): c is DOMNode => c !== null);

    const isInteractive = node.clickable || node.editable;
    const hasMeaningfulRole = meaningfulRoles.has(node.role);
    const hasUsefulName = !!node.name?.trim() && !structuralTags.has(node.tag);

    if (isInteractive || hasMeaningfulRole || hasUsefulName) {
        return { ...node, children };
    }

    if (children.length === 1) return children[0];
    if (children.length > 1) {
        return {
            ...node,
            children,
            id: -1,
            role: "",
            tag: "",
            name: ""
        };
    }

    return null;
}

function formatTree(node: DOMNode | null): string {
    if (!node) return "No accessibility tree found.";

    const lines: string[] = [];

    function walk(node: DOMNode) {
        if (node.id === -1) {
            for (const child of node.children) walk(child);
            return;
        }

        const indent = "  ".repeat(node.level);
        let line = `${indent}[${node.id}] [${node.role || node.tag}]`;

        const showName = !["body", "div", "span", "section", "article"].includes(node.tag);
        if (showName && node.name) {
            line += ` "${node.name.slice(0, 40)}"`;
        }

        const props: [string, string | undefined][] = [
            ["type", node.type],
            ["placeholder", node.placeholder],
            ["value", node.value],
            ["href", node.href]
        ];

        for (const [key, value] of props) {
            if (value) line += ` ${key}="${value}"`;
        }

        if (node.checked) line += " (checked)";
        if (node.selected) line += " (selected)";
        if (node.disabled) line += " (disabled)";
        if (node.clickable) line += " [clickable]";
        if (node.editable) line += " [editable]";

        lines.push(line);

        for (const child of node.children) walk(child);
    }

    walk(node);
    return lines.join("\n");
}

export const getAccessibilityTreeTool = tool(
    async ({ region }) => {
        try {
            const page = browserManager.getPage();
            const title = await page.title();
            const url = page.url();

            const tree = await buildDOMTree(page, region);
            const filteredTree = pruneTree(tree);
            const formattedTree = formatTree(filteredTree);

            return [
                `Page : "${title}"`,
                `URL  : ${url}`,
                "",
                "=".repeat(80),
                "Accessibility Tree",
                "=".repeat(80),
                "",
                formattedTree,
                "",
                "=".repeat(80),
                "Instructions:",
                "- Use the numeric id for click/type/hover tools.",
                "- Prefer interactive nodes.",
                "- Use selector/xpath internally if needed.",
                "- Roles follow ARIA semantics wherever possible."
            ].join("\n");
        } catch (err) {
            return `Failed to build accessibility tree.\n${String(err)}`;
        }
    },
    {
        name: "get_accessibility_tree",
        description: "Returns a simplified accessibility tree of the current page or a specific region. Use this tool before click, type, hover or select actions to understand the page structure.",
        schema: z.object({
            region: z.string().optional().describe("Optional CSS selector whose subtree should be returned.")
        })
    }
);