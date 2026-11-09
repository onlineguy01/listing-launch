import type { CanonicalBusiness, DirectoryDefinition } from "@/lib/domain/types";
import type { AdapterContext, SubmissionResult } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

/**
 * Declarative description of one directory's "add your business" form.
 * `fields` maps a CSS selector to the value to enter. `submit` is the selector
 * of the final button. `successText` is a string the page shows on success,
 * `verificationText` one it shows when the owner must confirm something.
 *
 * Selectors are discovered by inspecting the live site with a real browser and
 * must be kept in the directory's adapter file. Never guess them.
 */
export interface FormSpec {
  url: string;
  fields: { selector: string; value: (biz: CanonicalBusiness) => string | undefined; kind?: "text" | "select" | "check" }[];
  submit: string;
  successText?: string;
  verificationText?: string;
  /** Selector that, when present, means a CAPTCHA or login wall blocks us. We stop and hand off to ops. */
  blockedSelector?: string;
}

export interface BrowserLike {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  check(selector: string): Promise<void>;
  click(selector: string): Promise<void>;
  exists(selector: string): Promise<boolean>;
  text(): Promise<string>;
  url(): string;
  screenshot(path: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Base class for directories whose submission is a permitted public web form.
 * The browser is injected so the logic is unit-testable without Chromium.
 */
export abstract class PlaywrightFormAdapter extends SearchFetchAdapter {
  constructor(def: DirectoryDefinition, protected readonly spec: FormSpec) { super(def); }

  protected openBrowser: () => Promise<BrowserLike> = launchChromium;

  async submit(biz: CanonicalBusiness, ctx: AdapterContext): Promise<SubmissionResult> {
    const elig = this.eligibility(biz);
    if (!elig.eligible) return { status: "failed", notes: elig.reason };
    const b = await this.openBrowser();
    try {
      await b.goto(this.spec.url);
      if (this.spec.blockedSelector && (await b.exists(this.spec.blockedSelector))) {
        ctx.log("form_blocked", { directory: this.def.id, url: b.url() });
        return { status: "manual_required", notes: "Login wall or CAPTCHA present; handing to ops." };
      }
      for (const f of this.spec.fields) {
        const v = f.value(biz);
        if (v === undefined || v === "") continue;
        if (f.kind === "select") await b.select(f.selector, v);
        else if (f.kind === "check") await b.check(f.selector);
        else await b.fill(f.selector, v);
      }
      await b.click(this.spec.submit);
      const text = await b.text();
      const shot = `${process.env.SCREENSHOT_DIR ?? "/tmp"}/${this.def.id}-${Date.now()}.png`;
      await b.screenshot(shot).catch(() => {});
      if (this.spec.verificationText && text.includes(this.spec.verificationText)) {
        return { status: "verification_required", ownerActions: this.def.ownerActions, notes: `Screenshot: ${shot}` };
      }
      if (!this.spec.successText || text.includes(this.spec.successText)) {
        return { status: "submitted", listingUrl: b.url(), notes: `Screenshot: ${shot}` };
      }
      return { status: "failed", notes: `No success text after submit. Screenshot: ${shot}` };
    } catch (e) {
      ctx.log("form_error", { directory: this.def.id, error: String(e) });
      return { status: "failed", notes: String(e) };
    } finally {
      await b.close();
    }
  }
}

/** Common field helpers for FormSpec authors. */
export const F = {
  name: (b: CanonicalBusiness) => b.name,
  phone: (b: CanonicalBusiness) => formatPhoneDisplay(b.phoneE164),
  website: (b: CanonicalBusiness) => b.website,
  street: (b: CanonicalBusiness) => (b.hideAddress ? undefined : b.street),
  city: (b: CanonicalBusiness) => b.city,
  state: (b: CanonicalBusiness) => b.state,
  zip: (b: CanonicalBusiness) => b.postalCode,
  email: (b: CanonicalBusiness) => b.ownerEmail,
  descriptionShort: (b: CanonicalBusiness) => b.descriptionShort,
};

/** Real Chromium via playwright-core. Uses the system browser when PLAYWRIGHT_CHROMIUM_PATH is set. */
async function launchChromium(): Promise<BrowserLike> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (compatible; ListingLaunch/0.1)" });
  return {
    goto: async (u) => { await page.goto(u, { waitUntil: "domcontentloaded", timeout: 30000 }); },
    fill: (s, v) => page.fill(s, v, { timeout: 10000 }),
    select: async (s, v) => { await page.selectOption(s, v, { timeout: 10000 }); },
    check: (s) => page.check(s, { timeout: 10000 }),
    click: async (s) => { await Promise.all([page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {}), page.click(s, { timeout: 10000 })]); },
    exists: async (s) => (await page.locator(s).count()) > 0,
    text: () => page.innerText("body"),
    url: () => page.url(),
    screenshot: async (p) => { await page.screenshot({ path: p, fullPage: true }); },
    close: () => browser.close(),
  };
}
