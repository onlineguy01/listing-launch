import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./session";

describe("signed tokens", () => {
  it("round-trips and enforces purpose and expiry", async () => {
    const t = await signToken({ purpose: "magic", email: "a@b.co", exp: Date.now() + 60_000 });
    expect((await verifyToken(t, "magic"))?.email).toBe("a@b.co");
    expect(await verifyToken(t, "session")).toBeNull();
    const expired = await signToken({ purpose: "magic", email: "a@b.co", exp: Date.now() - 1 });
    expect(await verifyToken(expired, "magic")).toBeNull();
  });
  it("rejects tampered payloads", async () => {
    const t = await signToken({ purpose: "session", email: "a@b.co", exp: Date.now() + 60_000 });
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ purpose: "session", email: "evil@b.co", exp: Date.now() + 60_000 })).toString("base64url");
    expect(await verifyToken(`${forged}.${sig}`, "session")).toBeNull();
    expect(await verifyToken(`${body}.AAAA`, "session")).toBeNull();
  });
});
