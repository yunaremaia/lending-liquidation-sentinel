// Aave position data via contract read

interface AavePosition {
  symbol: string;
  collateralBalance: number;
  debtBalance: number;
  liquidationThreshold: number;
}

interface AaveUserData {
  wallet: string;
  healthFactor: number;
  totalCollateralEth: number;
  totalBorrowsEth: number;
  positions: AavePosition[];
}

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce839eD2E439675783D";
const SIG = "0x6e76abe5";

export async function fetchAaveUserData(
  wallet: string,
  chain: string
): Promise<AaveUserData | null> {
  if (chain !== "ethereum") return null;

  try {
    const paddedAddr = wallet.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const rpcs = [
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
    ];

    let result: any = null;
    for (const rpc of rpcs) {
      try {
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [{ to: AAVE_POOL, data: SIG + paddedAddr }, "latest"],
            id: 1,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.result && body.result !== "0x") {
            result = body.result;
            break;
          }
        }
      } catch { /* try next */ }
    }

    if (!result) return null;

    const hex = result.replace(/^0x/, "");
    const vals: number[] = [];
    for (let i = 0; i < 6; i++) {
      vals.push(parseInt(hex.slice(i * 64, (i + 1) * 64) || "0", 16));
    }

    return {
      wallet,
      healthFactor: vals[5] / 1e18,
      totalCollateralEth: vals[0] / 1e8,
      totalBorrowsEth: vals[1] / 1e8,
      positions: vals[0] > 0 ? [{
        symbol: "ETH",
        collateralBalance: vals[0] / 1e8,
        debtBalance: vals[1] / 1e8,
        liquidationThreshold: vals[3] > 0 ? vals[3] / 10000 : 0.8,
      }] : [],
    };
  } catch {
    return null;
  }
}