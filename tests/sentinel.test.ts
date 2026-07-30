import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

async function importHandler() {
  return await import("../src/lib/sentinel.js");
}

function encodeData(vals: number[]): string {
  return "0x" + vals.map(v => v.toString(16).padStart(64, "0")).join("");
}

describe("checkLiquidationRisk", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns position check from Aave with all required fields", async () => {
    // Mock RPC: HF=1.05, collateral=5ETH, debt=2ETH, liqThreshold=0.8
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0", id: 1,
        result: encodeData([500000000, 200000000, 0, 8000, 7500, 1050000000000000000]),
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
    // Mock RPC: HF=2.5
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0", id: 1,
        result: encodeData([500000000, 200000000, 0, 8000, 7500, 2500000000000000000]),
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