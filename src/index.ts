import { createAgentApp } from "@lucid-dreams/agent-kit";
import { z } from "zod";
import { checkLiquidationRisk } from "./lib/sentinel.js";

const { app, addEntrypoint }: { app: any; addEntrypoint: any } = createAgentApp({
  name: "lending-liquidation-sentinel",
  version: "1.0.0",
  description: "Watch borrow positions and warn before liquidation risk",
});

app.get("/health", (c: any) => c.json({ ok: true, version: "1.0.0" }));

addEntrypoint({
  key: "check",
  description: "Check liquidation risk for a wallet on lending protocols",
  price: process.env.DEFAULT_PRICE ?? "0.01",
  input: z.object({
    wallet: z.string().min(1),
    protocol_ids: z.array(z.string()).min(1),
    positions: z.array(z.string()).default([]),
  }),
  async handler({ input }: { input: any }) {
    const result = await checkLiquidationRisk({
      wallet: input.wallet,
      protocolIds: input.protocol_ids,
      positions: input.positions,
    });

    return { output: result, usage: { total_tokens: 0 } };
  },
});

export { app };
export default app;
