import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

async function importFetcher() {
  return await import("../src/lib/aave.js");
}

describe("fetchAaveUserData", () => {
  beforeEach(() => mockFetch.mockReset());

  it("parses user position data from Aave subgraph", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "0xwallet",
            totalCollateralETH: "5000000000000000000",
            totalBorrowsETH: "2000000000000000000",
            availableBorrowsETH: "3000000000000000000",
            healthFactor: "1.5",
            reserves: [
              {
                reserve: {
                  symbol: "ETH",
                  price: { symbol: "3000" },
                  liquidationThreshold: "0.8",
                },
                currentATokenBalance: "2000000000000000000",
                currentVariableDebt: "1000000000000000000",
              },
            ],
          },
        },
      }),
    });

    const { fetchAaveUserData } = await importFetcher();
    const result = await fetchAaveUserData("0xwallet", "ethereum");

    expect(result).not.toBeNull();
    expect(result!.healthFactor).toBe(1.5);
    expect(result!.totalCollateralEth).toBeGreaterThan(0);
    expect(result!.totalBorrowsEth).toBeGreaterThan(0);
    expect(result!.positions).toBeDefined();
    expect(result!.positions.length).toBeGreaterThan(0);
  });

  it("returns null when wallet not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { user: null } }),
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
    const result = await fetchAaveUserData("0xwallet", "cardano");
    expect(result).toBeNull();
  });
});