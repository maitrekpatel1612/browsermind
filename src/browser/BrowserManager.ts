import {chromium} from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type {Browser, BrowserContext, Page, Frame, Dialog} from 'playwright';
import path from "path";
import fs from "fs";
import { randomInt } from 'crypto';

// User agents to randomize the browser fingerprint and avoid detection (to blend in with normal user traffic)
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
]

const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
]


// Function to pick a random user agent and viewport from the lists above
function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export interface DialogInfo {
    type : string;
    message : string;
    defaultValue? : string;
}

export class BrowserManager {
    private browser : Browser | null = null;
    private context : BrowserContext | null = null;
    private _page : Page | null = null;
    private _pages : Page[] = []; // Array to hold multiple pages of the same browser context   #2 all open tabs support
    private _activePageIndex : number = 0; // Index of the currently active page in the _pages array
    private _activeFrame : Frame | null = null; // Currently active frame in the active page (iFrame support)   #1 iframe support
    private _lastDialog : DialogInfo | null = null; // Store the last dialog information
    private _idleTimer : ReturnType<typeof setInterval> | null = null; // Timer to track idle time

    // Track the last mouse position to simulate human-like mouse movements
    public lastMouseX = 0;
    public lastMouseY = 0;

    // Configuration options for the browser manager to control its behavior and performance
    private readonly headless : boolean;
    private readonly slowMo : number;
    private readonly timeout : number;
    private readonly sessionDir : string;
    private readonly sessionName : string;
    private readonly viewport : { width: number, height: number };
    private readonly userAgent : string;

    constructor()
    {
        this.headless = process.env.HEADLESS !== 'false'; // Default to true unless explicitly set to 'false'
        this.slowMo = parseInt(process.env.SLOW_MO ?? "50" , 10); // Default to 50ms unless specified in the environment variable 
        this.timeout = parseInt(process.env.TIMEOUT ?? '30000' , 10);
        this.sessionDir = process.env.SESSION_DIR || './sessions';
        this.sessionName = process.env.SESSION_NAME || 'default';
        this.viewport = pick(VIEWPORTS);
        this.userAgent = pick(USER_AGENTS);
    }

    private getSessionPath() : string {
        const resolvedSessionDir = path.resolve(this.sessionDir);
        if(!fs.existsSync(resolvedSessionDir)) {
            fs.mkdirSync(resolvedSessionDir, { recursive: true });
        }
        return path.join(resolvedSessionDir, `${this.sessionName}.json`);
    }


