// Lending liquidation risk calculations

/**
 * Calculate health factor for a lending position
 * HF = (collateral_usd * liquidation_threshold) / borrowed_usd
 * HF < 1.0 = liable for liquidation
 */
export function calcHealthFactor(
  collateralUsd: number,
  borrowedUsd: number,
  liquidationThreshold: number = 0.8
): number {
  if (borrowedUsd <= 0) return Infinity;
  return (collateralUsd * liquidationThreshold) / borrowedUsd;
}

/**
 * Calculate liquidation price for a borrowing position
 * liq_price = borrowed_usd / (collateral_amount * liquidation_threshold)
 */
export function calcLiquidationPrice(
  borrowedUsd: number,
  collateralAmount: number,
  threshold: number = 0.8
): number {
  return borrowedUsd / (collateralAmount * threshold);
}

/**
 * Calculate safety buffer percentage from current price to liquidation price
 */
export function calcBuffer(currentPrice: number, liquidationPrice: number): number {
  return ((currentPrice - liquidationPrice) / currentPrice) * 100;
}

/**
 * Alert threshold: HF < 1.1 triggers warning
 */
export function shouldAlert(healthFactor: number): boolean {
  return healthFactor < 1.1;
}