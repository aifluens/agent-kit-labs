import { Agent, MCPClient } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

// MCP DISCOVERY — one call returns every tool the Help Desk server offers
// (lookup_order, list_orders, issue_refund, create_ticket, list_tickets),
// already shaped for the model. No hand-written tool definitions.
const tools = await MCPClient.connect("helpdesk-sandbox");

const agent = new Agent({
  model: MODEL,
  systemPrompt:
    "You are a Help Desk agent. Use the connected tools to look up orders and issue refunds. Always confirm what you did with the order reference and the amount.",
  temperature: 0.2,
  tools, // the discovered tools, spread straight in
  maxIterations: 5,
});

const response = await agent.run(
  "Customer ada@example.com is unhappy with order ORD-1001. Look it up, then issue a full refund and confirm the new balance.",
);
console.log(response);
