# Lending Liquidation Sentinel

x402 agent that monitors Aave lending positions and alerts before liquidation risk by tracking health factor in real time.

## Bounty

Daydreams AI Agent Bounties — **#9 Lending Liquidation Sentinel** ($1,000)

## What it does

- Fetches user positions from Aave V3 (eMode category, liquidation threshold)
- Calculates health factor from collateral, debt, and live ETH prices (CoinGecko)
- Determines liquidation price threshold and safety buffer
- Returns alert flag when position approaches liquidation

## Deploy

- **URL**: https://lending-liquidation-sentinel.vercel.app
- **Endpoint**: `POST /entrypoints/check/invoke`
- **Input**: `{ "wallet": "0x...", "protocol_ids": ["aave"], "positions": [] }`
- **x402**: Active — returns 402 without payment

## Tests

```bash
npm run test    # vitest: 22/22 passing
npm run build   # tsc: clean
```

## Tech Stack

- TypeScript + Hono + @lucid-dreams/agent-kit
- x402 payment middleware
- Aave V3 API + CoinGecko price feed
- vitest
