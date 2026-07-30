import { describe, it, expect } from "vitest";
import {
  calcHealthFactor,
  calcLiquidationPrice,
  calcBuffer,
  shouldAlert,
} from "../src/lib/liquidation.js";

describe("calcHealthFactor", () => {
  it("returns 1.0 when collateral equals borrow value (threshold 0.8)", () => {
    // collateral = $1000, borrowed = $800, liquidation threshold = 0.8
    // health factor = collateral * threshold / borrowed = 1000 * 0.8 / 800 = 1.0
    const hf = calcHealthFactor(1000, 800, 0.8);
    expect(hf).toBeCloseTo(1.0, 10);
  });

  it("returns 2.0 when collateral doubles borrowed at threshold 0.8", () => {
    const hf = calcHealthFactor(2000, 800, 0.8);
    expect(hf).toBeCloseTo(2.0, 10);
  });

  it("returns 0.5 at under-collateralized position", () => {
    const hf = calcHealthFactor(500, 800, 0.8);
    expect(hf).toBeCloseTo(0.5, 10);
  });

  it("uses default threshold 0.8 when not specified", () => {
    const hf = calcHealthFactor(1000, 800, 0.8);
    expect(hf).toBe(1.0);
  });

  it("handles different liquidation thresholds", () => {
    // Aave has 0.825 for some assets, Compound 0.75
    expect(calcHealthFactor(1000, 800, 0.85)).toBeCloseTo(1.0625, 4);
    expect(calcHealthFactor(1000, 800, 0.75)).toBeCloseTo(0.9375, 4);
  });
});

describe("calcLiquidationPrice", () => {
  it("calculates liquidation price for a borrowing position", () => {
    // borrowed 800 USDC, collateral 1 ETH at $3000, threshold 0.8
    // liq price = borrowed / (collateral * threshold) = 800 / (1 * 0.8) = $1000
    const liqPrice = calcLiquidationPrice(800, 1, 0.8);
    expect(liqPrice).toBeCloseTo(1000, 10);
  });

  it("returns lower liq price when more collateral deposited", () => {
    // borrowed 800 USDC, collateral 2 ETH, threshold 0.8
    // liq price = 800 / (2 * 0.8) = $500
    const liqPrice = calcLiquidationPrice(800, 2, 0.8);
    expect(liqPrice).toBeCloseTo(500, 10);
  });
});

describe("calcBuffer", () => {
  it("returns positive buffer when price above liquidation", () => {
    // current price $1500, liq price $1000
    // buffer = (1500 - 1000) / 1500 * 100 = 33.33%
    const buffer = calcBuffer(1500, 1000);
    expect(buffer).toBeCloseTo(33.3333, 2);
  });

  it("returns 0 when at liquidation price", () => {
    const buffer = calcBuffer(1000, 1000);
    expect(buffer).toBe(0);
  });

  it("returns negative when below liquidation price", () => {
    // current $900, liq $1000 → buffer = (900-1000)/900*100 = -11.11%
    const buffer = calcBuffer(900, 1000);
    expect(buffer).toBeCloseTo(-11.111, 1);
  });
});

describe("shouldAlert", () => {
  it("returns true when health factor < 1.1", () => {
    expect(shouldAlert(1.05)).toBe(true);
    expect(shouldAlert(1.0)).toBe(true);
    expect(shouldAlert(0.8)).toBe(true);
  });

  it("returns false when health factor >= 1.1", () => {
    expect(shouldAlert(1.5)).toBe(false);
    expect(shouldAlert(2.0)).toBe(false);
    expect(shouldAlert(1.1)).toBe(false);
  });
});