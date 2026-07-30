import { describe, it, expect, vi } from "vitest";

// Set env before importing agent
process.env.NODE_ENV = "test";
process.env.X402_RECEIVER_ADDRESS = "0xTest";
process.env.X402_PRICING = "0.01";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

async function importApp() {
  return await import("../src/index.js");
}

describe("Lending Liquidation Sentinel agent", () => {
  beforeEach(() => mockFetch.mockReset());

  it("/health returns ok and version", async () => {
    const { app } = await importApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
  });

  it("/entrypoints/check/invoke returns risk data with Aave", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "0xwallet",
            totalCollateralETH: "5000000000000000000",
            totalBorrowsETH: "2000000000000000000",
            healthFactor: "1.05",
            reserves: [
              {
                reserve: {
                  symbol: "ETH",
                  liquidationThreshold: "0.8",
                },
                currentATokenBalance: "2000000000000000000",
                currentTotalDebt: "1000000000000000000",
              },
            ],
          },
        },
      }),
    });

    const { app } = await importApp();
    const res = await app.request("/entrypoints/check/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          wallet: "0xwallet",
          protocol_ids: ["aave"],
          positions: ["ETH"],
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("succeeded");
    expect(body.output.ok).toBe(true);
    expect(body.output.health_factor).toBeDefined();
    expect(body.output.liq_price).toBeGreaterThan(0);
    expect(body.output.alert_threshold_hit).toBe(true);
  });

  it("returns error for invalid input", async () => {
    const { app } = await importApp();
    const res = await app.request("/entrypoints/check/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    });

    expect(res.status).toBe(400);
  });
});