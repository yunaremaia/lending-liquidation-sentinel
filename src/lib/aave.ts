// Aave position data via contract read
// Uses etherscan API (public, limited rate) for mainnet eth_call

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

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce839eD2F439675783D";

// getUserAccountData(address) → 6 uint256 slots
// Signature: keccak256("getUserAccountData(address)")[:4] = 0x6e76abe5
const SIG = "0x6e76abe5";

export async function fetchAaveUserData(
  wallet: string,
  chain: string
): Promise<AaveUserData | null> {
  if (chain !== "ethereum") return null;

  try {
    // Try public RPC call for real on-chain data
    const paddedAddr = wallet.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const data = SIG + wallet.toLowerCase().replace(/^0x/, "").padStart(64, "0");

    // Try multiple public RPCs
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
      } catch {
        // try next RPC
      }
    }

    if (!result) {
      // Fallback: return mock data for demo/test purposes
      return null;
    }

    // Decode the 6 uint256 values
    const hex = result.replace(/^0x/, "");
    const vals: number[] = [];
    for (let i = 0; i < 6; i++) {
      vals.push(parseInt(hex.slice(i * 64, (i + 1) * 64) || "0", 16));
    }

    const totalCollateralBase = vals[0];
    const totalDebtBase = vals[1];
    const liquidationThreshold = vals[3];
    const healthFactorRaw = vals[5];

    return {
      wallet,
      healthFactor: healthFactorRaw / 1e18,
      totalCollateralEth: totalCollateralBase / 1e8,
      totalBorrowsEth: totalDebtBase / 1e8,
      positions: totalCollateralBase > 0 ? [{
        symbol: "ETH",
        collateralBalance: totalCollateralBase / 1e8,
        debtBalance: totalDebtBase / 1e8,
        liquidationThreshold: liquidationThreshold > 0 ? liquidationThreshold / 10000 : 0.8,
      }] : [],
    };
  } catch {
    return null;
  }
}