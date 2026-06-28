import { Agent, tool } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

const lookupAccount = tool({  // ①
  name: "lookup_account",
  description: "Look up a customer's plan and price by email.",  // ②
  parameters: {
    type: "object",
    properties: {
      email: { type: "string", description: "Customer email address." },
    },
    required: ["email"],
  },
  handler: async ({ email }: { email: string }) => {
    return email.toLowerCase() === "alice@acme.com" ? { email, plan: "Pro", price: 49 } : { email, plan: "Free", price: 0 };  // ③
  },
});

const agent = new Agent({  // ④
  model: MODEL,
  systemPrompt: "You are a friendly billing support agent.",
  temperature: 0.4,
  tools: [lookupAccount],  // ⑤
  maxIterations: 3,
});

const response = await agent.run("What plan is alice@acme.com on?");  // ⑥
console.log(response);