    // Initialize the browser with stealth plugin and set up the context and page
    async launchBrowser() : Promise<void> {
        if(this.browser) return; // Browser is already launched

        const sessionPath = this.getSessionPath(); // Get the path for the session storage

        this.browser = await chromium.launch({
            headless : this.headless,
            slowMo : this.slowMo,
            args : [
                // Get Chromium running inside Docker container or Linux servers as root user without sandboxing
                '--no-sandbox',
                '--disable-setuid-sandbox',
                // Disable GPU and other features to reduce resource usage and improve stability
                '--disable-gpu',
                // Forces Chrome to write temporary data to disk storage(/tmp) rather than shared memory (/dev/shm) which is often limited in Docker containers
                '--disable-dev-shm-usage',
                // Stop to being detected as a bot by websites that check for automation tools
                '--disable-blink-features=AutomationControlled',
                // Prevents Chrome from showing to Top Warning Bar that says "Chrome is being controlled by automated test software"
                '--disable-infobars',
                // Disable extensions to reduce resource usage and avoid potential conflicts with automation scripts
                '--disable-extensions',
                // Disable default apps 
                '--disable-default-apps',
                // Prevent Chrome from opening the "Welcome" page on first launch
                '--no-first-run',
                // Disable the default browser check to avoid prompts and popups
                '--no-default-browser-check',
                // Disable the password manager to avoid popups and prompts
                '--disable-password-manager-reauthentication',
                // Disable the "Save Password" bubble to avoid popups and prompts
                '--disable-save-password-bubble',
                // Preveents chrome from freezing or slowing down tab process when hidden or running in the background
                '--disable-background-timer-throttling',
                // Prevents Chrome from throttling JavaScript timers in background tabs to improve performance and responsiveness   
                '--disable-backgrounding-occluded-windows',
                // Prevents Chrome from pausing or slowing down background tabs to improve performance and responsiveness
                '--disable-renderer-backgrounding',
                `--window-size=${this.viewport.width},${this.viewport.height}`,
            ],
        });

        
        const contextOptions: Parameters<Browser['newContext']>[0] = {
            viewport: this.viewport,
            userAgent: this.userAgent,
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
            permissions: ['geolocation'],
            geolocation: {
                latitude: 28.6139,
                longitude: 77.2090,
            },
            extraHTTPHeaders: {
                'Accept-Language': 'en-IN,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            },
            ignoreHTTPSErrors: false,
        }

        // Load session state if it exists to maintain cookies, local storage, and other session data across browser restarts
        if(fs.existsSync(sessionPath)) {
            contextOptions.storageState = sessionPath;
            console.log(`[Browser] Loaded session from ${sessionPath}`);
        }

        // Create a new browser context with the specified options and set timeouts for navigation and actions
        this.context = await this.browser.newContext(contextOptions);
        this.context.setDefaultTimeout(this.timeout);
        this.context.setDefaultNavigationTimeout(this.timeout);

        // Init Scrips (Inject into every page/frame)
        await this.context.addInitScript(() => 
        {
            // Webdriver Flag 
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            // Plugins Flag
            Object.defineProperty(navigator, 'plugins', {
                get : () => [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }, { name: 'Native Client' }],
            });

            // Languages Flag
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-IN', 'en'],
            });

            // Screen Flag (Define screen dimensions to match the viewport size and avoid detection based on screen size)
            const vw = (window as unknown as {_vw?: number})._vw || screen.availWidth || 1920;
            const vh = (window as unknown as {_vh?: number})._vh || screen.availHeight || 1080;
            // Override the screen properties to match the viewport size and avoid detection based on screen size
            Object.defineProperty(screen, 'width', { get: () => vw });
            Object.defineProperty(screen, 'height', { get: () => vh });
            Object.defineProperty(screen, 'availWidth', { get: () => vw });
            Object.defineProperty(screen, 'availHeight', { get: () => vh });
            Object.defineProperty(screen, 'outerWidth', { get: () => vw });
            Object.defineProperty(screen, 'outerHeight', { get: () => vh });
            Object.defineProperty(window, 'innerWidth', { get: () => vw });
            Object.defineProperty(window, 'innerHeight', { get: () => vh });


            // Chrome Object 
            (window as unknown as Record<string, unknown>).chrome = {
                runtime : {}, loadTimes : () => ({}) , csi : () => ({}), app : {},
            };

            // Permissions
            const originalQuery = window.navigator.permissions?.query;
            if(originalQuery) {
                window.navigator.permissions.query = (parameters : PermissionDescriptor) => 
                parameters.name === 'notifications' 
                ? Promise.resolve({ state: "denied" } as PermissionStatus) 
                : originalQuery.call(window.navigator.permissions, parameters);
            }

            /**
             * Canvas Fingerprinting is a technique used to track users based on the unique characteristics of their browser's rendering of HTML5 canvas elements.
             * By adding subtle noise to the canvas rendering, we can make it more difficult for trackers to generate a consistent fingerprint for the user.
             * This helps to protect user privacy and reduce the effectiveness of tracking techniques that rely on canvas fingerprinting.
             * 
             * However, it's important to note that this technique is not foolproof and may not completely prevent tracking. It is just one of many techniques that can be used to enhance user privacy.
             * But using this medium blog post as a reference we are implementing this method
             * ? https://dev.to/tanwydd/how-your-canvas-fingerprint-gets-you-caught-and-why-random-noise-makes-it-worse-3ba1
             *  */
            //~ Bypass Canvas Fingerprinting
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            
                const d = originalGetImageData.call(this, x, y, w, h);
                for(let i = 0; i < d.data.length; i += 100) {
                    d.data[i] = d.data[i] ^ 1; // XOR operation to add subtle noise to the pixel data [1 bit noise, imperceptible]
                }
                return d;
            }

