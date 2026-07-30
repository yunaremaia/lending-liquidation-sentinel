import { createAgentApp } from "@lucid-dreams/agent-kit";
import { z } from "zod";
import { paymentMiddleware } from "x402-hono";
import { checkLiquidationRisk } from "./lib/sentinel.js";

const { app, addEntrypoint } = createAgentApp({
  name: "lending-liquidation-sentinel",
  version: "0.1.0",
  description: "Watch borrow positions and warn before liquidation risk",
});

// Skip x402 payment middleware in test environment
if (process.env.NODE_ENV !== "test") {
  app.use("*", paymentMiddleware as any);
}

addEntrypoint({
  key: "check",
  description: "Check liquidation risk for a wallet on lending protocols",
  input: z.object({
    wallet: z.string().min(1),
    protocol_ids: z.array(z.string()).min(1),
    positions: z.array(z.string()).default([]),
  }),
  async handler({ input }) {
    const result = await checkLiquidationRisk({
      wallet: input.wallet,
      protocolIds: input.protocol_ids,
      positions: input.positions,
    });

    return { output: result, usage: { total_tokens: 0 } };
  },
});

export { app };