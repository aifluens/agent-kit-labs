import { Agent, tool } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

const lookupAccount = tool({
  name: "lookup_account",
  description: "Look up a customer's plan and price by email.",
  parameters: {
    type: "object",
    properties: {
      email: { type: "string", description: "Customer email address." },
    },
    required: ["email"],
  },
  handler: async ({ email }: { email: string }) => {
    return { email, plan: "Pro", price: 49 };
  },
});

const billing = new Agent({
  model: MODEL,
  systemPrompt: "You handle billing questions: charges, refunds, plans, and invoices.",
  temperature: 0.3,
  tools: [lookupAccount],
});

const technical = new Agent({
  model: MODEL,
  systemPrompt: "You handle technical issues: errors, integrations, and setup questions.",
  temperature: 0.3,
});

const router = new Agent({
  model: MODEL,
  systemPrompt: "Classify the user's question and delegate to the right specialist.",
  temperature: 0.2,
  subAgents: {
    billing: billing,
    technical: technical,
  },
  maxDepth: 2,
});

const response = await router.run("I was double charged for my Pro plan this month.");
console.log(response);
