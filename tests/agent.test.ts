import { describe, it, expect } from "vitest";
import app from "../src/index.js";

describe("Lending Liquidation Sentinel agent", () => {
  it("/health returns ok and version", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
  });

  it("expõe .well-known/agent.json e entrypoints", async () => {
    const res = await app.request("/.well-known/agent.json");
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe("lending-liquidation-sentinel");

    const eps = await app.request("/entrypoints");
    expect(eps.status).toBe(200);
    const { items } = await eps.json();
    expect(items.map((i: any) => i.key)).toContain("check");
  });

  it("x402: POST check invoke sem pagamento → 402 + paymentRequirements", async () => {
    const res = await app.request("/entrypoints/check/invoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { wallet: "0xwallet", protocol_ids: ["aave"], positions: [] },
      }),
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toContain("X-PAYMENT");
    expect(Array.isArray(body.accepts)).toBe(true);
    const req = body.accepts[0];
    expect(req.network).toBeDefined();
    expect(req.maxAmountRequired).toBeDefined();
    expect(req.payTo).toBeDefined();
  });
});
