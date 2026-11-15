import { describe, it, expect } from "vitest";
import { validateWidgetOrigin } from "./originCheck";
import { NextRequest } from "next/server";

describe("validateWidgetOrigin", () => {
  it("allows requests from matching origin domain", () => {
    const req = new NextRequest("http://localhost/api/v1/widget/chat", {
      headers: { origin: "https://nordikgear.com" },
    });
    const result = validateWidgetOrigin(req, "https://nordikgear.com");
    expect(result.allowed).toBe(true);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://nordikgear.com");
  });

  it("allows subdomains of registered website", () => {
    const req = new NextRequest("http://localhost/api/v1/widget/chat", {
      headers: { origin: "https://shop.nordikgear.com" },
    });
    const result = validateWidgetOrigin(req, "https://nordikgear.com");
    expect(result.allowed).toBe(true);
  });

  it("allows localhost and preview domains in development", () => {
    const req = new NextRequest("http://localhost/api/v1/widget/chat", {
      headers: { origin: "http://localhost:3000" },
    });
    const result = validateWidgetOrigin(req, "https://nordikgear.com");
    expect(result.allowed).toBe(true);
  });
});