            //~ WebGL Vendor/Renderer - Prevent BotTracker from seeing your actual graphics card hardware
            const origGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter : number) {
                // UNMASKED_VENDOR_WEBGL
                if(parameter === 37445)  return "Intel Inc.";
                if(parameter === 37446) return "Intel Iris OpenGL Engine";
                return origGetParameter.call(this, parameter);
            }

        });

            // We are creating a new page (tab) in the browser context. In Playwright, a BrowserContext can have multiple pages (tabs), and each page can be used to interact with different web pages independently. 
            // By calling this.context.newPage(), we are opening a new tab in the browser where we can navigate to a URL, interact with elements, and perform various actions without affecting other pages in the same context.
            this._page = await this.context.newPage();
            this._pages = [this._page]; // Initialize the _pages array with the newly created page


            //~ Request Header Clenup
            await this._page.route('**/*', async (route) => {
                const headers = { ...route.request().headers() };
                delete headers['x-playwright'];
                delete headers['x-puppeteer'];
                await route.continue({ headers });
            });

            //~ Dialog Handling (alert, confirm, prompt) - Automatically handle dialogs by storing the last dialog information and dismissing it to avoid blocking the script execution
            this._page.on('dialog', async (dialog : Dialog) => {
                this._lastDialog = {
                    type : dialog.type(),
                    message : dialog.message(),
                    defaultValue : dialog.defaultValue(),
                };
                console.log(`[Browser] Dialog detected: ${dialog.type()} - "${dialog.message()}"`);
                // Automatically dismiss by default (agent can ovveride via handle_dialog tool) 
                await dialog.accept();
            });
            //~ New Tab / Popup Handler
            this.context?.on("page", async (newPage : Page) => {
                console.log(`[Browser] New page opened: ${newPage.url()}`);
                this._pages.push(newPage);

                // Handle dialogs in the new page (tab) and store the last dialog information
                newPage.on("dialog", async (dialog : Dialog) => {
                    this._lastDialog = {type : dialog.type(), message : dialog.message() };
                    await dialog.accept();
                });

                // Clean up request headers in the new page to avoid detection by removing Playwright-specific headers
                await newPage.route('**/*', async (route) => {
                    const headers = { ...route.request().headers() };
                    delete headers['x-playwright'];
                    delete headers['x-puppeteer'];
                    await route.continue({ headers });
                })
            });


            //~ Idle Behaviour - Random Micro-movements every 8-20s
            if(!this.headless) {
                this._idleTimer = setInterval(async () => {
                    const x = randInt(200, this.viewport.width - 200);
                    const y = randInt(200, this.viewport.height - 200);
                    try{
                        await this._page?.mouse.move(x, y, { steps: randInt(3, 8) });
                        this.lastMouseX = x;
                        this.lastMouseY = y;
                    }
                    catch{
                        // Ignore errors if the page is closed or not available
                    }
                }, randInt(8000, 20000)); // Random interval between 8-20 seconds
            }

            console.log(`[Browser] Launched Browser (headless = ${this.headless})  , Viewport: ${this.viewport.width}x${this.viewport.height}`);
            // Return acative frame (if any) or the main page as the active frame for further interactions 

    }

    // Get the currently active page (tab) in the browser context. If no page is initialized, throw an error.
    getPage() : Page {
        if(!this._page) throw new Error("Browser page is not initialized. Call launchBrowser() first.");
        return this._pages[this._activePageIndex] ?? this._page;
    }

    // Get the currently active frame (iFrame) in the active page. If no frame is active, return the main page as the active frame.
    getFrame() : Frame | Page {
        return this._activeFrame ?? this.getPage();
    }
    
    getContent(): Promise<string> {
        return this.getFrame().content();
    }
    // Get the browser context. If the context is not initialized, throw an error.
    getContext() : BrowserContext {
        if(!this.context) throw new Error("Browser context is not initialized. Call launchBrowser() first.");
        return this.context;
    }

    getAllPages() : Page[] { return [...this._pages]; }

    getActivePageIndex() : number { return this._activePageIndex; }

    getLastDialog() : DialogInfo | null { return this._lastDialog; }

    /**
     *  Switch the iFrame
     *  */

    async switchToFrame(selectorOrUrl : string) : Promise<boolean> {
        const page = this.getPage();

        //Try by CSS Selector first
        const handle = await page.$(selectorOrUrl).catch(() => null);
        if(handle) {
            const frame = await handle.contentFrame();
            if(frame) {
                this._activeFrame = frame;
                console.log(`[Browser] Switched to iFrame with selector: ${selectorOrUrl}`);
                return true;
            }
        }

        //Try by URL
        const frame = page.frames().find(f => f.url().includes(selectorOrUrl));
        if(frame) {
            this._activeFrame = frame;
            console.log(`[Browser] Switched to iFrame by URL: ${frame.url()}`);
            return true;
        }
        return false;
    }


    switchToMainFrame() : void {
        this._activeFrame = null;
        console.log(`[Browser] Switched back to main frame`);
    }

    async switchToTab(index : number) : Promise<boolean> {
        if(index < 0 || index >= this._pages.length) {
            console.warn(`[Browser] Invalid tab index: ${index}. Total tabs: ${this._pages.length}`);
            return false;
        }   
        this._activePageIndex = index;
        this._activeFrame = null; // Reset the active frame when switching tabs
        try{
            await this._pages[index].bringToFront();
        }
        catch { /** Ignore catch */}
        console.log(`[Browser] Switched to tab ${index} : ${this._pages[index].url()}`);
        return true;
    }

    isLaunched() : boolean { 
        return this.browser !== null; 
    }

    async closeBrowser() : Promise<void> {
        if(this._idleTimer) clearInterval(this._idleTimer);
        for(const p of this._pages) { try { await p.close(); } catch {} }
        await this.context?.close().catch(() => {});
        await this.browser?.close().catch(() => {});
        this._page = null;
        this._pages = [];
        this.context = null;
        this.browser = null;
        console.log(`[Browser] Closed Browser`);
    }
}


export const browserMngr = new BrowserManager();