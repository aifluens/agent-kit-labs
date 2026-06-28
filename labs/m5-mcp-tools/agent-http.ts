import { Agent, tool, callConnectionHttp } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

// HAND-WIRED HTTP — no discovery. You write each tool yourself: its name,
// description, parameters, and a handler that makes the HTTP request. Same model
// surface as the MCP face (identical names/descriptions), but every request is
// spelled out. `callConnectionHttp` only hides the base URL + auth header.

const lookupOrder = tool({
  name: "lookup_order",
  description:
    'Look up a single order by its reference id (e.g. "ORD-1001"). Returns status, amount, and the customer it belongs to.',
  parameters: {
    type: "object",
    properties: {
      order_id: { type: "string", description: 'The order reference, e.g. "ORD-1001".' },
    },
    required: ["order_id"],
  },
  handler: async ({ order_id }: { order_id: string }) =>
    callConnectionHttp("helpdesk-http", { method: "GET", path: `/orders/${order_id}` }),
});

const listOrders = tool({
  name: "list_orders",
  description: "List all orders belonging to a customer's email address.",
  parameters: {
    type: "object",
    properties: {
      customer_email: { type: "string", description: "The customer's email address." },
    },
    required: ["customer_email"],
  },
  handler: async ({ customer_email }: { customer_email: string }) =>
    callConnectionHttp("helpdesk-http", {
      method: "GET",
      path: "/orders",
      query: { customer_email },
    }),
});

const issueRefund = tool({
  name: "issue_refund",
  description:
    "Issue a refund against an order. Omit amount to refund the full order total. Cannot refund a cancelled order.",
  parameters: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "The order reference to refund." },
      amount: {
        type: "number",
        description: "Refund amount in dollars. Defaults to the full order total.",
      },
    },
    required: ["order_id"],
  },
  handler: async ({ order_id, amount }: { order_id: string; amount?: number }) =>
    callConnectionHttp("helpdesk-http", {
      method: "POST",
      path: "/refunds",
      body: amount === undefined ? { order_id } : { order_id, amount },
    }),
});

const agent = new Agent({
  model: MODEL,
  systemPrompt:
    "You are a Help Desk agent. Use the connected tools to look up orders and issue refunds. Always confirm what you did with the order reference and the amount.",
  temperature: 0.2,
  tools: [lookupOrder, listOrders, issueRefund], // hand-wired, listed by hand
  maxIterations: 5,
});

const response = await agent.run(
  "Customer ada@example.com is unhappy with order ORD-1001. Look it up, then issue a full refund and confirm the new balance.",
);
console.log(response);
