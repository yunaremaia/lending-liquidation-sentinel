import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

async function importFetcher() {
  return await import("../src/lib/aave.js");
}

// Helper: encode 6 uint256 values into eth_call hex string
function encodeData(vals: number[]): string {
  const hex = vals.map(v => v.toString(16).padStart(64, "0")).join("");
  return "0x" + hex;
}

describe("fetchAaveUserData", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns user data from RPC eth_call to Aave Pool", async () => {
    // Mock RPC response with 6 values:
    // totalCollateralBase=500000000 (5e8 → 5 ETH worth),
    // totalDebtBase=200000000 (2e8 → 2 ETH worth),
    // availableBorrowBase=0,
    // liquidationThreshold=8000 (0.8),
    // ltv=7500 (0.75),
    // healthFactor=3000000000000000000 (3.0)
    const data = encodeData([500000000, 200000000, 0, 8000, 7500, 3000000000000000000]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: data }),
    });

    const { fetchAaveUserData } = await importFetcher();
    const result = await fetchAaveUserData("0xwallet", "ethereum");

    expect(result).not.toBeNull();
    expect(result!.healthFactor).toBe(3.0);
    expect(result!.totalCollateralEth).toBeCloseTo(5, 1);
    expect(result!.totalBorrowsEth).toBeCloseTo(2, 1);
    expect(result!.positions.length).toBe(1);
    expect(result!.positions[0].liquidationThreshold).toBe(0.8);
  });

  it("returns null when wallet not found (empty result)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x" }),
    });

    const { fetchAaveUserData } = await importFetcher();
    const result = await fetchAaveUserData("0xdead", "ethereum");
    expect(result).toBeNull();
  });

  it("returns null on API failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { fetchAaveUserData } = await importFetcher();
    const result = await fetchAaveUserData("0xwallet", "ethereum");
    expect(result).toBeNull();
  });

  it("returns null for unsupported chain", async () => {
    const { fetchAaveUserData } = await importFetcher();
    const result = await fetchAaveUserData("0xwallet", "solana");
    expect(result).toBeNull();
  });
});