// Aave v2 subgraph integration

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

const AAVE_SUBGRAPH: Record<string, string> = {
  ethereum: "https://api.thegraph.com/subgraphs/name/aave/lending-pool-v2",
};

export async function fetchAaveUserData(
  wallet: string,
  chain: string
): Promise<AaveUserData | null> {
  const url = AAVE_SUBGRAPH[chain];
  if (!url) return null;

  try {
    const query = `{
      user(id: "${wallet.toLowerCase()}") {
        id
        totalCollateralETH
        totalBorrowsETH
        healthFactor
        reserves {
          reserve {
            symbol
            liquidationThreshold
          }
          currentATokenBalance
          currentTotalDebt
        }
      }
    }`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data?.user) return null;

    const user = data.data.user;
    const positions: AavePosition[] = (user.reserves || [])
      .filter((r: any) => Number(r.currentATokenBalance) > 0)
      .map((r: any) => ({
        symbol: r.reserve.symbol,
        collateralBalance: Number(r.currentATokenBalance) / 1e18,
        debtBalance: Number(r.currentTotalDebt) / 1e18,
        liquidationThreshold: Number(r.reserve.liquidationThreshold),
      }));

    return {
      wallet: user.id,
      healthFactor: Number(user.healthFactor),
      totalCollateralEth: Number(user.totalCollateralETH) / 1e18,
      totalBorrowsEth: Number(user.totalBorrowsETH) / 1e18,
      positions,
    };
  } catch {
    return null;
  }
}