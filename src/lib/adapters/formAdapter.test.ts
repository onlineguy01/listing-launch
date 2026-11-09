import { describe, expect, it } from "vitest";
import { PlaywrightFormAdapter, F, type BrowserLike, type FormSpec } from "./formAdapter";
import { getDirectory } from "@/lib/directories/registry";
import type { CanonicalBusiness } from "@/lib/domain/types";

const biz: CanonicalBusiness = {
  id: "b1", name: "Lone Star Plumbing LLC", street: "4521 N Beltline Rd", city: "Irving", state: "TX", postalCode: "75038",
  country: "US", phoneE164: "+12145550100", website: "https://lonestarplumbingtx.com", categories: ["home_services"], hideAddress: false, ownerEmail: "o@x.com",
};

const spec: FormSpec = {
  url: "https://example.test/add",
  fields: [
    { selector: "#name", value: F.name }, { selector: "#phone", value: F.phone }, { selector: "#street", value: F.street },
    { selector: "#state", value: F.state, kind: "select" }, { selector: "#agree", value: () => "yes", kind: "check" },
  ],
  submit: "button[type=submit]",
  successText: "Thanks for adding your business",
  verificationText: "check your email",
  blockedSelector: ".g-recaptcha",
};

class TestAdapter extends PlaywrightFormAdapter {}

function fakeBrowser(page: { blocked?: boolean; afterSubmit: string; finalUrl?: string }) {
  const log: string[] = [];
  let text = "";
  const b: BrowserLike = {
    goto: async (u) => { log.push(`goto ${u}`); },
    fill: async (s, v) => { log.push(`fill ${s}=${v}`); },
    select: async (s, v) => { log.push(`select ${s}=${v}`); },
    check: async (s) => { log.push(`check ${s}`); },
    click: async (s) => { log.push(`click ${s}`); text = page.afterSubmit; },
    exists: async (s) => s === ".g-recaptcha" && !!page.blocked,
    text: async () => text,
    url: () => page.finalUrl ?? "https://example.test/listing/123",
    screenshot: async () => {},
    close: async () => { log.push("close"); },
  };
  return { b, log };
}

const ctx = { search: async () => [], fetchHtml: async () => null, log: () => {} };

describe("PlaywrightFormAdapter", () => {
  it("fills mapped fields, skips hidden street for service-area businesses, and reports submitted", async () => {
    const a = new TestAdapter(getDirectory("nextdoor"), spec);
    const { b, log } = fakeBrowser({ afterSubmit: "Thanks for adding your business!" });
    a["openBrowser"] = async () => b;
    const r = await a.submit({ ...biz, hideAddress: true }, ctx);
    expect(r.status).toBe("submitted");
    expect(r.listingUrl).toBe("https://example.test/listing/123");
    expect(log).toContain("fill #name=Lone Star Plumbing LLC");
    expect(log).toContain("fill #phone=(214) 555-0100");
    expect(log.some((l) => l.startsWith("fill #street"))).toBe(false);
    expect(log).toContain("select #state=TX");
    expect(log).toContain("check #agree");
    expect(log.at(-1)).toBe("close");
  });
  it("returns verification_required when the page asks the owner to confirm", async () => {
    const a = new TestAdapter(getDirectory("nextdoor"), spec);
    a["openBrowser"] = async () => fakeBrowser({ afterSubmit: "Almost done, check your email to confirm." }).b;
    const r = await a.submit(biz, ctx);
    expect(r.status).toBe("verification_required");
    expect(r.ownerActions).toEqual(["email_confirm"]);
  });
  it("hands off to ops when a CAPTCHA or login wall is present, without filling anything", async () => {
    const a = new TestAdapter(getDirectory("nextdoor"), spec);
    const { b, log } = fakeBrowser({ blocked: true, afterSubmit: "" });
    a["openBrowser"] = async () => b;
    const r = await a.submit(biz, ctx);
    expect(r.status).toBe("manual_required");
    expect(log.some((l) => l.startsWith("fill"))).toBe(false);
  });
  it("fails when the success text never appears", async () => {
    const a = new TestAdapter(getDirectory("nextdoor"), spec);
    a["openBrowser"] = async () => fakeBrowser({ afterSubmit: "Something went wrong" }).b;
    expect((await a.submit(biz, ctx)).status).toBe("failed");
  });
});
