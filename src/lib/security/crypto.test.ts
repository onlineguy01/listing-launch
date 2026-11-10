import { describe, expect, it, beforeAll } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("crypto", () => {
  beforeAll(() => { process.env.APP_SECRET = "test-secret-at-least-16-chars"; });
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("1//refresh-token");
    const b = encrypt("1//refresh-token");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("1//refresh-token");
    expect(decrypt(b)).toBe("1//refresh-token");
  });
  it("rejects tampering", () => {
    const blob = encrypt("secret");
    const parts = blob.split(".");
    parts[2] = Buffer.from("xx" + Buffer.from(parts[2], "base64").toString("binary").slice(2), "binary").toString("base64");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
});
