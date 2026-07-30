import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

async function importHandler() {
  return await import("../src/lib/sentinel.js");
}

describe("checkLiquidationRisk", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns position check from Aave with all required fields", async () => {
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
                  price: { symbol: "3000" },
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

    const { checkLiquidationRisk } = await importHandler();
    const result = await checkLiquidationRisk({
      wallet: "0xwallet",
      protocolIds: ["aave"],
      positions: ["ETH"],
    });

    expect(result.ok).toBe(true);
    expect(result.health_factor).toBe(1.05);
    expect(result.liq_price).toBeGreaterThan(0);
    expect(result.buffer_percent).toBeDefined();
    expect(result.alert_threshold_hit).toBe(true);
    expect(result.protocols_checked).toBe(1);
  });

  it("returns false alert when health factor is healthy", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "0xwallet",
            totalCollateralETH: "5000000000000000000",
            totalBorrowsETH: "2000000000000000000",
            healthFactor: "2.5",
            reserves: [
              {
                reserve: {
                  symbol: "ETH",
                  price: { symbol: "3000" },
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

    const { checkLiquidationRisk } = await importHandler();
    const result = await checkLiquidationRisk({
      wallet: "0xwallet",
      protocolIds: ["aave"],
      positions: ["ETH"],
    });

    expect(result.ok).toBe(true);
    expect(result.alert_threshold_hit).toBe(false);
  });

  it("returns ok=false for unsupported protocol", async () => {
    const { checkLiquidationRisk } = await importHandler();
    const result = await checkLiquidationRisk({
      wallet: "0xwallet",
      protocolIds: ["compound"],
      positions: ["ETH"],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unsupported protocol");
  });
});