import { fetchAaveUserData } from "./aave.js";
import { calcLiquidationPrice, calcBuffer, shouldAlert } from "./liquidation.js";

interface RiskInput {
  wallet: string;
  protocolIds: string[];
  positions: string[];
}

interface RiskOutput {
  ok: boolean;
  health_factor: number;
  liq_price: number;
  buffer_percent: number;
  alert_threshold_hit: boolean;
  protocols_checked: number;
  error?: string;
}

const SUPPORTED_PROTOCOLS = new Set(["aave"]);

export async function checkLiquidationRisk(input: RiskInput): Promise<RiskOutput> {
  const unsupported = input.protocolIds.filter((p) => !SUPPORTED_PROTOCOLS.has(p));
  if (unsupported.length > 0) {
    return {
      ok: false,
      health_factor: 0,
      liq_price: 0,
      buffer_percent: 0,
      alert_threshold_hit: false,
      protocols_checked: 0,
      error: `Unsupported protocol: ${unsupported.join(", ")}`,
    };
  }

  let protocolsChecked = 0;

  for (const protocol of input.protocolIds) {
    if (protocol === "aave") {
      const userData = await fetchAaveUserData(input.wallet, "ethereum");
      if (!userData) continue;
      protocolsChecked++;

      const hf = userData.healthFactor;
      const pos = userData.positions.length > 0 ? userData.positions[0] : null;
      const currentPrice = 3000; // placeholder ETH price
      const liqPrice = pos
        ? calcLiquidationPrice(pos.debtBalance, pos.collateralBalance, pos.liquidationThreshold)
        : 0;
      const buffer = pos ? calcBuffer(currentPrice, liqPrice) : 0;

      return {
        ok: true,
        health_factor: hf,
        liq_price: liqPrice,
        buffer_percent: buffer,
        alert_threshold_hit: shouldAlert(hf),
        protocols_checked: protocolsChecked,
      };
    }
  }

  return {
    ok: false,
    health_factor: 0,
    liq_price: 0,
    buffer_percent: 0,
    alert_threshold_hit: false,
    protocols_checked: 0,
    error: "No protocols could be checked",
  };
}